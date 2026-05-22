package jira

import (
	"testing"
)

func TestOrderMilestones_Linear(t *testing.T) {
	milestones := []Milestone{
		{ID: "m0", Name: "M0", Dependencies: []string{}},
		{ID: "m1", Name: "M1", Dependencies: []string{"m0"}},
		{ID: "m2", Name: "M2", Dependencies: []string{"m1"}},
	}

	levels, err := OrderMilestones(milestones)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(levels))
	}

	// Level 0 should have m0
	if len(levels[0]) != 1 || levels[0][0].ID != "m0" {
		t.Errorf("level 0: expected [m0], got %v", getIDs(levels[0]))
	}

	// Level 1 should have m1
	if len(levels[1]) != 1 || levels[1][0].ID != "m1" {
		t.Errorf("level 1: expected [m1], got %v", getIDs(levels[1]))
	}

	// Level 2 should have m2
	if len(levels[2]) != 1 || levels[2][0].ID != "m2" {
		t.Errorf("level 2: expected [m2], got %v", getIDs(levels[2]))
	}
}

func TestOrderMilestones_Diamond(t *testing.T) {
	milestones := []Milestone{
		{ID: "m0", Name: "M0", Dependencies: []string{}},
		{ID: "m1", Name: "M1", Dependencies: []string{"m0"}},
		{ID: "m2", Name: "M2", Dependencies: []string{"m0"}},
		{ID: "m3", Name: "M3", Dependencies: []string{"m1", "m2"}},
	}

	levels, err := OrderMilestones(milestones)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(levels))
	}

	// Level 0 should have m0
	if len(levels[0]) != 1 || levels[0][0].ID != "m0" {
		t.Errorf("level 0: expected [m0], got %v", getIDs(levels[0]))
	}

	// Level 1 should have m1 and m2 (parallel)
	if len(levels[1]) != 2 {
		t.Errorf("level 1: expected 2 milestones, got %d", len(levels[1]))
	}
	level1IDs := getIDs(levels[1])
	if !containsString(level1IDs, "m1") || !contains(level1IDs, "m2") {
		t.Errorf("level 1: expected [m1, m2] in any order, got %v", level1IDs)
	}

	// Level 2 should have m3
	if len(levels[2]) != 1 || levels[2][0].ID != "m3" {
		t.Errorf("level 2: expected [m3], got %v", getIDs(levels[2]))
	}
}

func TestOrderMilestones_NoDeps(t *testing.T) {
	milestones := []Milestone{
		{ID: "m0", Name: "M0", Dependencies: []string{}},
		{ID: "m1", Name: "M1", Dependencies: []string{}},
		{ID: "m2", Name: "M2", Dependencies: []string{}},
	}

	levels, err := OrderMilestones(milestones)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 1 {
		t.Fatalf("expected 1 level, got %d", len(levels))
	}

	// Level 0 should have all three milestones
	if len(levels[0]) != 3 {
		t.Errorf("level 0: expected 3 milestones, got %d", len(levels[0]))
	}
	level0IDs := getIDs(levels[0])
	if !containsString(level0IDs, "m0") || !contains(level0IDs, "m1") || !contains(level0IDs, "m2") {
		t.Errorf("level 0: expected [m0, m1, m2] in any order, got %v", level0IDs)
	}
}

func TestOrderMilestones_Circular(t *testing.T) {
	milestones := []Milestone{
		{ID: "m0", Name: "M0", Dependencies: []string{"m1"}},
		{ID: "m1", Name: "M1", Dependencies: []string{"m0"}},
	}

	_, err := OrderMilestones(milestones)
	if err == nil {
		t.Fatal("expected circular dependency error, got nil")
	}

	if err.Error() != "circular dependency detected in milestones" {
		t.Errorf("expected circular dependency error, got: %v", err)
	}
}

