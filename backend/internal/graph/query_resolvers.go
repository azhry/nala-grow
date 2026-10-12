package graph

import (
	"context"
	"fmt"
	"time"
)

func (h *Handler) resolveHealthResult(context.Context, map[string]interface{}) ExecResult {
	return ExecResult{Data: map[string]interface{}{"health": NewHealth()}}
}

func (h *Handler) resolveMeResult(ctx context.Context, _ map[string]interface{}) ExecResult {
	userID, principal, authResult := authenticatedPrincipal(ctx, h)
	if authResult.Errors != nil {
		return authResult
	}
	u, err := loadUserByID(ctx, h.db, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "user not found"}}}
	}
	createdAt := u.CreatedAt
	if createdAt == "" {
		createdAt = time.Now().UTC().Format(time.RFC3339)
	}
	u.CreatedAt = createdAt
	return ExecResult{Data: map[string]interface{}{"me": authUserMap(userID, u, principal)}}
}

func (h *Handler) resolveBabiesResult(ctx context.Context, _ map[string]interface{}) ExecResult {
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	profiles, err := loadBabies(ctx, h.db, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load babies"}}}
	}
	list := make([]map[string]interface{}, 0, len(profiles))
	for _, baby := range profiles {
		list = append(list, babyToMap(baby))
	}
	return ExecResult{Data: map[string]interface{}{"babies": list}}
}

func (h *Handler) resolveBabyResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	id := getVar(variables, "id")
	if id == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "id required"}}}
	}
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	baby, err := loadBaby(ctx, h.db, id, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	return ExecResult{Data: map[string]interface{}{"baby": babyToMap(baby)}}
}

func (h *Handler) resolveMeasurementsResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	records, err := loadMeasurements(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load measurements"}}}
	}
	list := make([]map[string]interface{}, 0, len(records))
	for _, record := range records {
		list = append(list, measurementToMap(record))
	}
	return ExecResult{Data: map[string]interface{}{"measurements": list}}
}

func (h *Handler) resolveMeasurementResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	return ExecResult{Data: map[string]interface{}{"measurement": measurementToMap(measurement)}}
}

func (h *Handler) resolveFeedingSessionsResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	sessions, err := loadFeedingSessions(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load feeding sessions"}}}
	}
	list := make([]map[string]interface{}, 0, len(sessions))
	for _, session := range sessions {
		list = append(list, feedingSessionToMap(session))
	}
	return ExecResult{Data: map[string]interface{}{"feedingSessions": list}}
}

func (h *Handler) resolveFeedingSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	return ExecResult{Data: map[string]interface{}{"feedingSession": feedingSessionToMap(session)}}
}

func (h *Handler) resolveSleepSessionsResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	sessions, err := loadSleepSessions(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load sleep sessions"}}}
	}
	list := make([]map[string]interface{}, 0, len(sessions))
	for _, session := range sessions {
		list = append(list, sleepSessionToMap(session))
	}
	return ExecResult{Data: map[string]interface{}{"sleepSessions": list}}
}

func (h *Handler) resolveSleepSessionResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	return ExecResult{Data: map[string]interface{}{"sleepSession": sleepSessionToMap(session)}}
}

func (h *Handler) resolveMilestonesResult(ctx context.Context, variables map[string]interface{}) ExecResult {
	babyID := getVar(variables, "babyId")
	if babyID == "" {
		return ExecResult{Errors: []GraphQLError{{Message: "babyId required"}}}
	}
	userID, errResult := authenticatedUser(ctx, h)
	if errResult.Errors != nil {
		return errResult
	}
	if _, err := loadBaby(ctx, h.db, babyID, userID); err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "baby not found"}}}
	}
	records, err := loadMilestones(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not load milestones"}}}
	}
	list := make([]map[string]interface{}, 0, len(records))
	for _, record := range records {
		list = append(list, milestoneToMap(record))
	}
	return ExecResult{Data: map[string]interface{}{"milestones": list}}
}

func (h *Handler) resolveMilestoneResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	return ExecResult{Data: map[string]interface{}{"milestone": milestoneToMap(milestone)}}
}

