// ---------------------------------------------------------------------------
// NalaGrow — GraphQL query & mutation strings
//
// The backend uses strings.Contains() routing (case-insensitive after
// lowering), so each operation name MUST contain the exact substring the
// backend checks for.  Variables are accepted both at the top level AND
// nested under "input" — the getVar / getVarFloat / … helpers check both.
// ---------------------------------------------------------------------------

// ─── Auth ───────────────────────────────────────────────────────────────────

const AUTH_RESPONSE_FIELDS = `
    token
    refreshToken
    expiresIn
    user {
      id
      email
      displayName
      photoUrl
      createdAt
      subject
      organization
      roles
      permissions
    }`

const LEGACY_AUTH_RESPONSE_FIELDS = `
    token
    user {
      id
      email
      displayName
      photoUrl
      createdAt
    }`

export const SIGNUP_MUTATION = `mutation signup($email: String!, $password: String!, $displayName: String) {
  signup(email: $email, password: $password, displayName: $displayName) {${AUTH_RESPONSE_FIELDS}
  }
}`

export const LOGIN_MUTATION = `mutation login($email: String!, $password: String!) {
  login(email: $email, password: $password) {${AUTH_RESPONSE_FIELDS}
  }
}`

export const LOGIN_GOOGLE_MUTATION = `mutation loginWithGoogle($idToken: String!) {
  loginWithGoogle(idToken: $idToken) {${AUTH_RESPONSE_FIELDS}
  }
}`

export const LOGIN_CASDOOR_MUTATION = `mutation loginWithCasdoor($code: String!, $redirectUri: String!) {
  loginWithCasdoor(code: $code, redirectUri: $redirectUri) {${AUTH_RESPONSE_FIELDS}
  }
}`

export const REFRESH_TOKEN_MUTATION = `mutation refreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {${AUTH_RESPONSE_FIELDS}
  }
}`

// These additive-compatibility operations keep explicitly configured local
// mode usable while an older backend is being rolled forward. They are only
// used after the richer selection is rejected for an unsupported field.
export const LEGACY_SIGNUP_MUTATION = `mutation signup($email: String!, $password: String!, $displayName: String) {
  signup(email: $email, password: $password, displayName: $displayName) {${LEGACY_AUTH_RESPONSE_FIELDS}
  }
}`

export const LEGACY_LOGIN_MUTATION = `mutation login($email: String!, $password: String!) {
  login(email: $email, password: $password) {${LEGACY_AUTH_RESPONSE_FIELDS}
  }
}`

export const LEGACY_LOGIN_GOOGLE_MUTATION = `mutation loginWithGoogle($idToken: String!) {
  loginWithGoogle(idToken: $idToken) {${LEGACY_AUTH_RESPONSE_FIELDS}
  }
}`

export const REQUEST_PASSWORD_RESET_MUTATION = `mutation requestPasswordReset($email: String!) {
  requestPasswordReset(email: $email)
}`

export const RESET_PASSWORD_MUTATION = `mutation resetPassword($token: String!, $newPassword: String!) {
  resetPassword(token: $token, newPassword: $newPassword)
}`

export const ME_QUERY = `query me {
  me {
    id
    email
    displayName
    photoUrl
    createdAt
    subject
    organization
    roles
    permissions
  }
}`

export const LEGACY_ME_QUERY = `query me {
  me {
    id
    email
    displayName
    photoUrl
    createdAt
  }
}`

// ─── Baby ───────────────────────────────────────────────────────────────────

export const BABIES_QUERY = `query babies {
  babies {
    id
    name
    dob
    sex
    photoUrl
    createdAt
    userId
  }
}`

export const BABY_QUERY = `query baby($id: ID!) {
  baby(id: $id) {
    id
    name
    dob
    sex
    photoUrl
    createdAt
    userId
  }
}`

export const CREATE_BABY_MUTATION = `mutation createBaby($name: String!, $dob: String, $sex: String, $photoUrl: String) {
  createBaby(name: $name, dob: $dob, sex: $sex, photoUrl: $photoUrl) {
    id
    name
    dob
    sex
    photoUrl
    createdAt
    userId
  }
}`

export const UPDATE_BABY_MUTATION = `mutation updateBaby($id: ID!, $name: String, $dob: String, $sex: String, $photoUrl: String) {
  updateBaby(id: $id, name: $name, dob: $dob, sex: $sex, photoUrl: $photoUrl) {
    id
    name
    dob
    sex
    photoUrl
    createdAt
    userId
  }
}`

export const DELETE_BABY_MUTATION = `mutation deleteBaby($id: ID!) {
  deleteBaby(id: $id) {
    id
    name
    dob
    sex
    photoUrl
    createdAt
    userId
  }
}`

// ─── Measurement ────────────────────────────────────────────────────────────

