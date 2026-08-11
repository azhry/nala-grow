package graph

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (h *Handler) resolveSignupResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	email := getVar(variables, "email")
	password := getVar(variables, "password")
	displayName := getVar(variables, "displayName")
	if email == "" || password == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "email and password required"}}}
	}
	if displayName == "" {
		displayName = email[:strings.Index(email, "@")]
	}
	if h.auth == nil {
		return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
	}
	hash, err := h.auth.Password.Hash(password)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to hash password"}}}
	}
	userID, existing, err := loadUserByEmail(ctx, h.db, email)
	if err != nil && err != pgx.ErrNoRows {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load user"}}}
	}
	if err == pgx.ErrNoRows {
		userID = uuid()
		if _, err := h.db.Exec(ctx, "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)", userID, email, hash, displayName); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not create user"}}}
		}
		existing = storedUser{Email: email, PasswordHash: hash, DisplayName: displayName}
	} else if _, err := h.db.Exec(ctx, "UPDATE users SET password_hash = $2 WHERE id = $1", userID, hash); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update user"}}}
	}
	token, err := h.auth.JWT.GenerateToken(userID, email)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
	}
	return authResult("signup", token, userID, existing)
}

func (h *Handler) resolveLoginWithGoogleResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	idToken := getVar(variables, "idToken")
	if idToken == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "idToken required"}}}
	}
	if h.auth == nil {
		return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
	}
	googleUser, err := h.googleVerifier.VerifyIDToken(idToken, h.googleClientID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "invalid Google token: " + err.Error()}}}
	}
	foundID, found, err := loadUserByEmail(ctx, h.db, googleUser.Email)
	if err != nil && err != pgx.ErrNoRows {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load user"}}}
	}
	if err == pgx.ErrNoRows {
		foundID = uuid()
		displayName := googleUser.Name
		if displayName == "" {
			displayName = googleUser.Email[:strings.Index(googleUser.Email, "@")]
		}
		placeholderHash, _ := h.auth.Password.Hash(uuid() + uuid())
		found = storedUser{Email: googleUser.Email, PasswordHash: placeholderHash, DisplayName: displayName}
		if _, err := h.db.Exec(ctx, "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)", foundID, found.Email, found.PasswordHash, found.DisplayName); err != nil {
			return ExecResult{Errors: []GraphQLError{{Message: "could not create user"}}}
		}
	}
	token, err := h.auth.JWT.GenerateToken(foundID, found.Email)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
	}
	return authResult("loginWithGoogle", token, foundID, found)
}

func (h *Handler) resolveLoginResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	email := getVar(variables, "email")
	password := getVar(variables, "password")
	if email == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "email required"}}}
	}
	foundID, found, err := loadUserByEmail(ctx, h.db, email)
	if err != nil || h.auth == nil || !h.auth.Password.Verify(password, found.PasswordHash) {
		if h.auth == nil {
			return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
		}
		return ExecResult{Errors: []GraphQLError{{Message: "invalid email or password"}}}
	}
	token, err := h.auth.JWT.GenerateToken(foundID, found.Email)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to generate token"}}}
	}
	return authResult("login", token, foundID, found)
}

func (h *Handler) resolveRequestPasswordResetResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	email := getVar(variables, "email")
	if email == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "email required"}}}
	}
	_, _, lookupErr := loadUserByEmail(ctx, h.db, email)
	if lookupErr != nil {
		return ExecResult{Data: map[string]interface{}{"requestPasswordReset": true}}
	}
	token, err := h.resetTokens.GenerateToken(email)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to generate reset token"}}}
	}
	return ExecResult{Data: map[string]interface{}{"requestPasswordReset": token}}
}

