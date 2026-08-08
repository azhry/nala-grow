package graph

import (
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"

	"github.com/graphql-go/graphql"
)

// newSchema builds the public GraphQL contract. Root fields own their resolver
// wiring; Handler.Execute only delegates parsing, validation, and execution to
// graphql-go.
func newSchema(h *Handler) (graphql.Schema, error) {
	stringField := func() *graphql.Field {
		return &graphql.Field{Type: graphql.String}
	}
	booleanField := func() *graphql.Field {
		return &graphql.Field{Type: graphql.Boolean}
	}

	healthType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Health",
		Fields: graphql.Fields{
			"ok":        booleanField(),
			"timestamp": stringField(),
			"version":   stringField(),
		},
	})

	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"id":          stringField(),
			"email":       stringField(),
			"displayName": stringField(),
			"photoUrl":    stringField(),
			"createdAt":   stringField(),
		},
	})

	authResponseType := graphql.NewObject(graphql.ObjectConfig{
		Name: "AuthResponse",
		Fields: graphql.Fields{
			"token": stringField(),
			"user":  &graphql.Field{Type: userType},
		},
	})

	babyType := graphql.NewObject(graphql.ObjectConfig{
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

	measurementType := graphql.NewObject(graphql.ObjectConfig{
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

	feedingSessionType := graphql.NewObject(graphql.ObjectConfig{
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

	sleepSessionType := graphql.NewObject(graphql.ObjectConfig{
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

	milestoneType := graphql.NewObject(graphql.ObjectConfig{
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

	exportDataType := graphql.NewObject(graphql.ObjectConfig{
		Name: "ExportData",
		Fields: graphql.Fields{
			"babyName":      stringField(),
			"babyDob":       stringField(),
			"babySex":       stringField(),
			"feedSessions":  &graphql.Field{Type: graphql.NewList(feedingSessionType)},
			"sleepSessions": &graphql.Field{Type: graphql.NewList(sleepSessionType)},
			"measurements":  &graphql.Field{Type: graphql.NewList(measurementType)},
			"milestones":    &graphql.Field{Type: graphql.NewList(milestoneType)},
			"dateFrom":      stringField(),
			"dateTo":        stringField(),
		},
	})

	demoDataType := graphql.NewObject(graphql.ObjectConfig{
		Name: "DemoData",
		Fields: graphql.Fields{
			"baby":            &graphql.Field{Type: babyType},
			"feedingSessions": &graphql.Field{Type: graphql.NewList(feedingSessionType)},
			"sleepSessions":   &graphql.Field{Type: graphql.NewList(sleepSessionType)},
			"measurements":    &graphql.Field{Type: graphql.NewList(measurementType)},
			"milestones":      &graphql.Field{Type: graphql.NewList(milestoneType)},
		},
	})

	query := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"health": {
				Type:    graphql.NewNonNull(healthType),
				Resolve: h.queryResolver("health"),
			},
			"me": {
				Type:    userType,
				Resolve: h.queryResolver("me"),
			},
			"babies": {
				Type:    graphql.NewList(babyType),
				Resolve: h.queryResolver("babies"),
			},
			"baby": {
				Type: babyType,
				Args: graphql.FieldConfigArgument{
					"id": requiredIDArg(),
				},
				Resolve: h.queryResolver("baby"),
			},
			"measurements":    collectionField(measurementType, h.queryResolver("measurements"), requiredBabyIDArg()),
			"measurement":     singleField(measurementType, h.queryResolver("measurement"), graphql.FieldConfigArgument{"id": requiredIDArg()}),
			"feedingSessions": collectionField(feedingSessionType, h.queryResolver("feedingSessions"), requiredBabyIDArg()),
			"feedingSession":  singleField(feedingSessionType, h.queryResolver("feedingSession"), graphql.FieldConfigArgument{"id": requiredIDArg()}),
			"sleepSessions":   collectionField(sleepSessionType, h.queryResolver("sleepSessions"), requiredBabyIDArg()),
			"sleepSession":    singleField(sleepSessionType, h.queryResolver("sleepSession"), graphql.FieldConfigArgument{"id": requiredIDArg()}),
			"milestones":      collectionField(milestoneType, h.queryResolver("milestones"), requiredBabyIDArg()),
			"milestone":       singleField(milestoneType, h.queryResolver("milestone"), graphql.FieldConfigArgument{"id": requiredIDArg()}),
			"exportData": {
				Type:    exportDataType,
				Args:    exportArgs(true),
				Resolve: h.queryResolver("exportData"),
			},
			"exportCSV": {
				Type:    graphql.String,
				Args:    exportArgs(true),
				Resolve: h.queryResolver("exportCSV"),
			},
			"demoData": {
				Type:    graphql.NewNonNull(demoDataType),
				Resolve: h.queryResolver("demoData"),
			},
		},
	})

	mutation := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"signup": {
				Type: authResponseType,
				Args: graphql.FieldConfigArgument{
					"email":       requiredStringArg(),
					"password":    requiredStringArg(),
					"displayName": optionalStringArg(),
				},
				Resolve: h.mutationResolver("signup"),
			},
			"login": {
				Type: authResponseType,
				Args: graphql.FieldConfigArgument{
					"email":    requiredStringArg(),
					"password": requiredStringArg(),
				},
				Resolve: h.mutationResolver("login"),
			},
			"loginWithGoogle": {
				Type: authResponseType,
				Args: graphql.FieldConfigArgument{
					"idToken": requiredStringArg(),
				},
				Resolve: h.mutationResolver("loginWithGoogle"),
			},
			"requestPasswordReset": {
				Type: graphql.String,
				Args: graphql.FieldConfigArgument{
					"email": requiredStringArg(),
				},
				Resolve: h.mutationResolver("requestPasswordReset"),
			},
			"resetPassword": {
				Type: graphql.Boolean,
				Args: graphql.FieldConfigArgument{
					"token":       requiredStringArg(),
					"newPassword": requiredStringArg(),
				},
				Resolve: h.mutationResolver("resetPassword"),
			},
			"createBaby": {
				Type:    babyType,
				Args:    babyWriteArgs(false),
				Resolve: h.mutationResolver("createBaby"),
			},
			"updateBaby": {
				Type:    babyType,
				Args:    babyWriteArgs(true),
				Resolve: h.mutationResolver("updateBaby"),
			},
			"deleteBaby": singleMutationField(babyType, h.mutationResolver("deleteBaby")),
			"createMeasurement": {
				Type:    measurementType,
				Args:    measurementWriteArgs(true),
				Resolve: h.mutationResolver("createMeasurement"),
			},
			"updateMeasurement": {
				Type:    measurementType,
				Args:    measurementWriteArgs(false),
				Resolve: h.mutationResolver("updateMeasurement"),
			},
			"deleteMeasurement": singleMutationField(measurementType, h.mutationResolver("deleteMeasurement")),
			"createFeedingSession": {
				Type:    feedingSessionType,
				Args:    feedingWriteArgs(true),
				Resolve: h.mutationResolver("createFeedingSession"),
			},
			"updateFeedingSession": {
				Type:    feedingSessionType,
				Args:    feedingWriteArgs(false),
				Resolve: h.mutationResolver("updateFeedingSession"),
			},
			"deleteFeedingSession": singleMutationField(feedingSessionType, h.mutationResolver("deleteFeedingSession")),
			"createSleepSession": {
				Type:    sleepSessionType,
				Args:    sleepWriteArgs(true),
				Resolve: h.mutationResolver("createSleepSession"),
			},
			"updateSleepSession": {
				Type:    sleepSessionType,
				Args:    sleepWriteArgs(false),
				Resolve: h.mutationResolver("updateSleepSession"),
			},
			"deleteSleepSession": singleMutationField(sleepSessionType, h.mutationResolver("deleteSleepSession")),
			"createMilestone": {
				Type:    milestoneType,
				Args:    milestoneWriteArgs(true),
				Resolve: h.mutationResolver("createMilestone"),
			},
			"updateMilestone": {
				Type:    milestoneType,
				Args:    milestoneWriteArgs(false),
				Resolve: h.mutationResolver("updateMilestone"),
			},
			"deleteMilestone": singleMutationField(milestoneType, h.mutationResolver("deleteMilestone")),
		},
	})

	return graphql.NewSchema(graphql.SchemaConfig{Query: query, Mutation: mutation})
}

func collectionField(object graphql.Output, resolve graphql.FieldResolveFn, args graphql.FieldConfigArgument) *graphql.Field {
	return &graphql.Field{Type: graphql.NewList(object), Args: args, Resolve: resolve}
}

func singleField(object graphql.Output, resolve graphql.FieldResolveFn, args graphql.FieldConfigArgument) *graphql.Field {
	return &graphql.Field{Type: object, Args: args, Resolve: resolve}
}

func singleMutationField(object graphql.Output, resolve graphql.FieldResolveFn) *graphql.Field {
	return &graphql.Field{
		Type:    object,
		Args:    graphql.FieldConfigArgument{"id": requiredIDArg()},
		Resolve: resolve,
	}
}

func requiredIDArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}
}

func requiredBabyIDArg() graphql.FieldConfigArgument {
	return graphql.FieldConfigArgument{"babyId": requiredIDArg()}
}

func requiredStringArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}
}

func optionalStringArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.String}
}

func optionalFloatArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.Float}
}

func optionalIntArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.Int}
}

func optionalBooleanArg() *graphql.ArgumentConfig {
	return &graphql.ArgumentConfig{Type: graphql.Boolean}
}

func exportArgs(requiredBaby bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"babyId":   requiredIDArg(),
		"dateFrom": optionalStringArg(),
		"dateTo":   optionalStringArg(),
	}
	if !requiredBaby {
		args["babyId"] = optionalStringArg()
	}
	return args
}

func babyWriteArgs(update bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"name":     optionalStringArg(),
		"dob":      optionalStringArg(),
		"sex":      optionalStringArg(),
		"photoUrl": optionalStringArg(),
	}
	if update {
		args["id"] = requiredIDArg()
	} else {
		args["name"] = requiredStringArg()
	}
	return args
}

func measurementWriteArgs(create bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"date":              optionalStringArg(),
		"weight":            optionalFloatArg(),
		"height":            optionalFloatArg(),
		"headCircumference": optionalFloatArg(),
	}
	if create {
		args["babyId"] = requiredIDArg()
	} else {
		args["id"] = requiredIDArg()
	}
	return args
}

func feedingWriteArgs(create bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"feedType":         optionalStringArg(),
		"startedAt":        optionalStringArg(),
		"endedAt":          optionalStringArg(),
		"leftDurationSec":  optionalIntArg(),
		"rightDurationSec": optionalIntArg(),
		"amountMl":         optionalFloatArg(),
		"milkType":         optionalStringArg(),
		"temperature":      optionalStringArg(),
		"foodName":         optionalStringArg(),
		"quantity":         optionalFloatArg(),
		"quantityUnit":     optionalStringArg(),
		"reaction":         optionalStringArg(),
		"notes":            optionalStringArg(),
	}
	if create {
		args["babyId"] = requiredIDArg()
		args["feedType"] = requiredStringArg()
	} else {
		args["id"] = requiredIDArg()
	}
	return args
}

