package jira

import (
	"fmt"
	"path/filepath"
	"time"
)

// SyncResult holds the outcome of a sync operation.
type SyncResult struct {
	EpicsCreated    int
	EpicsUpdated    int
	EpicsSkipped    int
	StoriesCreated  int
	StoriesUpdated  int
	StoriesSkipped  int
	SubTasksCreated int
	SubTasksUpdated int
	SubTasksSkipped int
	LinksCreated    int
	LinksSkipped    int
	Errors          []SyncError
	DryRunPlan      []PlanEntry // populated only in dry-run mode
}

// SyncError represents an error that occurred during sync for a specific entity.
type SyncError struct {
	EntityID  string // e.g., "m0-001"
	Operation string // "create", "update", "link"
	Error     error
}

// DryRunResult holds the plan for a dry-run sync (no API calls made).
type DryRunResult struct {
	Plan   []PlanEntry
	Totals struct {
		Epics    int
		Stories  int
		SubTasks int
		Links    int
	}
}

// PlanEntry represents a single planned operation in a dry-run.
type PlanEntry struct {
	Operation string // "CREATE", "UPDATE", "LINK"
	Type      string // "Epic", "Story", "Sub-task"
	Key       string // Jira key ("SHERPY-?" for new issues, actual key for updates)
	Summary   string
	SP        int    // story points
	Labels    string // e.g., "[code]"
	Indent    int    // indentation level (0=Epic, 1=Story, 2=Sub-task/Link)
}

// ProgressCallback is called during sync to report progress.
type ProgressCallback func(message string)