export const MEASUREMENTS_QUERY = `query measurements($babyId: ID!) {
  measurements(babyId: $babyId) {
    id
    babyId
    date
    weight
    height
    headCircumference
    createdAt
  }
}`

export const MEASUREMENT_QUERY = `query measurement($id: ID!) {
  measurement(id: $id) {
    id
    babyId
    date
    weight
    height
    headCircumference
    createdAt
  }
}`

export const CREATE_MEASUREMENT_MUTATION = `mutation createMeasurement($babyId: ID!, $date: String, $weight: Float, $height: Float, $headCircumference: Float) {
  createMeasurement(babyId: $babyId, date: $date, weight: $weight, height: $height, headCircumference: $headCircumference) {
    id
    babyId
    date
    weight
    height
    headCircumference
    weightPercentile
    heightPercentile
    headCircumferencePercentile
    createdAt
  }
}`

export const UPDATE_MEASUREMENT_MUTATION = `mutation updateMeasurement($id: ID!, $date: String, $weight: Float, $height: Float, $headCircumference: Float) {
  updateMeasurement(id: $id, date: $date, weight: $weight, height: $height, headCircumference: $headCircumference) {
    id
    babyId
    date
    weight
    height
    headCircumference
    createdAt
  }
}`

export const DELETE_MEASUREMENT_MUTATION = `mutation deleteMeasurement($id: ID!) {
  deleteMeasurement(id: $id) {
    id
    babyId
    date
    weight
    height
    headCircumference
    createdAt
  }
}`

// ─── Feeding Session ────────────────────────────────────────────────────────

export const FEEDING_SESSIONS_QUERY = `query feedingSessions($babyId: ID!) {
  feedingSessions(babyId: $babyId) {
    id
    babyId
    feedType
    startedAt
    endedAt
    leftDurationSec
    rightDurationSec
    amountMl
    milkType
    temperature
    foodName
    quantity
    quantityUnit
    reaction
    notes
    createdAt
  }
}`

export const FEEDING_SESSION_QUERY = `query feedingSession($id: ID!) {
  feedingSession(id: $id) {
    id
    babyId
    feedType
    startedAt
    endedAt
    leftDurationSec
    rightDurationSec
    amountMl
    milkType
    temperature
    foodName
    quantity
    quantityUnit
    reaction
    notes
    createdAt
  }
}`

export const CREATE_FEEDING_SESSION_MUTATION = `mutation createFeedingSession($babyId: ID!, $feedType: String!, $startedAt: String, $endedAt: String, $leftDurationSec: Int, $rightDurationSec: Int, $amountMl: Float, $milkType: String, $temperature: String, $foodName: String, $quantity: Float, $quantityUnit: String, $reaction: String, $notes: String) {
  createFeedingSession(babyId: $babyId, feedType: $feedType, startedAt: $startedAt, endedAt: $endedAt, leftDurationSec: $leftDurationSec, rightDurationSec: $rightDurationSec, amountMl: $amountMl, milkType: $milkType, temperature: $temperature, foodName: $foodName, quantity: $quantity, quantityUnit: $quantityUnit, reaction: $reaction, notes: $notes) {
    id
    babyId
    feedType
    startedAt
    endedAt
    leftDurationSec
    rightDurationSec
    amountMl
    milkType
    temperature
    foodName
    quantity
    quantityUnit
    reaction
    notes
    createdAt
  }
}`

export const UPDATE_FEEDING_SESSION_MUTATION = `mutation updateFeedingSession($id: ID!, $feedType: String, $startedAt: String, $endedAt: String, $leftDurationSec: Int, $rightDurationSec: Int, $amountMl: Float, $milkType: String, $temperature: String, $foodName: String, $quantity: Float, $quantityUnit: String, $reaction: String, $notes: String) {
  updateFeedingSession(id: $id, feedType: $feedType, startedAt: $startedAt, endedAt: $endedAt, leftDurationSec: $leftDurationSec, rightDurationSec: $rightDurationSec, amountMl: $amountMl, milkType: $milkType, temperature: $temperature, foodName: $foodName, quantity: $quantity, quantityUnit: $quantityUnit, reaction: $reaction, notes: $notes) {
    id
    babyId
    feedType
    startedAt
    endedAt
    leftDurationSec
    rightDurationSec
    amountMl
    milkType
    temperature
    foodName
    quantity
    quantityUnit
    reaction
    notes
    createdAt
  }
}`

export const DELETE_FEEDING_SESSION_MUTATION = `mutation deleteFeedingSession($id: ID!) {
  deleteFeedingSession(id: $id) {
    id
    babyId
    feedType
    startedAt
    endedAt
    leftDurationSec
    rightDurationSec
    amountMl
    milkType
    temperature
    foodName
    quantity
    quantityUnit
    reaction
    notes
    createdAt
  }
}`