func sleepWriteArgs(create bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"startedAt": optionalStringArg(),
		"endedAt":   optionalStringArg(),
		"location":  optionalStringArg(),
		"notes":     optionalStringArg(),
	}
	if create {
		args["babyId"] = requiredIDArg()
	} else {
		args["id"] = requiredIDArg()
	}
	return args
}

func milestoneWriteArgs(create bool) graphql.FieldConfigArgument {
	args := graphql.FieldConfigArgument{
		"title":       optionalStringArg(),
		"description": optionalStringArg(),
		"category":    optionalStringArg(),
		"achievedAt":  optionalStringArg(),
		"note":        optionalStringArg(),
		"photoUrl":    optionalStringArg(),
		"isCustom":    optionalBooleanArg(),
	}
	if create {
		args["babyId"] = requiredIDArg()
		args["title"] = requiredStringArg()
	} else {
		args["id"] = requiredIDArg()
	}
	return args
}

func (h *Handler) queryResolver(field string) graphql.FieldResolveFn {
	return func(p graphql.ResolveParams) (interface{}, error) {
		return resolverValue(h.resolveQuery(p.Context, field, p.Args), field)
	}
}

func (h *Handler) mutationResolver(field string) graphql.FieldResolveFn {
	return func(p graphql.ResolveParams) (interface{}, error) {
		return resolverValue(h.resolveMutation(p.Context, field, p.Args), field)
	}
}

