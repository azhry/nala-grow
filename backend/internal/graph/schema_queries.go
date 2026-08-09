package graph

import "github.com/graphql-go/graphql"

func newQueryFields(h *Handler, types graphTypes) graphql.Fields {
	return graphql.Fields{
		"health": {
			Type:    graphql.NewNonNull(types.health),
			Resolve: h.resolveHealth,
		},
		"me": {
			Type:    types.user,
			Resolve: h.resolveMe,
		},
		"babies": {
			Type:    graphql.NewList(types.baby),
			Resolve: h.resolveBabies,
		},
		"baby": {
			Type:    types.baby,
			Args:    graphql.FieldConfigArgument{"id": requiredIDArg()},
			Resolve: h.resolveBaby,
		},
		"measurements":    collectionField(types.measurement, h.resolveMeasurements, requiredBabyIDArg()),
		"measurement":     singleField(types.measurement, h.resolveMeasurement, graphql.FieldConfigArgument{"id": requiredIDArg()}),
		"feedingSessions": collectionField(types.feedingSession, h.resolveFeedingSessions, requiredBabyIDArg()),
		"feedingSession":  singleField(types.feedingSession, h.resolveFeedingSession, graphql.FieldConfigArgument{"id": requiredIDArg()}),
		"sleepSessions":   collectionField(types.sleepSession, h.resolveSleepSessions, requiredBabyIDArg()),
		"sleepSession":    singleField(types.sleepSession, h.resolveSleepSession, graphql.FieldConfigArgument{"id": requiredIDArg()}),
		"milestones":      collectionField(types.milestone, h.resolveMilestones, requiredBabyIDArg()),
		"milestone":       singleField(types.milestone, h.resolveMilestone, graphql.FieldConfigArgument{"id": requiredIDArg()}),
		"exportData": {
			Type:    types.exportData,
			Args:    exportArgs(),
			Resolve: h.resolveExportData,
		},
		"exportCSV": {
			Type:    graphql.String,
			Args:    exportArgs(),
			Resolve: h.resolveExportCSV,
		},
	}
}
