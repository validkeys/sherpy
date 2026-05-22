package main

import (
	"fmt"
	"os"

	"github.com/kydavis/sherpy/jira"
	"github.com/spf13/cobra"
)

func NewRootCmd() *cobra.Command {
	var globalConfig string

	root := &cobra.Command{
		Use:   "sherpy-to-jira",
		Short: "Push Sherpy plans to Jira",
	}

	root.Flags().StringVar(&globalConfig, "global-config", "", "path to global config file")

	root.AddCommand(newInitCmd())
	root.AddCommand(newSetupCmd())
	root.AddCommand(newSyncCmd())
	root.AddCommand(newStatusCmd())

	return root
}

func newInitCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init",
		Short: "Discover sherpy source documents and generate sherpy-jira.yaml",
		RunE: func(cmd *cobra.Command, args []string) error {
			return jira.RunInit(".")
		},
	}
}

func newSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "setup",
		Short: "Create Jira project and discover issue type IDs",
		RunE: func(cmd *cobra.Command, args []string) error {
			globalConfig, _ := cmd.Flags().GetString("global-config")
			return jira.RunSetup(".", globalConfig)
		},
	}
}

func newSyncCmd() *cobra.Command {
	var dryRun bool

	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Push sherpy source documents to Jira",
		RunE: func(cmd *cobra.Command, args []string) error {
			globalConfig, _ := cmd.Flags().GetString("global-config")
			return jira.RunSyncCommand(".", globalConfig, dryRun)
		},
	}

	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "show what would be synced without making changes")

	return cmd
}

func newStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show sync state summary",
		RunE: func(cmd *cobra.Command, args []string) error {
			return jira.RunStatus(".")
		},
	}
}

func main() {
	root := NewRootCmd()
	if err := root.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