func (h *Handler) resolveExportDataResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	dateFrom := getVar(variables, "dateFrom")
	dateTo := getVar(variables, "dateTo")
	feeds, err := loadFeedingSessions(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	feedList := make([]map[string]interface{}, 0, len(feeds))
	for _, session := range feeds {
		if inDateRange(session.StartedAt, dateFrom, dateTo) {
			feedList = append(feedList, feedingSessionToMap(session))
		}
	}
	sleeps, err := loadSleepSessions(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	sleepList := make([]map[string]interface{}, 0, len(sleeps))
	for _, session := range sleeps {
		if inDateRange(session.StartedAt, dateFrom, dateTo) {
			sleepList = append(sleepList, sleepSessionToMap(session))
		}
	}
	measurements, err := loadMeasurements(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	measurementList := make([]map[string]interface{}, 0, len(measurements))
	for _, measurement := range measurements {
		if inDateRange(measurement.Date, dateFrom, dateTo) {
			measurementList = append(measurementList, measurementToMap(measurement))
		}
	}
	milestones, err := loadMilestones(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	milestoneList := make([]map[string]interface{}, 0, len(milestones))
	for _, milestone := range milestones {
		if inDateRange(milestone.AchievedAt, dateFrom, dateTo) {
			milestoneList = append(milestoneList, milestoneToMap(milestone))
		}
	}
	return ExecResult{Data: map[string]interface{}{"exportData": map[string]interface{}{
		"babyName": baby.Name, "babyDob": baby.DOB, "babySex": baby.Sex,
		"feedSessions": feedList, "sleepSessions": sleepList,
		"measurements": measurementList, "milestones": milestoneList,
		"dateFrom": dateFrom, "dateTo": dateTo,
	}}}
}

func (h *Handler) resolveExportCSVResult(ctx context.Context, variables map[string]interface{}) ExecResult {
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
	dateFrom := getVar(variables, "dateFrom")
	dateTo := getVar(variables, "dateTo")
	csv := "Baby Growth Report\n"
	csv += "Name," + csvEscape(baby.Name) + "\n"
	csv += "DOB," + csvEscape(baby.DOB) + "\n"
	csv += "Sex," + csvEscape(baby.Sex) + "\n\n"

	feeds, err := loadFeedingSessions(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	csv += "Feeding Sessions\nFeed Type,Started,Ended,Left (sec),Right (sec),Amount (ml),Milk Type,Food,Reaction,Notes\n"
	feedCount := 0
	for _, session := range feeds {
		if !inDateRange(session.StartedAt, dateFrom, dateTo) {
			continue
		}
		csv += csvEscape(session.FeedType) + "," + csvEscape(session.StartedAt) + "," + csvEscape(session.EndedAt) + ","
		csv += fmt.Sprintf("%d,%d,%.1f,", session.LeftDurationSec, session.RightDurationSec, session.AmountML)
		csv += csvEscape(session.MilkType) + "," + csvEscape(session.FoodName) + "," + csvEscape(session.Reaction) + "," + csvEscape(session.Notes) + "\n"
		feedCount++
	}
	if feedCount == 0 {
		csv += "No records found\n"
	}
	csv += "\nSleep Sessions\nSleep Location,Started,Ended,Notes\n"
	sleeps, err := loadSleepSessions(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	sleepCount := 0
	for _, session := range sleeps {
		if !inDateRange(session.StartedAt, dateFrom, dateTo) {
			continue
		}
		csv += csvEscape(session.Location) + "," + csvEscape(session.StartedAt) + "," + csvEscape(session.EndedAt) + "," + csvEscape(session.Notes) + "\n"
		sleepCount++
	}
	if sleepCount == 0 {
		csv += "No records found\n"
	}
	csv += "\nGrowth Measurements\nDate,Weight (kg),Height (cm),Head Circumference (cm)\n"
	measurements, err := loadMeasurements(ctx, h.db, babyID, userID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	measurementCount := 0
	for _, measurement := range measurements {
		if !inDateRange(measurement.Date, dateFrom, dateTo) {
			continue
		}
		csv += csvEscape(measurement.Date) + "," + fmt.Sprintf("%.2f,%.2f,%.2f\n", measurement.Weight, measurement.Height, measurement.HeadCircumference)
		measurementCount++
	}
	if measurementCount == 0 {
		csv += "No records found\n"
	}
	csv += "\nMilestones\nTitle,Category,Achieved At,Notes\n"
	milestones, err := loadMilestones(ctx, h.db, babyID)
	if err != nil {
		return ExecResult{Errors: []GraphQLError{{Message: "could not export data"}}}
	}
	milestoneCount := 0
	for _, milestone := range milestones {
		if !inDateRange(milestone.AchievedAt, dateFrom, dateTo) {
			continue
		}
		csv += csvEscape(milestone.Title) + "," + csvEscape(milestone.Category) + "," + csvEscape(milestone.AchievedAt) + "," + csvEscape(milestone.Note) + "\n"
		milestoneCount++
	}
	if milestoneCount == 0 {
		csv += "No records found\n"
	}
	return ExecResult{Data: map[string]interface{}{"exportCSV": csv}}
}
