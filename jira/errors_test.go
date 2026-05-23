package jira

import (
	"errors"
	"strings"
	"testing"
)

func TestEnhanceError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		context        string
		wantSuggestion string
	}{
		{
			name:           "401 auth error",
			err:            errors.New("HTTP 401 Unauthorized"),
			context:        "test operation",
			wantSuggestion: "Authentication failed",
		},
		{
			name:           "429 rate limit",
			err:            errors.New("HTTP 429 Too Many Requests"),
			context:        "test operation",
			wantSuggestion: "Rate limit exceeded",
		},
		{
			name:           "network connection error",
			err:            errors.New("connection refused"),
			context:        "test operation",
			wantSuggestion: "Network error",
		},
		{
			name:           "timeout error",
			err:            errors.New("context deadline exceeded"),
			context:        "test operation",
			wantSuggestion: "Request timed out",
		},
		{
			name:           "403 permission error",
			err:            errors.New("HTTP 403 Forbidden"),
			context:        "test operation",
			wantSuggestion: "Permission denied",
		},
		{
			name:           "404 not found",
			err:            errors.New("HTTP 404 not found"),
			context:        "test operation",
			wantSuggestion: "Resource not found",
		},
		{
			name:           "400 story points field error",
			err:            errors.New("HTTP 400: customfield_10016 is invalid"),
			context:        "test operation",
			wantSuggestion: "Story points field error",
		},
		{
			name:           "400 generic bad request",
			err:            errors.New("HTTP 400 Bad Request"),
			context:        "test operation",
			wantSuggestion: "Invalid request",
		},
		{
			name:           "missing local config",
			err:            errors.New("failed to read sherpy-jira.yaml: no such file or directory"),
			context:        "test operation",
			wantSuggestion: "sherpy-to-jira init",
		},
		{
			name:           "missing global config",
			err:            errors.New("global config not found: sherpy-jira-global.yaml: no such file"),
			context:        "test operation",
			wantSuggestion: "sherpy-to-jira setup",
		},
		{
			name:           "missing env vars",
			err:            errors.New("JIRA_EMAIL and JIRA_TOKEN must be set"),
			context:        "test operation",
			wantSuggestion: "Missing credentials",
		},
		{
			name:           "missing source file",
			err:            errors.New("failed to parse developer-summary.md: no such file"),
			context:        "test operation",
			wantSuggestion: "Source file missing",
		},
		{
			name:           "generic error without suggestion",
			err:            errors.New("some other error"),
			context:        "test operation",
			wantSuggestion: "", // no suggestion expected
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			enhanced := EnhanceError(tt.err, tt.context)
			if enhanced == nil {
				t.Fatal("EnhanceError returned nil")
			}

			result := enhanced.Error()

			// Should include context
			if !strings.Contains(result, tt.context) {
				t.Errorf("Enhanced error missing context. Got: %s", result)
			}

			// Should include original error
			if !strings.Contains(result, tt.err.Error()) {
				t.Errorf("Enhanced error missing original error. Got: %s", result)
			}

			// Check for suggestion
			if tt.wantSuggestion != "" {
				if !strings.Contains(result, tt.wantSuggestion) {
					t.Errorf("Expected suggestion containing %q, got: %s", tt.wantSuggestion, result)
				}
				if !strings.Contains(result, "💡") {
					t.Errorf("Expected emoji in suggestion, got: %s", result)
				}
			}
		})
	}
}

func TestEnhanceError_Nil(t *testing.T) {
	result := EnhanceError(nil, "test")
	if result != nil {
		t.Errorf("EnhanceError(nil) should return nil, got: %v", result)
	}
}

func TestWrapNetworkError(t *testing.T) {
	err := errors.New("connection timeout")
	wrapped := WrapNetworkError(err, "creating issue")

	result := wrapped.Error()
	if !strings.Contains(result, "network error during creating issue") {
		t.Errorf("WrapNetworkError missing context, got: %s", result)
	}
}

func TestWrapAuthError(t *testing.T) {
	err := errors.New("401 Unauthorized")
	wrapped := WrapAuthError(err)

	result := wrapped.Error()
	if !strings.Contains(result, "authentication error") {
		t.Errorf("WrapAuthError missing context, got: %s", result)
	}
	if !strings.Contains(result, "JIRA_EMAIL") {
		t.Errorf("WrapAuthError missing auth suggestion, got: %s", result)
	}
}

func TestWrapConfigError(t *testing.T) {
	err := errors.New("file not found")
	wrapped := WrapConfigError(err, "local")

	result := wrapped.Error()
	if !strings.Contains(result, "local configuration error") {
		t.Errorf("WrapConfigError missing context, got: %s", result)
	}
}

func TestWrapHelpers_Nil(t *testing.T) {
	if WrapNetworkError(nil, "test") != nil {
		t.Error("WrapNetworkError(nil) should return nil")
	}
	if WrapAuthError(nil) != nil {
		t.Error("WrapAuthError(nil) should return nil")
	}
	if WrapConfigError(nil, "test") != nil {
		t.Error("WrapConfigError(nil) should return nil")
	}
}
