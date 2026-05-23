package jira

import (
	"fmt"
	"strings"
)

// EnhanceError wraps an error with actionable suggestions based on the error type.
func EnhanceError(err error, context string) error {
	if err == nil {
		return nil
	}

	errStr := err.Error()
	suggestion := ""

	// Auth errors
	if strings.Contains(errStr, "401") || strings.Contains(errStr, "Unauthorized") {
		suggestion = "\n\n💡 Authentication failed. Please check:\n" +
			"   • JIRA_EMAIL is set to your Atlassian account email\n" +
			"   • JIRA_TOKEN is a valid API token from https://id.atlassian.com/manage-profile/security/api-tokens\n" +
			"   • Your token hasn't expired or been revoked"
	}

	// Rate limit errors
	if strings.Contains(errStr, "429") || strings.Contains(errStr, "rate limit") {
		suggestion = "\n\n💡 Rate limit exceeded. The tool will automatically retry with backoff.\n" +
			"   If this persists, wait a few minutes before running again."
	}

	// Network errors
	if strings.Contains(errStr, "connection refused") || strings.Contains(errStr, "no such host") {
		suggestion = "\n\n💡 Network error. Please check:\n" +
			"   • Your internet connection is working\n" +
			"   • The Jira domain in ~/.sherpy-jira-global.yaml is correct\n" +
			"   • Your firewall/proxy isn't blocking Jira API access"
	}

	// Timeout errors
	if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "deadline exceeded") {
		suggestion = "\n\n💡 Request timed out. This usually means:\n" +
			"   • Jira is slow or overloaded - try again in a moment\n" +
			"   • Large sync operation - consider syncing smaller batches"
	}

	// Permission errors
	if strings.Contains(errStr, "403") || strings.Contains(errStr, "Forbidden") {
		suggestion = "\n\n💡 Permission denied. Please check:\n" +
			"   • Your Jira account has permission to create/edit issues in this project\n" +
			"   • The project key in sherpy-jira.yaml is correct\n" +
			"   • You have admin access if creating new projects"
	}

	// Not found errors
	if strings.Contains(errStr, "404") || strings.Contains(errStr, "not found") {
		suggestion = "\n\n💡 Resource not found. Please check:\n" +
			"   • The Jira project exists and you have access to it\n" +
			"   • Issue type IDs in global config are valid for your Jira instance\n" +
			"   • Run 'sherpy-to-jira setup' if issue types have changed"
	}

	// Bad request errors (field validation)
	if strings.Contains(errStr, "400") || strings.Contains(errStr, "Bad Request") {
		if strings.Contains(errStr, "customfield") || strings.Contains(errStr, "story points") {
			suggestion = "\n\n💡 Story points field error. Please check:\n" +
				"   • Your Jira project has story points enabled\n" +
				"   • The customfield_10016 ID is correct for your instance\n" +
				"   • The field accepts numeric values"
		} else {
			suggestion = "\n\n💡 Invalid request. This usually means:\n" +
				"   • A required field is missing or has an invalid value\n" +
				"   • The issue type configuration doesn't match expectations\n" +
				"   • Run 'sherpy-to-jira setup' to refresh configuration"
		}
	}

	// Missing config errors
	if strings.Contains(errStr, "sherpy-jira.yaml") && strings.Contains(errStr, "no such file") {
		suggestion = "\n\n💡 Local config not found. Run:\n   sherpy-to-jira init"
	}

	if strings.Contains(errStr, "sherpy-jira-global.yaml") || (strings.Contains(errStr, "global config") && strings.Contains(errStr, "no such file")) {
		suggestion = "\n\n💡 Global config not found. Run:\n   sherpy-to-jira setup"
	}

	// Environment variable errors
	if strings.Contains(errStr, "JIRA_EMAIL") || strings.Contains(errStr, "JIRA_TOKEN") {
		suggestion = "\n\n💡 Missing credentials. Set environment variables:\n" +
			"   export JIRA_EMAIL='your-email@example.com'\n" +
			"   export JIRA_TOKEN='your-api-token'\n" +
			"   Get a token from: https://id.atlassian.com/manage-profile/security/api-tokens"
	}

	// Missing source files
	if strings.Contains(errStr, "developer-summary") || strings.Contains(errStr, "milestones.yaml") {
		suggestion = "\n\n💡 Source file missing. Please check:\n" +
			"   • You're in a directory with Sherpy planning files\n" +
			"   • The paths in sherpy-jira.yaml are correct\n" +
			"   • Run 'sherpy-to-jira init' to update file paths"
	}

	if suggestion != "" {
		return fmt.Errorf("%s: %w%s", context, err, suggestion)
	}

	return fmt.Errorf("%s: %w", context, err)
}

// WrapNetworkError wraps network-related errors with retry suggestions.
func WrapNetworkError(err error, operation string) error {
	if err == nil {
		return nil
	}
	return EnhanceError(err, fmt.Sprintf("network error during %s", operation))
}

// WrapAuthError wraps authentication errors with credential setup guidance.
func WrapAuthError(err error) error {
	if err == nil {
		return nil
	}
	return EnhanceError(err, "authentication error")
}

// WrapConfigError wraps config-related errors with setup guidance.
func WrapConfigError(err error, configType string) error {
	if err == nil {
		return nil
	}
	return EnhanceError(err, fmt.Sprintf("%s configuration error", configType))
}