func TestOrderTasks_Linear(t *testing.T) {
	tasks := []Task{
		{ID: "m0-001", Name: "Task 1", Dependencies: []string{}},
		{ID: "m0-002", Name: "Task 2", Dependencies: []string{"m0-001"}},
		{ID: "m0-003", Name: "Task 3", Dependencies: []string{"m0-002"}},
	}

	levels, err := OrderTasks(tasks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(levels))
	}

	// Level 0 should have m0-001
	if len(levels[0]) != 1 || levels[0][0].ID != "m0-001" {
		t.Errorf("level 0: expected [m0-001], got %v", getTaskIDs(levels[0]))
	}

	// Level 1 should have m0-002
	if len(levels[1]) != 1 || levels[1][0].ID != "m0-002" {
		t.Errorf("level 1: expected [m0-002], got %v", getTaskIDs(levels[1]))
	}

	// Level 2 should have m0-003
	if len(levels[2]) != 1 || levels[2][0].ID != "m0-003" {
		t.Errorf("level 2: expected [m0-003], got %v", getTaskIDs(levels[2]))
	}
}

func TestOrderTasks_Diamond(t *testing.T) {
	tasks := []Task{
		{ID: "m0-001", Name: "Task 1", Dependencies: []string{}},
		{ID: "m0-002", Name: "Task 2", Dependencies: []string{"m0-001"}},
		{ID: "m0-003", Name: "Task 3", Dependencies: []string{"m0-001"}},
		{ID: "m0-004", Name: "Task 4", Dependencies: []string{"m0-002", "m0-003"}},
	}

	levels, err := OrderTasks(tasks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(levels))
	}

	// Level 0 should have m0-001
	if len(levels[0]) != 1 || levels[0][0].ID != "m0-001" {
		t.Errorf("level 0: expected [m0-001], got %v", getTaskIDs(levels[0]))
	}

	// Level 1 should have m0-002 and m0-003 (parallel)
	if len(levels[1]) != 2 {
		t.Errorf("level 1: expected 2 tasks, got %d", len(levels[1]))
	}
	level1IDs := getTaskIDs(levels[1])
	if !containsString(level1IDs, "m0-002") || !contains(level1IDs, "m0-003") {
		t.Errorf("level 1: expected [m0-002, m0-003] in any order, got %v", level1IDs)
	}

	// Level 2 should have m0-004
	if len(levels[2]) != 1 || levels[2][0].ID != "m0-004" {
		t.Errorf("level 2: expected [m0-004], got %v", getTaskIDs(levels[2]))
	}
}

func TestOrderTasks_NoDeps(t *testing.T) {
	tasks := []Task{
		{ID: "m0-001", Name: "Task 1", Dependencies: []string{}},
		{ID: "m0-002", Name: "Task 2", Dependencies: []string{}},
		{ID: "m0-003", Name: "Task 3", Dependencies: []string{}},
	}

	levels, err := OrderTasks(tasks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(levels) != 1 {
		t.Fatalf("expected 1 level, got %d", len(levels))
	}

	// Level 0 should have all three tasks
	if len(levels[0]) != 3 {
		t.Errorf("level 0: expected 3 tasks, got %d", len(levels[0]))
	}
	level0IDs := getTaskIDs(levels[0])
	if !containsString(level0IDs, "m0-001") || !contains(level0IDs, "m0-002") || !contains(level0IDs, "m0-003") {
		t.Errorf("level 0: expected [m0-001, m0-002, m0-003] in any order, got %v", level0IDs)
	}
}

func TestOrderTasks_Circular(t *testing.T) {
	tasks := []Task{
		{ID: "m0-001", Name: "Task 1", Dependencies: []string{"m0-002"}},
		{ID: "m0-002", Name: "Task 2", Dependencies: []string{"m0-001"}},
	}

	_, err := OrderTasks(tasks)
	if err == nil {
		t.Fatal("expected circular dependency error, got nil")
	}

	if err.Error() != "circular dependency detected in tasks" {
		t.Errorf("expected circular dependency error, got: %v", err)
	}
}

// Helper functions
func getIDs(milestones []Milestone) []string {
	ids := make([]string, len(milestones))
	for i, m := range milestones {
		ids[i] = m.ID
	}
	return ids
}

func getTaskIDs(tasks []Task) []string {
	ids := make([]string, len(tasks))
	for i, t := range tasks {
		ids[i] = t.ID
	}
	return ids
}

func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
