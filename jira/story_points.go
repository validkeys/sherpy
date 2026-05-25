package jira

import (
	"strconv"
	"strings"
)

// MinutesToStoryPoints converts task estimate minutes to Fibonacci story points.
func MinutesToStoryPoints(minutes int) int {
	switch {
	case minutes <= 60:
		return 1
	case minutes <= 120:
		return 2
	case minutes <= 180:
		return 3
	case minutes <= 360:
		return 5
	case minutes <= 480:
		return 8
	default:
		return 13
	}
}

// DurationToStoryPoints converts milestone duration strings to Fibonacci story points.
// Handles formats like "1-2 days", "3 days", "1 week".
// Uses midpoint of ranges, converts to hours (6 productive hours per day),
// and rounds to Fibonacci numbers.
func DurationToStoryPoints(duration string) int {
	duration = strings.ToLower(strings.TrimSpace(duration))

	// Handle week format
	if strings.Contains(duration, "week") {
		// Extract number before "week"
		parts := strings.Fields(duration)
		if len(parts) >= 1 {
			weeks, err := strconv.ParseFloat(parts[0], 64)
			if err == nil {
				days := weeks * 5 // 5 working days per week
				hours := days * 6
				return roundToFibonacci(int(hours))
			}
		}
	}

	// Handle day format (range or single)
	if strings.Contains(duration, "day") {
		// Extract the numeric part
		duration = strings.ReplaceAll(duration, "days", "")
		duration = strings.ReplaceAll(duration, "day", "")
		duration = strings.TrimSpace(duration)

		// Check for range (e.g., "1-2")
		if strings.Contains(duration, "-") {
			parts := strings.Split(duration, "-")
			if len(parts) == 2 {
				start, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
				end, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
				if err1 == nil && err2 == nil {
					midpoint := (start + end) / 2
					hours := midpoint * 6
					return roundToFibonacci(int(hours))
				}
			}
		} else {
			// Single value
			days, err := strconv.ParseFloat(duration, 64)
			if err == nil {
				hours := days * 6
				return roundToFibonacci(int(hours))
			}
		}
	}

	// Default fallback
	return 5
}

// roundToFibonacci rounds hours to the nearest Fibonacci number.
// For values > 13, returns exact values like 21 or 40.
func roundToFibonacci(hours int) int {
	// For large values (>13), use exact Fibonacci or special values
	if hours >= 28 {
		return 40 // For 1 week or more
	}
	if hours >= 19 {
		return 21 // For 3-4 days range
	}

	// Standard Fibonacci rounding for <= 13
	fibonacci := []int{1, 2, 3, 5, 8, 13}

	closest := fibonacci[0]
	minDiff := abs(hours - closest)

	for _, fib := range fibonacci {
		diff := abs(hours - fib)
		if diff < minDiff {
			minDiff = diff
			closest = fib
		}
	}

	return closest
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