// RunSync performs the main sync operation: loads source documents, computes
// changes, and creates/updates Jira issues. The client is injected for testability.
// The progress callback can be nil.
func RunSync(client *JiraClient, localCfg *LocalConfig, globalCfg *GlobalConfig, dryRun bool, progress ProgressCallback) (*SyncResult, error) {
	// Load all source documents
	devSummary, err := ParseDeveloperSummary(filepath.Join(".", localCfg.DeveloperSummary))
	if err != nil {
		return nil, fmt.Errorf("failed to parse developer summary: %w", err)
	}

	milestones, err := ParseMilestones(filepath.Join(".", localCfg.Milestones))
	if err != nil {
		return nil, fmt.Errorf("failed to parse milestones: %w", err)
	}

	tasks, err := ParseTasksDir(filepath.Join(".", localCfg.TasksDir))
	if err != nil {
		return nil, fmt.Errorf("failed to parse tasks: %w", err)
	}

	// Parse timeline if configured
	var timeline map[string]string
	if localCfg.Timeline != "" {
		timeline, err = ParseTimeline(filepath.Join(".", localCfg.Timeline))
		if err != nil {
			return nil, fmt.Errorf("failed to parse timeline: %w", err)
		}
	}

	// Load or create sync state
	syncStatePath := localCfg.SyncState
	if !filepath.IsAbs(syncStatePath) {
		syncStatePath = filepath.Join(".", syncStatePath)
	}
	state, err := LoadSyncState(syncStatePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load sync state: %w", err)
	}
	if state == nil {
		state = &SyncState{
			ProjectKey: localCfg.ProjectKey,
			ProjectID:  "", // will be set after Epic creation
			Milestones: make(map[string]SyncEntry),
			Tasks:      make(map[string]SyncEntry),
			Links:      []LinkEntry{},
		}
	}

	// Compute content hashes for all entities
	devSummaryHash := HashDeveloperSummary(devSummary)
	milestoneHashes := make(map[string]string)
	for _, m := range milestones.Milestones {
		milestoneHashes[m.ID] = HashMilestone(&m)
	}
	taskHashes := make(map[string]string)
	for _, taskList := range tasks {
		for _, t := range taskList {
			taskHashes[t.ID] = HashTask(&t)
		}
	}

	// Determine create/update/skip for each entity
	epicOp := determineOperation(state.Epic.JiraKey, state.Epic.ContentHash, devSummaryHash)
	milestoneOps := make(map[string]string)
	for _, m := range milestones.Milestones {
		entry, exists := state.Milestones[m.ID]
		milestoneOps[m.ID] = determineOperation(entry.JiraKey, entry.ContentHash, milestoneHashes[m.ID])
		_ = exists // unused for now
	}
	taskOps := make(map[string]string)
	for _, taskList := range tasks {
		for _, t := range taskList {
			entry, exists := state.Tasks[t.ID]
			taskOps[t.ID] = determineOperation(entry.JiraKey, entry.ContentHash, taskHashes[t.ID])
			_ = exists // unused for now
		}
	}

	// If dry run: build and return DryRunResult
	if dryRun {
		dryResult := &DryRunResult{
			Plan: []PlanEntry{},
		}

		// Epic
		if epicOp != "skip" {
			dryResult.Plan = append(dryResult.Plan, PlanEntry{
				Operation: epicOp,
				Type:      "Epic",
				Key:       ifElse(state.Epic.JiraKey != "", state.Epic.JiraKey, "SHERPY-?"),
				Summary:   devSummary.Title,
				Indent:    0,
			})
			dryResult.Totals.Epics++
		}

		// Milestones
		for _, m := range milestones.Milestones {
			if milestoneOps[m.ID] != "skip" {
				entry := state.Milestones[m.ID]
				sp := DurationToStoryPoints(m.EstimatedDuration)
				dryResult.Plan = append(dryResult.Plan, PlanEntry{
					Operation: milestoneOps[m.ID],
					Type:      "Story",
					Key:       ifElse(entry.JiraKey != "", entry.JiraKey, "SHERPY-?"),
					Summary:   m.Name,
					SP:        sp,
					Indent:    1,
				})
				dryResult.Totals.Stories++
			}
		}

		// Tasks
		for _, taskList := range tasks {
			for _, t := range taskList {
				if taskOps[t.ID] != "skip" {
					entry := state.Tasks[t.ID]
					sp := MinutesToStoryPoints(t.EstimateMinutes)
					dryResult.Plan = append(dryResult.Plan, PlanEntry{
						Operation: taskOps[t.ID],
						Type:      "Sub-task",
						Key:       ifElse(entry.JiraKey != "", entry.JiraKey, "SHERPY-?"),
						Summary:   t.Name,
						SP:        sp,
						Labels:    fmt.Sprintf("[%s]", t.Type),
						Indent:    2,
					})
					dryResult.Totals.SubTasks++
				}
			}
		}

		// Convert DryRunResult to SyncResult for return
		result := &SyncResult{
			EpicsCreated:    dryResult.Totals.Epics,
			StoriesCreated:  dryResult.Totals.Stories,
			SubTasksCreated: dryResult.Totals.SubTasks,
			LinksCreated:    dryResult.Totals.Links,
			DryRunPlan:      dryResult.Plan,
		}
		return result, nil
	}

	// Execute creates and updates in order
	result := &SyncResult{}

	// Sync Epic first
	epicOp = determineOperation(state.Epic.JiraKey, state.Epic.ContentHash, devSummaryHash)
	if epicOp == "create" {
		if progress != nil {
			progress(FormatProgress(0, 0, "Epic", "Creating"))
		}
		if err := syncEpic(client, localCfg.ProjectKey, globalCfg, devSummary, state, dryRun); err != nil {
			result.Errors = append(result.Errors, SyncError{EntityID: "epic", Operation: "create", Error: err})
		} else {
			result.EpicsCreated++
			if !dryRun {
				if err := saveSyncState(state, syncStatePath); err != nil {
					return nil, fmt.Errorf("failed to save sync state after epic creation: %w", err)
				}
			}
		}
	} else if epicOp == "update" {
		if err := syncEpic(client, localCfg.ProjectKey, globalCfg, devSummary, state, dryRun); err != nil {
			result.Errors = append(result.Errors, SyncError{EntityID: "epic", Operation: "update", Error: err})
		} else {
			result.EpicsUpdated++
			if !dryRun {
				if err := saveSyncState(state, syncStatePath); err != nil {
					return nil, fmt.Errorf("failed to save sync state after epic update: %w", err)
				}
			}
		}
	} else {
		result.EpicsSkipped++
	}

	// Epic must exist before syncing Stories
	if state.Epic.JiraKey == "" {
		return nil, fmt.Errorf("epic must be created before syncing milestones")
	}

	// Order milestones by dependencies
	orderedMilestones, err := OrderMilestones(milestones.Milestones)
	if err != nil {
		return nil, fmt.Errorf("failed to order milestones: %w", err)
	}

	// Count total stories to create/update for progress reporting
	totalStories := 0
	for _, m := range milestones.Milestones {
		if milestoneOps[m.ID] != "skip" {
			totalStories++
		}
	}
	storyCounter := 0

	// Sync milestones level by level
	for _, level := range orderedMilestones {
		for _, m := range level {
			// Get due date from timeline if available
			dueDate := ""
			if timeline != nil {
				dueDate = timeline[m.ID]
			}

			op := milestoneOps[m.ID]
			if op == "create" {
				storyCounter++
				if progress != nil {
					progress(FormatProgress(storyCounter, totalStories, "Story", "Creating"))
				}
				if err := syncMilestone(client, localCfg.ProjectKey, state.Epic.JiraKey, globalCfg, &m, dueDate, state, dryRun); err != nil {
					result.Errors = append(result.Errors, SyncError{EntityID: m.ID, Operation: "create", Error: err})
				} else {
					result.StoriesCreated++
					if !dryRun {
						if err := saveSyncState(state, syncStatePath); err != nil {
							return nil, fmt.Errorf("failed to save sync state after milestone %s creation: %w", m.ID, err)
						}
					}
				}
			} else if op == "update" {
				storyCounter++
				if progress != nil {
					progress(FormatProgress(storyCounter, totalStories, "Story", "Updating"))
				}
				if err := syncMilestone(client, localCfg.ProjectKey, state.Epic.JiraKey, globalCfg, &m, dueDate, state, dryRun); err != nil {
					result.Errors = append(result.Errors, SyncError{EntityID: m.ID, Operation: "update", Error: err})
				} else {
					result.StoriesUpdated++
					if !dryRun {
						if err := saveSyncState(state, syncStatePath); err != nil {
							return nil, fmt.Errorf("failed to save sync state after milestone %s update: %w", m.ID, err)
						}
					}
				}
			} else {
				result.StoriesSkipped++
			}
		}
	}

	// Count total tasks to create/update for progress reporting
	totalTasks := 0
	for _, taskList := range tasks {
		for _, t := range taskList {
			if taskOps[t.ID] != "skip" {
				totalTasks++
			}
		}
	}
	taskCounter := 0

	// Sync tasks for each milestone
	for milestoneID, taskList := range tasks {
		// Get milestone's Story key
		milestoneEntry, exists := state.Milestones[milestoneID]
		if !exists || milestoneEntry.JiraKey == "" {
			return nil, fmt.Errorf("milestone %s must be synced before syncing its tasks", milestoneID)
		}

		// Order tasks by dependencies
		orderedTasks, err := OrderTasks(taskList)
		if err != nil {
			return nil, fmt.Errorf("failed to order tasks for milestone %s: %w", milestoneID, err)
		}

		// Sync tasks level by level
		for _, level := range orderedTasks {
			for _, t := range level {
				op := taskOps[t.ID]
				if op == "create" {
					taskCounter++
					if progress != nil {
						progress(FormatProgress(taskCounter, totalTasks, "Sub-task", "Creating"))
					}
					if err := syncTask(client, localCfg.ProjectKey, milestoneEntry.JiraKey, globalCfg, &t, state, dryRun); err != nil {
						result.Errors = append(result.Errors, SyncError{EntityID: t.ID, Operation: "create", Error: err})
					} else {
						result.SubTasksCreated++
						if !dryRun {
							if err := saveSyncState(state, syncStatePath); err != nil {
								return nil, fmt.Errorf("failed to save sync state after task %s creation: %w", t.ID, err)
							}
						}
					}
				} else if op == "update" {
					taskCounter++
					if progress != nil {
						progress(FormatProgress(taskCounter, totalTasks, "Sub-task", "Updating"))
					}
					if err := syncTask(client, localCfg.ProjectKey, milestoneEntry.JiraKey, globalCfg, &t, state, dryRun); err != nil {
						result.Errors = append(result.Errors, SyncError{EntityID: t.ID, Operation: "update", Error: err})
					} else {
						result.SubTasksUpdated++
						if !dryRun {
							if err := saveSyncState(state, syncStatePath); err != nil {
								return nil, fmt.Errorf("failed to save sync state after task %s update: %w", t.ID, err)
							}
						}
					}
				} else {
					result.SubTasksSkipped++
				}
			}
		}
	}

	// Create dependency links
	var allDeps []Dependency
	for _, m := range milestones.Milestones {
		for _, depID := range m.Dependencies {
			allDeps = append(allDeps, Dependency{
				OutwardID: m.ID,
				InwardID:  depID,
				Type:      "Blocks",
			})
		}
	}
	for _, taskList := range tasks {
		for _, t := range taskList {
			for _, depID := range t.Dependencies {
				allDeps = append(allDeps, Dependency{
					OutwardID: t.ID,
					InwardID:  depID,
					Type:      "Blocks",
				})
			}
		}
	}

	linksCreated, linkErrors := syncLinks(client, allDeps, state, dryRun, syncStatePath)
	result.LinksCreated = linksCreated
	result.LinksSkipped = len(allDeps) - linksCreated
	result.Errors = append(result.Errors, linkErrors...)

	return result, nil
}

