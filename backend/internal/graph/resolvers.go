package graph

import (
	"strings"

	"github.com/graphql-go/graphql"
)

func legacyValidationResult(operation, field string, variables map[string]interface{}) ExecResult {
	missing := make([]string, 0)
	for _, name := range legacyRequiredArguments[operation+":"+field] {
		value, exists := legacyValue(variables, name)
		if !exists || value == nil {
			missing = append(missing, name)
		}
	}
	if len(missing) == 0 {
		return ExecResult{}
	}
	return ExecResult{Errors: []GraphQLError{{Message: strings.Join(missing, " and ") + " required"}}}
}

// Each root field has its own graphql-go resolver. Handler.Execute only keeps
// legacy syntax normalization before graphql-go parses and executes a request.
func (h *Handler) resolveHealth(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveHealthResult(p.Context, p.Args), "health")
}
func (h *Handler) resolveMe(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveMeResult(p.Context, p.Args), "me")
}
func (h *Handler) resolveBabies(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveBabiesResult(p.Context, p.Args), "babies")
}
func (h *Handler) resolveBaby(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveBabyResult(p.Context, p.Args), "baby")
}
func (h *Handler) resolveMeasurements(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveMeasurementsResult(p.Context, p.Args), "measurements")
}
func (h *Handler) resolveMeasurement(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveMeasurementResult(p.Context, p.Args), "measurement")
}
func (h *Handler) resolveFeedingSessions(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveFeedingSessionsResult(p.Context, p.Args), "feedingSessions")
}
func (h *Handler) resolveFeedingSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveFeedingSessionResult(p.Context, p.Args), "feedingSession")
}
func (h *Handler) resolveSleepSessions(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveSleepSessionsResult(p.Context, p.Args), "sleepSessions")
}
func (h *Handler) resolveSleepSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveSleepSessionResult(p.Context, p.Args), "sleepSession")
}
func (h *Handler) resolveMilestones(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveMilestonesResult(p.Context, p.Args), "milestones")
}
func (h *Handler) resolveMilestone(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveMilestoneResult(p.Context, p.Args), "milestone")
}
func (h *Handler) resolveExportData(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveExportDataResult(p.Context, p.Args), "exportData")
}
func (h *Handler) resolveExportCSV(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveExportCSVResult(p.Context, p.Args), "exportCSV")
}

func (h *Handler) resolveSignup(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveSignupResult(p.Context, p.Args), "signup")
}
func (h *Handler) resolveLogin(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveLoginResult(p.Context, p.Args), "login")
}
func (h *Handler) resolveLoginWithGoogle(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveLoginWithGoogleResult(p.Context, p.Args), "loginWithGoogle")
}
func (h *Handler) resolveRequestPasswordReset(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveRequestPasswordResetResult(p.Context, p.Args), "requestPasswordReset")
}
func (h *Handler) resolveResetPassword(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveResetPasswordResult(p.Context, p.Args), "resetPassword")
}
func (h *Handler) resolveCreateBaby(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveCreateBabyResult(p.Context, p.Args), "createBaby")
}
func (h *Handler) resolveUpdateBaby(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveUpdateBabyResult(p.Context, p.Args), "updateBaby")
}
func (h *Handler) resolveDeleteBaby(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveDeleteBabyResult(p.Context, p.Args), "deleteBaby")
}
func (h *Handler) resolveCreateMeasurement(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveCreateMeasurementResult(p.Context, p.Args), "createMeasurement")
}
func (h *Handler) resolveUpdateMeasurement(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveUpdateMeasurementResult(p.Context, p.Args), "updateMeasurement")
}
func (h *Handler) resolveDeleteMeasurement(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveDeleteMeasurementResult(p.Context, p.Args), "deleteMeasurement")
}
func (h *Handler) resolveCreateFeedingSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveCreateFeedingSessionResult(p.Context, p.Args), "createFeedingSession")
}
func (h *Handler) resolveUpdateFeedingSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveUpdateFeedingSessionResult(p.Context, p.Args), "updateFeedingSession")
}
func (h *Handler) resolveDeleteFeedingSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveDeleteFeedingSessionResult(p.Context, p.Args), "deleteFeedingSession")
}
func (h *Handler) resolveCreateSleepSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveCreateSleepSessionResult(p.Context, p.Args), "createSleepSession")
}
func (h *Handler) resolveUpdateSleepSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveUpdateSleepSessionResult(p.Context, p.Args), "updateSleepSession")
}
func (h *Handler) resolveDeleteSleepSession(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveDeleteSleepSessionResult(p.Context, p.Args), "deleteSleepSession")
}
func (h *Handler) resolveCreateMilestone(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveCreateMilestoneResult(p.Context, p.Args), "createMilestone")
}
func (h *Handler) resolveUpdateMilestone(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveUpdateMilestoneResult(p.Context, p.Args), "updateMilestone")
}
func (h *Handler) resolveDeleteMilestone(p graphql.ResolveParams) (interface{}, error) {
	return resolverValue(p.Context, h.resolveDeleteMilestoneResult(p.Context, p.Args), "deleteMilestone")
}