func resolverValue(result ExecResult, field string) (interface{}, error) {
	if len(result.Errors) > 0 {
		return nil, errors.New(result.Errors[0].Message)
	}
	if data, ok := result.Data.(map[string]interface{}); ok {
		return data[field], nil
	}
	return result.Data, nil
}

// normalizeGraphQLData keeps the in-process result shape compatible with the
// existing test/client helpers. JSON responses remain unchanged, but object
// lists are exposed as []map[string]interface{} and GraphQL Int values retain
// the prior JSON-decoded float64 representation.
func normalizeGraphQLData(value interface{}) interface{} {
	switch value := value.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{}, len(value))
		for key, item := range value {
			result[key] = normalizeGraphQLData(item)
		}
		return result
	case []interface{}:
		items := make([]interface{}, len(value))
		allObjects := true
		for index, item := range value {
			items[index] = normalizeGraphQLData(item)
			if _, ok := items[index].(map[string]interface{}); !ok {
				allObjects = false
			}
		}
		if allObjects {
			objects := make([]map[string]interface{}, len(items))
			for index, item := range items {
				objects[index] = item.(map[string]interface{})
			}
			return objects
		}
		return items
	case int:
		return float64(value)
	case int8:
		return float64(value)
	case int16:
		return float64(value)
	case int32:
		return float64(value)
	case int64:
		return float64(value)
	default:
		return value
	}
}

var legacyRequestPattern = regexp.MustCompile(`(?is)^\s*(query|mutation)(\s+[A-Za-z_][A-Za-z0-9_]*)?\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\s*$`)

// normalizeLegacyRequest keeps direct Handler.Execute callers compatible with
// the pre-schema test helper syntax (for example, "mutation { createBaby }")
// while real HTTP GraphQL requests go straight through graphql-go unchanged.
// The compatibility path only recognizes a single root field and emits a
// normal GraphQL request with explicit literals and a complete selection set.
func normalizeLegacyRequest(query string, variables map[string]interface{}) (string, string, string, bool) {
	matches := legacyRequestPattern.FindStringSubmatch(query)
	if len(matches) != 4 {
		return "", "", "", false
	}

	operation := strings.ToLower(matches[1])
	field := matches[3]
	selection, known := legacySelections[field]
	if !known {
		return "", "", "", false
	}

	args := make([]string, 0, len(legacyArguments[field]))
	for _, name := range legacyArguments[field] {
		value, exists := legacyValue(variables, name)
		if !exists || value == nil {
			continue
		}
		literal, ok := graphqlLiteral(value)
		if ok {
			args = append(args, name+": "+literal)
		}
	}

	request := operation + " { " + field
	if len(args) > 0 {
		request += "(" + strings.Join(args, ", ") + ")"
	}
	request += selection + " }"
	return request, operation, field, true
}

func legacyMissingRequired(operation, field string, variables map[string]interface{}) bool {
	for _, name := range legacyRequiredArguments[operation+":"+field] {
		value, exists := legacyValue(variables, name)
		if !exists || value == nil {
			return true
		}
	}
	return false
}

func legacyValue(variables map[string]interface{}, name string) (interface{}, bool) {
	if variables == nil {
		return nil, false
	}
	if input, ok := variables["input"].(map[string]interface{}); ok {
		if value, exists := input[name]; exists {
			return value, true
		}
	}
	value, exists := variables[name]
	return value, exists
}