// Dependency represents a dependency relationship between two entities.
type Dependency struct {
	OutwardID string // Blocks
	InwardID  string // Is blocked by
	Type      string // "Blocks"
}

// syncLinks creates Blocks links for dependencies.
func syncLinks(client *JiraClient, allDeps []Dependency, state *SyncState, dryRun bool, syncStatePath string) (int, []SyncError) {
	created := 0
	var errors []SyncError

	// Build map of existing links for quick lookup
	existingLinks := make(map[string]bool)
	for _, link := range state.Links {
		key := link.Outward + "->" + link.Inward + ":" + link.Type
		existingLinks[key] = true
	}

	for _, dep := range allDeps {
		// Resolve YAML IDs to Jira keys
		outwardKey := resolveJiraKey(dep.OutwardID, state)
		inwardKey := resolveJiraKey(dep.InwardID, state)

		if outwardKey == "" || inwardKey == "" {
			errors = append(errors, SyncError{
				EntityID:  dep.OutwardID,
				Operation: "link",
				Error:     fmt.Errorf("cannot resolve Jira key for %s or %s", dep.OutwardID, dep.InwardID),
			})
			continue
		}

		// Check if link already exists
		linkKey := outwardKey + "->" + inwardKey + ":" + dep.Type
		if existingLinks[linkKey] {
			continue
		}

		// Create link
		if !dryRun {
			req := &CreateLinkRequest{
				Type:         map[string]string{"name": dep.Type},
				OutwardIssue: map[string]string{"key": outwardKey},
				InwardIssue:  map[string]string{"key": inwardKey},
			}

			if err := client.CreateLink(req); err != nil {
				errors = append(errors, SyncError{
					EntityID:  dep.OutwardID,
					Operation: "link",
					Error:     err,
				})
				continue
			}

			// Add to state
			state.Links = append(state.Links, LinkEntry{
				Outward: outwardKey,
				Inward:  inwardKey,
				Type:    dep.Type,
			})

			// Save state after each link creation
			if err := saveSyncState(state, syncStatePath); err != nil {
				errors = append(errors, SyncError{
					EntityID:  dep.OutwardID,
					Operation: "link",
					Error:     fmt.Errorf("failed to save sync state: %w", err),
				})
			}
		}

		created++
	}

	return created, errors
}