// ─── Sleep Session ──────────────────────────────────────────────────────────

export const SLEEP_SESSIONS_QUERY = `query sleepSessions($babyId: ID!) {
  sleepSessions(babyId: $babyId) {
    id
    babyId
    startedAt
    endedAt
    location
    notes
    createdAt
  }
}`

export const SLEEP_SESSION_QUERY = `query sleepSession($id: ID!) {
  sleepSession(id: $id) {
    id
    babyId
    startedAt
    endedAt
    location
    notes
    createdAt
  }
}`

export const CREATE_SLEEP_SESSION_MUTATION = `mutation createSleepSession($babyId: ID!, $startedAt: String, $endedAt: String, $location: String, $notes: String) {
  createSleepSession(babyId: $babyId, startedAt: $startedAt, endedAt: $endedAt, location: $location, notes: $notes) {
    id
    babyId
    startedAt
    endedAt
    location
    notes
    createdAt
  }
}`

export const UPDATE_SLEEP_SESSION_MUTATION = `mutation updateSleepSession($id: ID!, $startedAt: String, $endedAt: String, $location: String, $notes: String) {
  updateSleepSession(id: $id, startedAt: $startedAt, endedAt: $endedAt, location: $location, notes: $notes) {
    id
    babyId
    startedAt
    endedAt
    location
    notes
    createdAt
  }
}`

export const DELETE_SLEEP_SESSION_MUTATION = `mutation deleteSleepSession($id: ID!) {
  deleteSleepSession(id: $id) {
    id
    babyId
    startedAt
    endedAt
    location
    notes
    createdAt
  }
}`

// ─── Milestone ──────────────────────────────────────────────────────────────

export const MILESTONES_QUERY = `query milestones($babyId: ID!) {
  milestones(babyId: $babyId) {
    id
    babyId
    title
    description
    category
    achievedAt
    note
    photoUrl
    isCustom
    createdAt
  }
}`

export const MILESTONE_QUERY = `query milestone($id: ID!) {
  milestone(id: $id) {
    id
    babyId
    title
    description
    category
    achievedAt
    note
    photoUrl
    isCustom
    createdAt
  }
}`

export const CREATE_MILESTONE_MUTATION = `mutation createMilestone($babyId: ID!, $title: String!, $description: String, $category: String, $achievedAt: String, $note: String, $photoUrl: String, $isCustom: Boolean) {
  createMilestone(babyId: $babyId, title: $title, description: $description, category: $category, achievedAt: $achievedAt, note: $note, photoUrl: $photoUrl, isCustom: $isCustom) {
    id
    babyId
    title
    description
    category
    achievedAt
    note
    photoUrl
    isCustom
    createdAt
  }
}`

export const UPDATE_MILESTONE_MUTATION = `mutation updateMilestone($id: ID!, $title: String, $description: String, $category: String, $achievedAt: String, $note: String, $photoUrl: String, $isCustom: Boolean) {
  updateMilestone(id: $id, title: $title, description: $description, category: $category, achievedAt: $achievedAt, note: $note, photoUrl: $photoUrl, isCustom: $isCustom) {
    id
    babyId
    title
    description
    category
    achievedAt
    note
    photoUrl
    isCustom
    createdAt
  }
}`

export const DELETE_MILESTONE_MUTATION = `mutation deleteMilestone($id: ID!) {
  deleteMilestone(id: $id) {
    id
    babyId
    title
    description
    category
    achievedAt
    note
    photoUrl
    isCustom
    createdAt
  }
}`

// ─── Export ─────────────────────────────────────────────────────────────────

export const EXPORT_DATA_QUERY = `query exportData($babyId: ID!, $dateFrom: String, $dateTo: String) {
  exportData(babyId: $babyId, dateFrom: $dateFrom, dateTo: $dateTo) {
    babyName
    babyDob
    babySex
    feedSessions {
      id
      babyId
      feedType
      startedAt
      endedAt
      leftDurationSec
      rightDurationSec
      amountMl
      milkType
      foodName
      reaction
      notes
      createdAt
    }
    sleepSessions {
      id
      babyId
      startedAt
      endedAt
      location
      notes
      createdAt
    }
    measurements {
      id
      babyId
      date
      weight
      height
      headCircumference
      createdAt
    }
    milestones {
      id
      babyId
      title
      description
      category
      achievedAt
      note
      photoUrl
      isCustom
      createdAt
    }
    dateFrom
    dateTo
  }
}`

export const EXPORT_CSV_QUERY = `query exportCSV($babyId: ID!, $dateFrom: String, $dateTo: String) {
  exportCSV(babyId: $babyId, dateFrom: $dateFrom, dateTo: $dateTo)
}`
