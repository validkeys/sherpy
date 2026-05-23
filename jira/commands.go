package jira

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// RunInit discovers sherpy source documents and generates sherpy-jira.yaml.
// Returns an error if the config already exists or required files are missing.
func RunInit(root string) error {
	// Check if sherpy-jira.yaml already exists
	configPath := filepath.Join(root, "sherpy-jira.yaml")
	if _, err := os.Stat(configPath); err == nil {
		return fmt.Errorf("sherpy-jira.yaml already exists (use --force to overwrite)")
	}

	// Discover sherpy files
	result, err := DiscoverFiles(root)
	if err != nil {
		return fmt.Errorf("failed to discover files: %w", err)
	}

	// Extract project name and generate project key from developer-summary.md
	projectName, projectKey, err := extractProjectInfo(filepath.Join(root, result.DeveloperSummary))
	if err != nil {
		// Non-fatal: we can proceed with empty project name/key
		projectName = ""
		projectKey = ""
	}

	// Build LocalConfig
	cfg := &LocalConfig{
		ProjectKey:       projectKey,
		ProjectName:      projectName,
		DeveloperSummary: result.DeveloperSummary,
		Milestones:       result.Milestones,
		TasksDir:         result.TasksDir,
		Timeline:         result.Timeline,
		SyncState:        "sherpy-jira-sync-state.yaml",
	}

	// Save config
	if err := SaveLocalConfig(cfg, configPath); err != nil {
		return fmt.Errorf("failed to save config: %w", err)
	}

	// Print success summary
	fmt.Println("✓ Created sherpy-jira.yaml")
	fmt.Printf("  Developer Summary: %s\n", cfg.DeveloperSummary)
	fmt.Printf("  Milestones:        %s\n", cfg.Milestones)
	fmt.Printf("  Tasks Directory:   %s\n", cfg.TasksDir)
	if cfg.Timeline != "" {
		fmt.Printf("  Timeline:          %s\n", cfg.Timeline)
	}
	if cfg.ProjectName != "" {
		fmt.Printf("  Project Name:      %s\n", cfg.ProjectName)
		fmt.Printf("  Project Key:       %s\n", cfg.ProjectKey)
	}

	// Print warnings
	for _, warning := range result.Warnings {
		fmt.Printf("  ⚠ %s\n", warning)
	}

	return nil
}

// extractProjectInfo reads developer-summary.md and extracts project name and key.
// Looks for patterns like "# Project: My Project Name" or "# My Project Name".
// Returns (projectName, projectKey, error).
func extractProjectInfo(path string) (string, string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	projectNameRegex := regexp.MustCompile(`^#\s+(?:Project:\s+)?(.+)$`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := projectNameRegex.FindStringSubmatch(line); len(matches) > 1 {
			projectName := strings.TrimSpace(matches[1])
			projectKey := generateProjectKey(projectName)
			return projectName, projectKey, nil
		}
	}

	if err := scanner.Err(); err != nil {
		return "", "", err
	}

	return "", "", fmt.Errorf("no project name found in developer-summary.md")
}

// generateProjectKey creates a Jira-style project key from a project name.
// Takes the first letter of each word (up to 4 letters) and uppercases them.
// Example: "My Test Project" -> "MTP"
func generateProjectKey(projectName string) string {
	words := strings.Fields(projectName)
	var key strings.Builder

	count := 0
	for _, word := range words {
		if count >= 4 {
			break
		}
		// Skip common articles and prepositions
		lowerWord := strings.ToLower(word)
		if lowerWord == "the" || lowerWord == "a" || lowerWord == "an" || lowerWord == "of" || lowerWord == "for" {
			continue
		}
		if len(word) > 0 {
			key.WriteString(strings.ToUpper(string(word[0])))
			count++
		}
	}

	if key.Len() == 0 {
		return "PROJ"
	}

	return key.String()
}