// resolveJiraKey resolves a YAML ID to a Jira key using sync state.
func resolveJiraKey(yamlID string, state *SyncState) string {
	// Check epic
	if yamlID == "epic" {
		return state.Epic.JiraKey
	}

	// Check milestones
	if entry, exists := state.Milestones[yamlID]; exists {
		return entry.JiraKey
	}

	// Check tasks
	if entry, exists := state.Tasks[yamlID]; exists {
		return entry.JiraKey
	}

	return ""
}

// determineOperation returns "create", "update", or "skip" based on sync state.
func determineOperation(jiraKey, oldHash, newHash string) string {
	if jiraKey == "" {
		return "create"
	}
	if oldHash != newHash {
		return "update"
	}
	return "skip"
}

// ifElse is a helper for ternary-like logic.
func ifElse(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}

// saveSyncState saves the sync state to disk with updated timestamp.
func saveSyncState(state *SyncState, path string) error {
	state.LastSync = time.Now().Format(time.RFC3339)
	return SaveSyncState(state, path)
}

// syncEpic creates or updates the Epic issue from developer summary.
func syncEpic(client *JiraClient, projectKey string, globalCfg *GlobalConfig, summary *DeveloperSummary, state *SyncState, dryRun bool) error {
	// Compute hash
	newHash := HashDeveloperSummary(summary)

	// Check if skip
	if state.Epic.JiraKey != "" && state.Epic.ContentHash == newHash {
		// Skip: unchanged
		return nil
	}

	// Build ADF description
	adfBytes, err := BuildEpicDescription(summary)
	if err != nil {
		return fmt.Errorf("failed to build ADF: %w", err)
	}

	if state.Epic.JiraKey != "" {
		// Update existing Epic
		if dryRun {
			return nil
		}

		req := &UpdateIssueRequest{
			Fields: map[string]interface{}{
				"summary":     summary.Title,
				"description": adfBytes,
			},
		}

		if err := client.UpdateIssue(state.Epic.JiraKey, req); err != nil {
			return fmt.Errorf("failed to update epic: %w", err)
		}

		// Update hash
		state.Epic.ContentHash = newHash
	} else {
		// Create new Epic
		if dryRun {
			return nil
		}

		req := &CreateIssueRequest{
			Fields: CreateIssueFields{
				Project:     map[string]string{"key": projectKey},
				IssueType:   map[string]string{"id": globalCfg.Jira.IssueTypes.Epic},
				Summary:     summary.Title,
				Description: adfBytes,
				Labels:      []string{"sherpy-project"},
			},
		}

		resp, err := client.CreateIssue(req)
		if err != nil {
			return fmt.Errorf("failed to create epic: %w", err)
		}

		// Record in state
		state.Epic = SyncEntry{
			JiraKey:     resp.Key,
			JiraID:      resp.ID,
			ContentHash: newHash,
		}
		state.ProjectID = resp.ID
	}

	return nil
}

