package jira

import "testing"

func TestMinutesToStoryPoints_Table(t *testing.T) {
	tests := []struct {
		minutes int
		want    int
	}{
		{0, 1},
		{30, 1},
		{31, 1},
		{60, 1},
		{61, 2},
		{90, 2},
		{91, 2},
		{120, 2},
		{121, 3},
		{180, 3},
		{181, 5},
		{240, 5},
		{241, 5},
		{360, 5},
		{361, 8},
		{480, 8},
		{481, 13},
	}

	for _, tt := range tests {
		got := MinutesToStoryPoints(tt.minutes)
		if got != tt.want {
			t.Errorf("MinutesToStoryPoints(%d) = %d, want %d", tt.minutes, got, tt.want)
		}
	}
}

func TestMinutesToStoryPoints_ZeroAndLarge(t *testing.T) {
	// Zero should map to 1
	if got := MinutesToStoryPoints(0); got != 1 {
		t.Errorf("MinutesToStoryPoints(0) = %d, want 1", got)
	}

	// Very large value should cap at 13
	if got := MinutesToStoryPoints(999); got != 13 {
		t.Errorf("MinutesToStoryPoints(999) = %d, want 13", got)
	}
}

func TestDurationToStoryPoints_Ranges(t *testing.T) {
	tests := []struct {
		duration string
		want     int
	}{
		{"1-2 days", 8},
		{"2-3 days", 13},
		{"3-4 days", 21},
	}

	for _, tt := range tests {
		got := DurationToStoryPoints(tt.duration)
		if got != tt.want {
			t.Errorf("DurationToStoryPoints(%q) = %d, want %d", tt.duration, got, tt.want)
		}
	}
}

func TestDurationToStoryPoints_SingleAndWeek(t *testing.T) {
	tests := []struct {
		duration string
		want     int
	}{
		{"1 day", 5},    // 6 hours → closest to 5
		{"2 days", 13},  // 12 hours → closest to 13 (dist 1 vs 8 dist 4)
		{"1 week", 40},  // 30 hours → 40
	}

	for _, tt := range tests {
		got := DurationToStoryPoints(tt.duration)
		if got != tt.want {
			t.Errorf("DurationToStoryPoints(%q) = %d, want %d", tt.duration, got, tt.want)
		}
	}
}
