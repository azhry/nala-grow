package graph

import "github.com/graphql-go/graphql"

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

func exportArgs() graphql.FieldConfigArgument {
	return graphql.FieldConfigArgument{
		"babyId":   requiredIDArg(),
		"dateFrom": optionalStringArg(),
		"dateTo":   optionalStringArg(),
	}
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