// syncMilestone creates or updates a Story issue from a milestone.
func syncMilestone(client *JiraClient, projectKey, epicKey string, globalCfg *GlobalConfig, milestone *Milestone, dueDate string, state *SyncState, dryRun bool) error {
	// Compute hash
	newHash := HashMilestone(milestone)

	// Check if skip
	entry, exists := state.Milestones[milestone.ID]
	if exists && entry.ContentHash == newHash {
		// Skip: unchanged
		return nil
	}

	// Build ADF description
	adfBytes, err := BuildMilestoneDescription(milestone)
	if err != nil {
		return fmt.Errorf("failed to build ADF: %w", err)
	}

	// Compute story points
	sp := DurationToStoryPoints(milestone.EstimatedDuration)

	if exists && entry.JiraKey != "" {
		// Update existing Story
		if dryRun {
			return nil
		}

		fields := map[string]interface{}{
			"summary":           milestone.Name,
			"description":       adfBytes,
			"customfield_10016": sp, // Story points
		}

		if dueDate != "" {
			fields["duedate"] = dueDate
		}

		req := &UpdateIssueRequest{Fields: fields}
		if err := client.UpdateIssue(entry.JiraKey, req); err != nil {
			return fmt.Errorf("failed to update milestone %s: %w", milestone.ID, err)
		}

		// Update hash
		entry.ContentHash = newHash
		state.Milestones[milestone.ID] = entry
	} else {
		// Create new Story
		if dryRun {
			return nil
		}

		// Build fields map with custom field for story points
		fieldsMap := map[string]interface{}{
			"project":           map[string]string{"key": projectKey},
			"parent":            map[string]string{"key": epicKey},
			"summary":           milestone.Name,
			"issuetype":         map[string]string{"id": globalCfg.Jira.IssueTypes.Story},
			"description":       adfBytes,
			"labels":            []string{fmt.Sprintf("milestone:%s", milestone.ID)},
			"customfield_10016": sp, // Story points
		}

		if dueDate != "" {
			fieldsMap["duedate"] = dueDate
		}

		// Use raw JSON API since we need custom fields
		reqMap := map[string]interface{}{"fields": fieldsMap}
		var resp CreateIssueResponse
		if err := client.post("/rest/api/3/issue", reqMap, &resp); err != nil {
			return fmt.Errorf("failed to create milestone %s: %w", milestone.ID, err)
		}

		// Record in state
		state.Milestones[milestone.ID] = SyncEntry{
			JiraKey:     resp.Key,
			JiraID:      resp.ID,
			ContentHash: newHash,
		}
	}

	return nil
}