func (h *Handler) resolveResetPasswordResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	token := getVar(variables, "token")
	newPassword := getVar(variables, "newPassword")
	if token == "" || newPassword == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "token and newPassword required"}}}
	}
	email, err := h.resetTokens.ValidateToken(token)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "invalid or expired reset token"}}}
	}
	foundID, _, err := loadUserByEmail(ctx, h.db, email)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "user not found"}}}
	}
	if h.auth == nil {
		return ExecResult{Errors: []GraphQLError{{Message: "auth service unavailable"}}}
	}
	hash, err := h.auth.Password.Hash(newPassword)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "failed to hash password"}}}
	}
	if _, err := h.db.Exec(ctx, "UPDATE users SET password_hash = $2 WHERE id = $1", foundID, hash); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update password"}}}
	}
	h.resetTokens.InvalidateToken(token)
	return ExecResult{Data: map[string]interface{}{"resetPassword": true}}
}

func (h *Handler) resolveCreateBabyResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	name := getVar(variables, "name")
	if name == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "name required"}}}
	}
	baby := BabyProfile{ID: uuid(), Name: name, DOB: getVar(variables, "dob"), Sex: getVar(variables, "sex"), PhotoURL: getVar(variables, "photoUrl"), CreatedAt: time.Now().UTC().Format(time.RFC3339), UserID: userID}
	if _, err := h.db.Exec(ctx, "INSERT INTO babies (id, user_id, name, dob, sex, photo_url) VALUES ($1, $2, $3, $4::date, $5, $6)", baby.ID, baby.UserID, baby.Name, baby.DOB, baby.Sex, baby.PhotoURL); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not create baby"}}}
	}
	return ExecResult{Data: map[string]interface{}{"createBaby": babyToMap(baby)}}
}

func (h *Handler) resolveUpdateBabyResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	baby, err := loadBaby(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	if value := getVar(variables, "name"); value != "" {
		baby.Name = value
	}
	if value := getVar(variables, "dob"); value != "" {
		baby.DOB = value
	}
	if value := getVar(variables, "sex"); value != "" {
		baby.Sex = value
	}
	if value := getVar(variables, "photoUrl"); value != "" {
		baby.PhotoURL = value
	}
	if _, err := h.db.Exec(ctx, `UPDATE babies SET name = $2, dob = $3::date, sex = $4, photo_url = $5 WHERE id = $1 AND user_id = $6`, id, baby.Name, baby.DOB, baby.Sex, baby.PhotoURL, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update baby"}}}
	}
	return ExecResult{Data: map[string]interface{}{"updateBaby": babyToMap(baby)}}
}

func (h *Handler) resolveDeleteBabyResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	baby, err := loadBaby(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	if _, err := h.db.Exec(ctx, "DELETE FROM babies WHERE id = $1 AND user_id = $2", id, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not delete baby"}}}
	}
	return ExecResult{Data: map[string]interface{}{"deleteBaby": babyToMap(baby)}}
}

func (h *Handler) resolveCreateMilestoneResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	title := getVar(variables, "title")
	if title == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "title required"}}}
	}
	category := getVar(variables, "category")
	if category == "" {
		category = "general"
	}
	milestone := Milestone{ID: uuid(), BabyID: babyID, Title: title, Description: getVar(variables, "description"), Category: category, AchievedAt: getVar(variables, "achievedAt"), Note: getVar(variables, "note"), PhotoURL: getVar(variables, "photoUrl"), IsCustom: getVarBool(variables, "isCustom"), CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	if _, err := h.db.Exec(ctx, `INSERT INTO milestones (id, baby_id, title, description, category, achieved_at, note, photo_url, is_custom, created_at)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::timestamptz, $7, $8, $9, $10::timestamptz)`, milestone.ID, milestone.BabyID, milestone.Title, milestone.Description, milestone.Category, milestone.AchievedAt, milestone.Note, milestone.PhotoURL, milestone.IsCustom, milestone.CreatedAt); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not save milestone"}}}
	}
	return ExecResult{Data: map[string]interface{}{"createMilestone": milestoneToMap(milestone)}}
}

func (h *Handler) resolveUpdateMilestoneResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	milestone, err := loadMilestone(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
	}
	if value := getVar(variables, "title"); value != "" {
		milestone.Title = value
	}
	if value := getVar(variables, "description"); value != "" {
		milestone.Description = value
	}
	if value := getVar(variables, "category"); value != "" {
		milestone.Category = value
	}
	if value := getVar(variables, "achievedAt"); value != "" {
		milestone.AchievedAt = value
	}
	if value := getVar(variables, "note"); value != "" {
		milestone.Note = value
	}
	if value := getVar(variables, "photoUrl"); value != "" {
		milestone.PhotoURL = value
	}
	if value := getVarBool(variables, "isCustom"); value {
		milestone.IsCustom = value
	}
	if _, err := h.db.Exec(ctx, `UPDATE milestones SET title=$2, description=$3, category=$4, achieved_at=NULLIF($5, '')::timestamptz, note=$6, photo_url=$7, is_custom=$8 WHERE id=$1`, milestone.ID, milestone.Title, milestone.Description, milestone.Category, milestone.AchievedAt, milestone.Note, milestone.PhotoURL, milestone.IsCustom); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update milestone"}}}
	}
	return ExecResult{Data: map[string]interface{}{"updateMilestone": milestoneToMap(milestone)}}
}

func (h *Handler) resolveDeleteMilestoneResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	milestone, err := loadMilestone(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "milestone not found"}}}
	}
	if _, err := h.db.Exec(ctx, "DELETE FROM milestones WHERE id = $1", id); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not delete milestone"}}}
	}
	return ExecResult{Data: map[string]interface{}{"deleteMilestone": milestoneToMap(milestone)}}
}

func (h *Handler) resolveCreateSleepSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	location := getVar(variables, "location")
	if location == "" {
		location = "crib"
	}
	session := SleepSession{ID: uuid(), BabyID: babyID, StartedAt: getVar(variables, "startedAt"), EndedAt: getVar(variables, "endedAt"), Location: location, Notes: getVar(variables, "notes"), CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	if _, err := h.db.Exec(ctx, `INSERT INTO sleep_sessions (id, baby_id, started_at, ended_at, location, notes, created_at)
		VALUES ($1, $2, $3::timestamptz, NULLIF($4, '')::timestamptz, $5, $6, $7::timestamptz)`, session.ID, session.BabyID, session.StartedAt, session.EndedAt, session.Location, session.Notes, session.CreatedAt); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not save sleep session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"createSleepSession": sleepSessionToMap(session)}}
}

func (h *Handler) resolveUpdateSleepSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	session, err := loadSleepSession(ctx, h.db, id)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
	}
	if _, err := loadBaby(ctx, h.db, session.BabyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
	}
	if value := getVar(variables, "startedAt"); value != "" {
		session.StartedAt = value
	}
	if value := getVar(variables, "endedAt"); value != "" {
		session.EndedAt = value
	}
	if value := getVar(variables, "location"); value != "" {
		session.Location = value
	}
	if value := getVar(variables, "notes"); value != "" {
		session.Notes = value
	}
	if _, err := h.db.Exec(ctx, `UPDATE sleep_sessions SET started_at = $2::timestamptz, ended_at = NULLIF($3, '')::timestamptz, location = $4, notes = $5 WHERE id = $1`, id, session.StartedAt, session.EndedAt, session.Location, session.Notes); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update sleep session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"updateSleepSession": sleepSessionToMap(session)}}
}

func (h *Handler) resolveDeleteSleepSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	session, err := loadSleepSession(ctx, h.db, id)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
	}
	if _, err := loadBaby(ctx, h.db, session.BabyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "sleep session not found"}}}
	}
	if _, err := h.db.Exec(ctx, "DELETE FROM sleep_sessions WHERE id = $1", id); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not delete sleep session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"deleteSleepSession": sleepSessionToMap(session)}}
}

