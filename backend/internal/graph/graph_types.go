package graph

import "time"

type storedUser struct {
	Email          string
	PasswordHash   string
	DisplayName    string
	PhotoURL       string
	CreatedAt      string
	CasdoorSubject string
	CasdoorOwner   string
	Roles          []string
	Permissions    []string
	AuthProvider   string
}

type BabyProfile struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	DOB       string `json:"dob"`
	Sex       string `json:"sex"`
	PhotoURL  string `json:"photoUrl"`
	CreatedAt string `json:"createdAt"`
	UserID    string `json:"userId"`
}

type Measurement struct {
	ID                string  `json:"id"`
	BabyID            string  `json:"babyId"`
	Date              string  `json:"date"`
	Weight            float64 `json:"weight"`
	Height            float64 `json:"height"`
	HeadCircumference float64 `json:"headCircumference"`
	CreatedAt         string  `json:"createdAt"`
}

type Milestone struct {
	ID          string `json:"id"`
	BabyID      string `json:"babyId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	AchievedAt  string `json:"achievedAt"`
	Note        string `json:"note"`
	PhotoURL    string `json:"photoUrl"`
	IsCustom    bool   `json:"isCustom"`
	CreatedAt   string `json:"createdAt"`
}

type SleepSession struct {
	ID        string `json:"id"`
	BabyID    string `json:"babyId"`
	StartedAt string `json:"startedAt"`
	EndedAt   string `json:"endedAt"`
	Location  string `json:"location"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
}

type FeedingSession struct {
	ID               string   `json:"id"`
	BabyID           string   `json:"babyId"`
	FeedType         string   `json:"feedType"`
	StartedAt        string   `json:"startedAt"`
	EndedAt          string   `json:"endedAt"`
	LeftDurationSec  int      `json:"leftDurationSec"`
	RightDurationSec int      `json:"rightDurationSec"`
	AmountML         float64  `json:"amountMl"`
	MilkType         string   `json:"milkType"`
	FoodName         string   `json:"foodName"`
	Reaction         string   `json:"reaction"`
	Temperature      *string  `json:"temperature"`
	Quantity         *float64 `json:"quantity"`
	QuantityUnit     *string  `json:"quantityUnit"`
	Notes            string   `json:"notes"`
	CreatedAt        string   `json:"createdAt"`
}

type ExecResult struct {
	Data   interface{}    `json:"data,omitempty"`
	Errors []GraphQLError `json:"errors,omitempty"`
}

type GraphQLError struct {
	Message string `json:"message"`
}

type HealthResult struct {
	OK        bool   `json:"ok"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

func NewHealth() HealthResult {
	return HealthResult{
		OK:        true,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "0.1.0",
	}
}