// RunSetup implements the setup command that creates a Jira project and discovers issue types.
// workingDir is the directory containing sherpy-jira.yaml.
// globalConfigPath is the path to the global config file (empty string uses default).
func RunSetup(workingDir, globalConfigPath string) error {
	// Load local config
	localConfigPath := filepath.Join(workingDir, "sherpy-jira.yaml")
	localCfg, err := LoadLocalConfig(localConfigPath)
	if err != nil {
		return fmt.Errorf("failed to load sherpy-jira.yaml: %w (run 'sherpy-to-jira init' first)", err)
	}

	// Verify env vars
	email := os.Getenv("JIRA_EMAIL")
	token := os.Getenv("JIRA_TOKEN")
	if email == "" || token == "" {
		return fmt.Errorf("JIRA_EMAIL and JIRA_TOKEN environment variables must be set")
	}

	// Determine global config path
	if globalConfigPath == "" {
		globalConfigPath = GlobalConfigPath()
	}

	// Load existing global config or create new
	globalCfg, err := LoadGlobalConfig(globalConfigPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to load global config: %w", err)
	}
	if globalCfg == nil {
		globalCfg = &GlobalConfig{}
	}

	// Prompt for Jira domain if not set
	domain := globalCfg.Jira.Domain
	if domain == "" {
		fmt.Print("Jira domain (e.g., mycompany.atlassian.net): ")
		fmt.Scanln(&domain)
		if domain == "" {
			return fmt.Errorf("domain cannot be empty")
		}
		// Ensure domain has https:// prefix
		if !strings.HasPrefix(domain, "http://") && !strings.HasPrefix(domain, "https://") {
			domain = "https://" + domain
		}
	}

	// Create Jira client
	client := NewJiraClient(domain, email, token)

	// Test connection and get account ID
	fmt.Println("Testing connection to Jira...")
	accountID, err := client.GetSelf()
	if err != nil {
		return WrapAuthError(err)
	}
	fmt.Printf("✓ Connected as account ID: %s\n", accountID)

	// Prompt for project key if not set
	projectKey := localCfg.ProjectKey
	if projectKey == "" {
		fmt.Print("Project key (e.g., SHERPY): ")
		fmt.Scanln(&projectKey)
		if projectKey == "" {
			return fmt.Errorf("project key cannot be empty")
		}
	}

	// Prompt for project name if not set
	projectName := localCfg.ProjectName
	if projectName == "" {
		fmt.Print("Project name (e.g., Sherpy PM): ")
		// Read full line (may contain spaces)
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			projectName = scanner.Text()
		}
		if projectName == "" {
			return fmt.Errorf("project name cannot be empty")
		}
	}

	// Create project
	fmt.Printf("Creating Jira project '%s' (%s)...\n", projectName, projectKey)
	projectResp, err := client.CreateProject(projectKey, projectName, accountID)
	if err != nil {
		// Check if project already exists (non-fatal)
		if strings.Contains(err.Error(), "400") {
			fmt.Printf("⚠ Project may already exist: %v\n", err)
			fmt.Println("Continuing with setup...")
		} else {
			return fmt.Errorf("failed to create project: %w", err)
		}
	} else {
		fmt.Printf("✓ Created project: %s (ID: %s)\n", projectResp.Key, projectResp.ID)
	}

	// Discover issue types
	fmt.Println("Discovering issue types...")
	epicID, storyID, subTaskID, err := client.GetCreateMeta(projectKey)
	if err != nil {
		return EnhanceError(err, "failed to discover issue types")
	}
	fmt.Printf("✓ Discovered issue types:\n")
	fmt.Printf("  Epic:     %s\n", epicID)
	fmt.Printf("  Story:    %s\n", storyID)
	fmt.Printf("  Sub-task: %s\n", subTaskID)

	// Update global config
	globalCfg.Jira.Domain = domain
	globalCfg.Jira.IssueTypes.Epic = epicID
	globalCfg.Jira.IssueTypes.Story = storyID
	globalCfg.Jira.IssueTypes.SubTask = subTaskID

	if err := SaveGlobalConfig(globalCfg, globalConfigPath); err != nil {
		return fmt.Errorf("failed to save global config: %w", err)
	}
	fmt.Printf("✓ Saved global config: %s\n", globalConfigPath)

	// Update local config
	localCfg.ProjectKey = projectKey
	localCfg.ProjectName = projectName
	if err := SaveLocalConfig(localCfg, localConfigPath); err != nil {
		return fmt.Errorf("failed to update local config: %w", err)
	}
	fmt.Printf("✓ Updated local config: %s\n", localConfigPath)

	fmt.Println("\n✓ Setup complete! Run 'sherpy-to-jira sync' to push your plan to Jira.")
	return nil
}

