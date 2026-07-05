package graph

import (
	"math"
	"time"
)

// AgeInMonths calculates the age in months between a date of birth and a measurement date.
func AgeInMonths(dob, date string) float64 {
	dobT, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return 0
	}
	dateT, err := time.Parse("2006-01-02", date)
	if err != nil {
		return 0
	}
	days := dateT.Sub(dobT).Hours() / 24
	return days / 30.4375
}

// CalculateZScore computes the WHO z-score using the LMS method.
func CalculateZScore(value, L, M, S float64) float64 {
	if S <= 0 || M <= 0 {
		return 0
	}
	if L == 0 {
		return math.Log(value/M) / S
	}
	return (math.Pow(value/M, L) - 1) / (L * S)
}

// ZToPercentile converts a z-score to a percentile (0-100) using the
// Abramowitz and Stegun approximation of the standard normal CDF.
func ZToPercentile(z float64) float64 {
	sign := 1.0
	if z < 0 {
		sign = -1.0
		z = -z
	}
	t := 1.0 / (1.0 + 0.2316419*z)
	p := 1.0 - 0.3989423*math.Exp(-z*z/2)*((((1.330274429*t-1.821255978)*t+1.781477937)*t-0.356563782)*t+0.319381530)*t
	if sign < 0 {
		p = 1 - p
	}
	return p * 100
}

// whoLMS returns approximate WHO LMS values for a given sex, age in months, and measurement type.
// These are simplified reference values for percentile calculation.
func whoLMS(sex string, ageMonths float64, measurement string) (L, M, S float64) {
	// Approximate WHO growth standards for girls (female) and boys (male)
	// Only weight, height, and headCircumference are supported
	switch measurement {
	case "weight":
		switch sex {
		case "female":
			return whoFemaleWeightLMS(ageMonths)
		default:
			return whoMaleWeightLMS(ageMonths)
		}
	case "height":
		switch sex {
		case "female":
			return whoFemaleHeightLMS(ageMonths)
		default:
			return whoMaleHeightLMS(ageMonths)
		}
	case "headCircumference":
		switch sex {
		case "female":
			return whoFemaleHCLMS(ageMonths)
		default:
			return whoMaleHCLMS(ageMonths)
		}
	}
	return 0, 0, 0
}

// Approximate WHO LMS values for weight-for-age (kg)
func whoFemaleWeightLMS(ageMonths float64) (L, M, S float64) {
	// Simplified reference values based on WHO child growth standards
	// ageMonths: 0-24 months approximated
	switch {
	case ageMonths < 1:
		return 0.1, 3.8, 0.14
	case ageMonths < 2:
		return 0.1, 4.5, 0.13
	case ageMonths < 3:
		return 0.1, 5.2, 0.12
	case ageMonths < 4:
		return 0.1, 6.0, 0.10
	case ageMonths < 5:
		return 0.1, 6.6, 0.10
	case ageMonths < 6:
		return 0.1, 7.1, 0.10
	default:
		return 0.1, 7.5, 0.10
	}
}

func whoMaleWeightLMS(ageMonths float64) (L, M, S float64) {
	switch {
	case ageMonths < 1:
		return 0.1, 4.1, 0.14
	case ageMonths < 2:
		return 0.1, 4.9, 0.13
	case ageMonths < 3:
		return 0.1, 5.6, 0.12
	case ageMonths < 4:
		return 0.1, 6.3, 0.10
	case ageMonths < 5:
		return 0.1, 6.9, 0.10
	case ageMonths < 6:
		return 0.1, 7.4, 0.10
	default:
		return 0.1, 7.9, 0.10
	}
}

// Approximate WHO LMS values for height-for-age (cm)
func whoFemaleHeightLMS(ageMonths float64) (L, M, S float64) {
	switch {
	case ageMonths < 1:
		return 1.0, 49.5, 0.04
	case ageMonths < 3:
		return 1.0, 54.0, 0.04
	case ageMonths < 6:
		return 1.0, 61.0, 0.04
	default:
		return 1.0, 66.0, 0.04
	}
}

func whoMaleHeightLMS(ageMonths float64) (L, M, S float64) {
	switch {
	case ageMonths < 1:
		return 1.0, 50.0, 0.04
	case ageMonths < 3:
		return 1.0, 54.8, 0.04
	case ageMonths < 6:
		return 1.0, 61.5, 0.04
	default:
		return 1.0, 67.0, 0.04
	}
}

// Approximate WHO LMS values for head circumference (cm)
func whoFemaleHCLMS(ageMonths float64) (L, M, S float64) {
	switch {
	case ageMonths < 1:
		return 1.0, 34.0, 0.03
	case ageMonths < 3:
		return 1.0, 37.0, 0.03
	case ageMonths < 6:
		return 1.0, 40.5, 0.03
	default:
		return 1.0, 42.5, 0.03
	}
}

func whoMaleHCLMS(ageMonths float64) (L, M, S float64) {
	switch {
	case ageMonths < 1:
		return 1.0, 34.5, 0.03
	case ageMonths < 3:
		return 1.0, 37.8, 0.03
	case ageMonths < 6:
		return 1.0, 41.0, 0.03
	default:
		return 1.0, 43.0, 0.03
	}
}