func graphqlLiteral(value interface{}) (string, bool) {
	switch value := value.(type) {
	case string:
		encoded, err := json.Marshal(value)
		return string(encoded), err == nil
	case bool:
		return strconv.FormatBool(value), true
	case int:
		return strconv.Itoa(value), true
	case int8:
		return strconv.FormatInt(int64(value), 10), true
	case int16:
		return strconv.FormatInt(int64(value), 10), true
	case int32:
		return strconv.FormatInt(int64(value), 10), true
	case int64:
		return strconv.FormatInt(value, 10), true
	case uint:
		return strconv.FormatUint(uint64(value), 10), true
	case uint8:
		return strconv.FormatUint(uint64(value), 10), true
	case uint16:
		return strconv.FormatUint(uint64(value), 10), true
	case uint32:
		return strconv.FormatUint(uint64(value), 10), true
	case uint64:
		return strconv.FormatUint(value, 10), true
	case float32:
		return strconv.FormatFloat(float64(value), 'f', -1, 32), true
	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64), true
	default:
		encoded, err := json.Marshal(value)
		if err != nil {
			return "", false
		}
		return string(encoded), true
	}
}

const (
	legacyHealthSelection      = " { ok timestamp version }"
	legacyUserSelection        = " { id email displayName photoUrl createdAt }"
	legacyAuthSelection        = " { token user { id email displayName photoUrl createdAt } }"
	legacyBabySelection        = " { id name dob sex photoUrl createdAt userId }"
	legacyMeasurementSelection = " { id babyId date weight height headCircumference weightPercentile heightPercentile headCircumferencePercentile createdAt }"
	legacyFeedingSelection     = " { id babyId feedType startedAt endedAt leftDurationSec rightDurationSec amountMl milkType foodName reaction temperature quantity quantityUnit notes createdAt }"
	legacySleepSelection       = " { id babyId startedAt endedAt location notes createdAt }"
	legacyMilestoneSelection   = " { id babyId title description category achievedAt note photoUrl isCustom createdAt }"
	legacyExportSelection      = " { babyName babyDob babySex feedSessions { id babyId feedType startedAt endedAt leftDurationSec rightDurationSec amountMl milkType foodName reaction temperature quantity quantityUnit notes createdAt } sleepSessions { id babyId startedAt endedAt location notes createdAt } measurements { id babyId date weight height headCircumference createdAt } milestones { id babyId title description category achievedAt note photoUrl isCustom createdAt } dateFrom dateTo }"
	legacyDemoSelection        = " { baby { id name dob sex photoUrl createdAt userId } feedingSessions { id babyId feedType startedAt endedAt leftDurationSec rightDurationSec amountMl milkType foodName reaction temperature quantity quantityUnit notes createdAt } sleepSessions { id babyId startedAt endedAt location notes createdAt } measurements { id babyId date weight height headCircumference createdAt } milestones { id babyId title description category achievedAt note photoUrl isCustom createdAt } }"
)

var legacySelections = map[string]string{
	"health":               legacyHealthSelection,
	"me":                   legacyUserSelection,
	"babies":               " { id name dob sex photoUrl createdAt userId }",
	"baby":                 legacyBabySelection,
	"measurements":         " { id babyId date weight height headCircumference createdAt }",
	"measurement":          legacyMeasurementSelection,
	"feedingSessions":      legacyFeedingSelection,
	"feedingSession":       legacyFeedingSelection,
	"sleepSessions":        legacySleepSelection,
	"sleepSession":         legacySleepSelection,
	"milestones":           legacyMilestoneSelection,
	"milestone":            legacyMilestoneSelection,
	"exportData":           legacyExportSelection,
	"exportCSV":            "",
	"demoData":             legacyDemoSelection,
	"signup":               legacyAuthSelection,
	"login":                legacyAuthSelection,
	"loginWithGoogle":      legacyAuthSelection,
	"requestPasswordReset": "",
	"resetPassword":        "",
	"createBaby":           legacyBabySelection,
	"updateBaby":           legacyBabySelection,
	"deleteBaby":           legacyBabySelection,
	"createMeasurement":    legacyMeasurementSelection,
	"updateMeasurement":    legacyMeasurementSelection,
	"deleteMeasurement":    legacyMeasurementSelection,
	"createFeedingSession": legacyFeedingSelection,
	"updateFeedingSession": legacyFeedingSelection,
	"deleteFeedingSession": legacyFeedingSelection,
	"createSleepSession":   legacySleepSelection,
	"updateSleepSession":   legacySleepSelection,
	"deleteSleepSession":   legacySleepSelection,
	"createMilestone":      legacyMilestoneSelection,
	"updateMilestone":      legacyMilestoneSelection,
	"deleteMilestone":      legacyMilestoneSelection,
}