func (h *Handler) resolveCreateFeedingSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	feedType := getVar(variables, "feedType")
	if feedType == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "feedType required"}}}
	}
	session := FeedingSession{ID: uuid(), BabyID: babyID, FeedType: feedType, StartedAt: feedingStartedAt(variables), EndedAt: getVar(variables, "endedAt"), LeftDurationSec: getVarInt(variables, "leftDurationSec"), RightDurationSec: getVarInt(variables, "rightDurationSec"), AmountML: getVarFloat(variables, "amountMl"), MilkType: getVar(variables, "milkType"), FoodName: getVar(variables, "foodName"), Reaction: getVar(variables, "reaction"), Temperature: feedingString(variables, "temperature"), Quantity: feedingQuantity(variables), QuantityUnit: feedingString(variables, "quantityUnit"), Notes: getVar(variables, "notes"), CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	if err := insertFeedingSession(ctx, h.db, session); err != nil {
		slog.Error("could not save feeding session", "error", err)
		return ExecResult{Errors: []GraphQLError{{Message: "could not save feeding session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"createFeedingSession": feedingSessionToMap(session)}}
}

func (h *Handler) resolveUpdateFeedingSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	session, err := loadFeedingSession(ctx, h.db, id)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
	}
	if _, err := loadBaby(ctx, h.db, session.BabyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
	}
	applyFeedingSessionUpdates(&session, variables)
	if err := updateFeedingSession(ctx, h.db, session); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update feeding session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"updateFeedingSession": feedingSessionToMap(session)}}
}

func (h *Handler) resolveDeleteFeedingSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	session, err := loadFeedingSession(ctx, h.db, id)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
	}
	if _, err := loadBaby(ctx, h.db, session.BabyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "feeding session not found"}}}
	}
	if _, err := h.db.Exec(ctx, "DELETE FROM feeding_sessions WHERE id = $1", id); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not delete feeding session"}}}
	}
	return ExecResult{Data: map[string]interface{}{"deleteFeedingSession": feedingSessionToMap(session)}}
}

func (h *Handler) resolveCreateMeasurementResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	baby, err := loadBaby(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	measurement := Measurement{ID: uuid(), BabyID: babyID, Date: getVar(variables, "date"), Weight: getVarFloat(variables, "weight"), Height: getVarFloat(variables, "height"), HeadCircumference: getVarFloat(variables, "headCircumference"), CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	if err := saveMeasurement(ctx, h.db, measurement); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not save measurement"}}}
	}
	result := measurementToMap(measurement)
	ageMonths := AgeInMonths(baby.DOB, measurement.Date)
	if measurement.Weight > 0 {
		L, M, S := whoLMS(baby.Sex, ageMonths, "weight")
		if M > 0 && S > 0 {
			result["weightPercentile"] = ZToPercentile(CalculateZScore(measurement.Weight, L, M, S))
		}
	}
	if measurement.Height > 0 {
		L, M, S := whoLMS(baby.Sex, ageMonths, "height")
		if M > 0 && S > 0 {
			result["heightPercentile"] = ZToPercentile(CalculateZScore(measurement.Height, L, M, S))
		}
	}
	if measurement.HeadCircumference > 0 {
		L, M, S := whoLMS(baby.Sex, ageMonths, "headCircumference")
		if M > 0 && S > 0 {
			result["headCircumferencePercentile"] = ZToPercentile(CalculateZScore(measurement.HeadCircumference, L, M, S))
		}
	}
	return ExecResult{Data: map[string]interface{}{"createMeasurement": result}}
}

func (h *Handler) resolveUpdateMeasurementResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	measurement, err := loadMeasurement(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
	}
	if value := getVar(variables, "date"); value != "" {
		measurement.Date = value
	}
	if value := getVarFloat(variables, "weight"); value != 0 {
		measurement.Weight = value
	}
	if value := getVarFloat(variables, "height"); value != 0 {
		measurement.Height = value
	}
	if value := getVarFloat(variables, "headCircumference"); value != 0 {
		measurement.HeadCircumference = value
	}
	if err := saveMeasurement(ctx, h.db, measurement); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not update measurement"}}}
	}
	return ExecResult{Data: map[string]interface{}{"updateMeasurement": measurementToMap(measurement)}}
}

func (h *Handler) resolveDeleteMeasurementResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	measurement, err := loadMeasurement(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "measurement not found"}}}
	}
	if _, err := h.db.Exec(ctx, "DELETE FROM measurements WHERE group_id = $1", id); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not delete measurement"}}}
	}
	return ExecResult{Data: map[string]interface{}{"deleteMeasurement": measurementToMap(measurement)}}
}
