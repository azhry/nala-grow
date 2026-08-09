package graph

import (
	"github.com/graphql-go/graphql"
)

func newMutationFields(h *Handler, types graphTypes) graphql.Fields {
	return graphql.Fields{
		"signup": {
			Type: types.authResponse,
			Args: graphql.FieldConfigArgument{
				"email":       requiredStringArg(),
				"password":    requiredStringArg(),
				"displayName": optionalStringArg(),
			},
			Resolve: h.resolveSignup,
		},
		"login": {
			Type: types.authResponse,
			Args: graphql.FieldConfigArgument{
				"email":    requiredStringArg(),
				"password": requiredStringArg(),
			},
			Resolve: h.resolveLogin,
		},
		"loginWithGoogle": {
			Type: types.authResponse,
			Args: graphql.FieldConfigArgument{
				"idToken": requiredStringArg(),
			},
			Resolve: h.resolveLoginWithGoogle,
		},
		"requestPasswordReset": {
			Type:    graphql.String,
			Args:    graphql.FieldConfigArgument{"email": requiredStringArg()},
			Resolve: h.resolveRequestPasswordReset,
		},
		"resetPassword": {
			Type: graphql.Boolean,
			Args: graphql.FieldConfigArgument{
				"token":       requiredStringArg(),
				"newPassword": requiredStringArg(),
			},
			Resolve: h.resolveResetPassword,
		},
		"createBaby": {
			Type:    types.baby,
			Args:    babyWriteArgs(false),
			Resolve: h.resolveCreateBaby,
		},
		"updateBaby": {
			Type:    types.baby,
			Args:    babyWriteArgs(true),
			Resolve: h.resolveUpdateBaby,
		},
		"deleteBaby": singleMutationField(types.baby, h.resolveDeleteBaby),
		"createMeasurement": {
			Type:    types.measurement,
			Args:    measurementWriteArgs(true),
			Resolve: h.resolveCreateMeasurement,
		},
		"updateMeasurement": {
			Type:    types.measurement,
			Args:    measurementWriteArgs(false),
			Resolve: h.resolveUpdateMeasurement,
		},
		"deleteMeasurement": singleMutationField(types.measurement, h.resolveDeleteMeasurement),
		"createFeedingSession": {
			Type:    types.feedingSession,
			Args:    feedingWriteArgs(true),
			Resolve: h.resolveCreateFeedingSession,
		},
		"updateFeedingSession": {
			Type:    types.feedingSession,
			Args:    feedingWriteArgs(false),
			Resolve: h.resolveUpdateFeedingSession,
		},
		"deleteFeedingSession": singleMutationField(types.feedingSession, h.resolveDeleteFeedingSession),
		"createSleepSession": {
			Type:    types.sleepSession,
			Args:    sleepWriteArgs(true),
			Resolve: h.resolveCreateSleepSession,
		},
		"updateSleepSession": {
			Type:    types.sleepSession,
			Args:    sleepWriteArgs(false),
			Resolve: h.resolveUpdateSleepSession,
		},
		"deleteSleepSession": singleMutationField(types.sleepSession, h.resolveDeleteSleepSession),
		"createMilestone": {
			Type:    types.milestone,
			Args:    milestoneWriteArgs(true),
			Resolve: h.resolveCreateMilestone,
		},
		"updateMilestone": {
			Type:    types.milestone,
			Args:    milestoneWriteArgs(false),
			Resolve: h.resolveUpdateMilestone,
		},
		"deleteMilestone": singleMutationField(types.milestone, h.resolveDeleteMilestone),
	}
}