// RunSyncCommand implements the sync command that syncs Sherpy planning documents to Jira.
func RunSyncCommand(workingDir, globalConfigPath string, dryRun bool) error {
	// Load local config
	localConfigPath := filepath.Join(workingDir, "sherpy-jira.yaml")
	localCfg, err := LoadLocalConfig(localConfigPath)
	if err != nil {
		return WrapConfigError(err, "local")
	}

	// Determine global config path
	if globalConfigPath == "" {
		globalConfigPath = GlobalConfigPath()
	}

	// Load global config
	globalCfg, err := LoadGlobalConfig(globalConfigPath)
	if err != nil {
		return WrapConfigError(err, "global")
	}

	// Verify env vars
	email := os.Getenv("JIRA_EMAIL")
	token := os.Getenv("JIRA_TOKEN")
	if email == "" || token == "" {
		return EnhanceError(fmt.Errorf("JIRA_EMAIL and JIRA_TOKEN environment variables must be set"), "missing credentials")
	}

	// Create Jira client
	client := NewJiraClient(globalCfg.Jira.Domain, email, token)

	// Run sync with progress reporting
	progress := func(msg string) {
		if !dryRun {
			fmt.Println(msg)
		}
	}
	result, err := RunSync(client, localCfg, globalCfg, dryRun, progress)
	if err != nil {
		return EnhanceError(err, "sync failed")
	}

	// Print table view for dry-run, summary for real sync
	if dryRun && len(result.DryRunPlan) > 0 {
		fmt.Print(FormatDryRunTable(result.DryRunPlan))
	}

	// Print summary
	fmt.Print(FormatSyncSummary(result, dryRun))

	return nil
}

// RunStatus displays a summary of the current sync state.
func RunStatus(workingDir string) error {
	// Load local config
	localConfigPath := filepath.Join(workingDir, "sherpy-jira.yaml")
	localCfg, err := LoadLocalConfig(localConfigPath)
	if err != nil {
		return fmt.Errorf("failed to load sherpy-jira.yaml: %w", err)
	}

	// Load sync state
	syncStatePath := localCfg.SyncState
	if !filepath.IsAbs(syncStatePath) {
		syncStatePath = filepath.Join(workingDir, syncStatePath)
	}

	syncState, err := LoadSyncState(syncStatePath)
	if err != nil {
		return fmt.Errorf("failed to load sync state: %w", err)
	}

	if syncState == nil {
		fmt.Println("No sync state found. Run 'sherpy-to-jira sync' to push your plan to Jira.")
		return nil
	}

	// Print summary
	fmt.Printf("Project: %s (ID: %s)\n", syncState.ProjectKey, syncState.ProjectID)

	// Epic info
	if syncState.Epic.JiraKey != "" {
		fmt.Printf("Epic: %s\n", syncState.Epic.JiraKey)
	} else {
		fmt.Println("Epic: N/A")
	}

	// Last sync
	fmt.Printf("Last sync: %s\n", syncState.LastSync)

	// Milestones count
	fmt.Printf("Milestones synced: %d\n", len(syncState.Milestones))

	// Tasks count
	fmt.Printf("Tasks synced: %d\n", len(syncState.Tasks))

	// Links count
	fmt.Printf("Links created: %d\n", len(syncState.Links))

	return nil
}
