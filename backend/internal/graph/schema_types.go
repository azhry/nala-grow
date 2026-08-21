package graph

import "github.com/graphql-go/graphql"

type graphTypes struct {
	health         *graphql.Object
	user           *graphql.Object
	authResponse   *graphql.Object
	baby           *graphql.Object
	measurement    *graphql.Object
	feedingSession *graphql.Object
	sleepSession   *graphql.Object
	milestone      *graphql.Object
	exportData     *graphql.Object
}

func newGraphTypes() graphTypes {
	stringField := func() *graphql.Field { return &graphql.Field{Type: graphql.String} }
	booleanField := func() *graphql.Field { return &graphql.Field{Type: graphql.Boolean} }

	health := graphql.NewObject(graphql.ObjectConfig{
		Name: "Health",
		Fields: graphql.Fields{
			"ok":        booleanField(),
			"timestamp": stringField(),
			"version":   stringField(),
		},
	})

	user := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"id":             stringField(),
			"email":          stringField(),
			"displayName":    stringField(),
			"photoUrl":       stringField(),
			"createdAt":      stringField(),
			"subject":        stringField(),
			"organization":   stringField(),
			"casdoorSubject": stringField(),
			"casdoorOwner":   stringField(),
			"roles":          &graphql.Field{Type: graphql.NewList(graphql.String)},
			"permissions":    &graphql.Field{Type: graphql.NewList(graphql.String)},
			"authProvider":   stringField(),
		},
	})

	authResponse := graphql.NewObject(graphql.ObjectConfig{
		Name: "AuthResponse",
		Fields: graphql.Fields{
			"token":        stringField(),
			"refreshToken": stringField(),
			"expiresIn":    &graphql.Field{Type: graphql.Int},
			"user":         &graphql.Field{Type: user},
		},
	})

	baby := graphql.NewObject(graphql.ObjectConfig{
		Name: "BabyProfile",
		Fields: graphql.Fields{
			"id":        stringField(),
			"name":      stringField(),
			"dob":       stringField(),
			"sex":       stringField(),
			"photoUrl":  stringField(),
			"createdAt": stringField(),
			"userId":    stringField(),
		},
	})

	measurement := graphql.NewObject(graphql.ObjectConfig{
		Name: "Measurement",
		Fields: graphql.Fields{
			"id":                          stringField(),
			"babyId":                      stringField(),
			"date":                        stringField(),
			"weight":                      &graphql.Field{Type: graphql.Float},
			"height":                      &graphql.Field{Type: graphql.Float},
			"headCircumference":           &graphql.Field{Type: graphql.Float},
			"weightPercentile":            &graphql.Field{Type: graphql.Float},
			"heightPercentile":            &graphql.Field{Type: graphql.Float},
			"headCircumferencePercentile": &graphql.Field{Type: graphql.Float},
			"createdAt":                   stringField(),
		},
	})

	feedingSession := graphql.NewObject(graphql.ObjectConfig{
		Name: "FeedingSession",
		Fields: graphql.Fields{
			"id":               stringField(),
			"babyId":           stringField(),
			"feedType":         stringField(),
			"startedAt":        stringField(),
			"endedAt":          stringField(),
			"leftDurationSec":  &graphql.Field{Type: graphql.Int},
			"rightDurationSec": &graphql.Field{Type: graphql.Int},
			"amountMl":         &graphql.Field{Type: graphql.Float},
			"milkType":         stringField(),
			"foodName":         stringField(),
			"reaction":         stringField(),
			"temperature":      stringField(),
			"quantity":         &graphql.Field{Type: graphql.Float},
			"quantityUnit":     stringField(),
			"notes":            stringField(),
			"createdAt":        stringField(),
		},
	})

	sleepSession := graphql.NewObject(graphql.ObjectConfig{
		Name: "SleepSession",
		Fields: graphql.Fields{
			"id":        stringField(),
			"babyId":    stringField(),
			"startedAt": stringField(),
			"endedAt":   stringField(),
			"location":  stringField(),
			"notes":     stringField(),
			"createdAt": stringField(),
		},
	})

	milestone := graphql.NewObject(graphql.ObjectConfig{
		Name: "Milestone",
		Fields: graphql.Fields{
			"id":          stringField(),
			"babyId":      stringField(),
			"title":       stringField(),
			"description": stringField(),
			"category":    stringField(),
			"achievedAt":  stringField(),
			"note":        stringField(),
			"photoUrl":    stringField(),
			"isCustom":    booleanField(),
			"createdAt":   stringField(),
		},
	})

	exportData := graphql.NewObject(graphql.ObjectConfig{
		Name: "ExportData",
		Fields: graphql.Fields{
			"babyName":      stringField(),
			"babyDob":       stringField(),
			"babySex":       stringField(),
			"feedSessions":  &graphql.Field{Type: graphql.NewList(feedingSession)},
			"sleepSessions": &graphql.Field{Type: graphql.NewList(sleepSession)},
			"measurements":  &graphql.Field{Type: graphql.NewList(measurement)},
			"milestones":    &graphql.Field{Type: graphql.NewList(milestone)},
			"dateFrom":      stringField(),
			"dateTo":        stringField(),
		},
	})

	return graphTypes{
		health:         health,
		user:           user,
		authResponse:   authResponse,
		baby:           baby,
		measurement:    measurement,
		feedingSession: feedingSession,
		sleepSession:   sleepSession,
		milestone:      milestone,
		exportData:     exportData,
	}
}