// syncTask creates or updates a Sub-task issue from a task.
func syncTask(client *JiraClient, projectKey, milestoneStoryKey string, globalCfg *GlobalConfig, task *Task, state *SyncState, dryRun bool) error {
	// Compute hash
	newHash := HashTask(task)

	// Check if skip
	entry, exists := state.Tasks[task.ID]
	if exists && entry.ContentHash == newHash {
		// Skip: unchanged
		return nil
	}

	// Build ADF description
	adfBytes, err := BuildTaskDescription(task)
	if err != nil {
		return fmt.Errorf("failed to build ADF: %w", err)
	}

	// Compute story points
	sp := MinutesToStoryPoints(task.EstimateMinutes)

	if exists && entry.JiraKey != "" {
		// Update existing Sub-task
		if dryRun {
			return nil
		}

		fields := map[string]interface{}{
			"summary":           task.Name,
			"description":       adfBytes,
			"customfield_10016": sp, // Story points
		}

		req := &UpdateIssueRequest{Fields: fields}
		if err := client.UpdateIssue(entry.JiraKey, req); err != nil {
			return fmt.Errorf("failed to update task %s: %w", task.ID, err)
		}

		// Update hash
		entry.ContentHash = newHash
		state.Tasks[task.ID] = entry
	} else {
		// Create new Sub-task
		if dryRun {
			return nil
		}

		// Build fields map with custom field for story points
		fieldsMap := map[string]interface{}{
			"project":           map[string]string{"key": projectKey},
			"parent":            map[string]string{"key": milestoneStoryKey}, // Parent is the Story, NOT the Epic
			"summary":           task.Name,
			"issuetype":         map[string]string{"id": globalCfg.Jira.IssueTypes.SubTask},
			"description":       adfBytes,
			"labels":            []string{task.Type},
			"customfield_10016": sp, // Story points
		}

		// Use raw JSON API since we need custom fields
		reqMap := map[string]interface{}{"fields": fieldsMap}
		var resp CreateIssueResponse
		if err := client.post("/rest/api/3/issue", reqMap, &resp); err != nil {
			return fmt.Errorf("failed to create task %s: %w", task.ID, err)
		}

		// Record in state
		state.Tasks[task.ID] = SyncEntry{
			JiraKey:     resp.Key,
			JiraID:      resp.ID,
			ContentHash: newHash,
		}
	}

	return nil
}