var legacyArguments = map[string][]string{
	"signup":               {"email", "password", "displayName"},
	"login":                {"email", "password"},
	"loginWithGoogle":      {"idToken"},
	"requestPasswordReset": {"email"},
	"resetPassword":        {"token", "newPassword"},
	"baby":                 {"id"},
	"createBaby":           {"name", "dob", "sex", "photoUrl"},
	"updateBaby":           {"id", "name", "dob", "sex", "photoUrl"},
	"deleteBaby":           {"id"},
	"measurements":         {"babyId"},
	"measurement":          {"id"},
	"createMeasurement":    {"babyId", "date", "weight", "height", "headCircumference"},
	"updateMeasurement":    {"id", "date", "weight", "height", "headCircumference"},
	"deleteMeasurement":    {"id"},
	"feedingSessions":      {"babyId"},
	"feedingSession":       {"id"},
	"createFeedingSession": {"babyId", "feedType", "startedAt", "endedAt", "leftDurationSec", "rightDurationSec", "amountMl", "milkType", "temperature", "foodName", "quantity", "quantityUnit", "reaction", "notes"},
	"updateFeedingSession": {"id", "feedType", "startedAt", "endedAt", "leftDurationSec", "rightDurationSec", "amountMl", "milkType", "temperature", "foodName", "quantity", "quantityUnit", "reaction", "notes"},
	"deleteFeedingSession": {"id"},
	"sleepSessions":        {"babyId"},
	"sleepSession":         {"id"},
	"createSleepSession":   {"babyId", "startedAt", "endedAt", "location", "notes"},
	"updateSleepSession":   {"id", "startedAt", "endedAt", "location", "notes"},
	"deleteSleepSession":   {"id"},
	"milestones":           {"babyId"},
	"milestone":            {"id"},
	"createMilestone":      {"babyId", "title", "description", "category", "achievedAt", "note", "photoUrl", "isCustom"},
	"updateMilestone":      {"id", "title", "description", "category", "achievedAt", "note", "photoUrl", "isCustom"},
	"deleteMilestone":      {"id"},
	"exportData":           {"babyId", "dateFrom", "dateTo"},
	"exportCSV":            {"babyId", "dateFrom", "dateTo"},
}

var legacyRequiredArguments = map[string][]string{
	"mutation:signup":               {"email", "password"},
	"mutation:login":                {"email"},
	"mutation:loginWithGoogle":      {"idToken"},
	"mutation:requestPasswordReset": {"email"},
	"mutation:resetPassword":        {"token", "newPassword"},
	"query:baby":                    {"id"},
	"mutation:createBaby":           {"name"},
	"mutation:updateBaby":           {"id"},
	"mutation:deleteBaby":           {"id"},
	"query:measurements":            {"babyId"},
	"query:measurement":             {"id"},
	"mutation:createMeasurement":    {"babyId"},
	"mutation:updateMeasurement":    {"id"},
	"mutation:deleteMeasurement":    {"id"},
	"query:feedingSessions":         {"babyId"},
	"query:feedingSession":          {"id"},
	"mutation:createFeedingSession": {"babyId", "feedType"},
	"mutation:updateFeedingSession": {"id"},
	"mutation:deleteFeedingSession": {"id"},
	"query:sleepSessions":           {"babyId"},
	"query:sleepSession":            {"id"},
	"mutation:createSleepSession":   {"babyId"},
	"mutation:updateSleepSession":   {"id"},
	"mutation:deleteSleepSession":   {"id"},
	"query:milestones":              {"babyId"},
	"query:milestone":               {"id"},
	"mutation:createMilestone":      {"babyId", "title"},
	"mutation:updateMilestone":      {"id"},
	"mutation:deleteMilestone":      {"id"},
	"query:exportData":              {"babyId"},
	"query:exportCSV":               {"babyId"},
}
