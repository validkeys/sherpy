package jira

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// JiraClient handles HTTP communication with Jira REST API v3.
type JiraClient struct {
	domain      string
	email       string
	token       string
	httpClient  *http.Client
	rateLimiter chan struct{}
}

// NewJiraClient creates a new Jira API client with rate limiting.
func NewJiraClient(domain, email, token string) *JiraClient {
	// Create rate limiter: buffered channel with 5 tokens
	rateLimiter := make(chan struct{}, 5)

	// Fill initial tokens
	for i := 0; i < 5; i++ {
		rateLimiter <- struct{}{}
	}

	// Refill tokens at 5 per second
	go func() {
		ticker := time.NewTicker(200 * time.Millisecond) // 5 per second = 1 per 200ms
		defer ticker.Stop()
		for range ticker.C {
			select {
			case rateLimiter <- struct{}{}:
			default:
				// Channel full, skip
			}
		}
	}()

	return &JiraClient{
		domain:      domain,
		email:       email,
		token:       token,
		httpClient:  &http.Client{Timeout: 30 * time.Second},
		rateLimiter: rateLimiter,
	}
}

// doRequest executes an HTTP request with auth, rate limiting, and retry logic.
func (c *JiraClient) doRequest(method, path string, body interface{}) (*http.Response, error) {
	// Wait for rate limiter token
	<-c.rateLimiter

	// Construct full URL
	url := c.domain + path

	// Marshal body if present
	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	// Create request
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	auth := base64.StdEncoding.EncodeToString([]byte(c.email + ":" + c.token))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// Execute request with retry logic
	maxRetries := 3
	for attempt := 0; attempt <= maxRetries; attempt++ {
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("request failed: %w", err)
		}

		// Handle 429 Too Many Requests
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := resp.Header.Get("Retry-After")
			if retryAfter != "" {
				seconds, err := strconv.Atoi(retryAfter)
				if err == nil {
					resp.Body.Close()
					time.Sleep(time.Duration(seconds) * time.Second)

					// Recreate request body for retry
					if body != nil {
						bodyBytes, _ := json.Marshal(body)
						bodyReader = bytes.NewReader(bodyBytes)
						req.Body = io.NopCloser(bodyReader)
					}

					continue
				}
			}
			resp.Body.Close()
			return nil, fmt.Errorf("rate limited (429) without valid Retry-After header")
		}

		// Handle 5xx errors with exponential backoff
		if resp.StatusCode >= 500 && resp.StatusCode < 600 {
			resp.Body.Close()
			if attempt < maxRetries {
				// Exponential backoff: 1s, 2s, 4s
				backoff := time.Duration(1<<attempt) * time.Second
				time.Sleep(backoff)

				// Recreate request body for retry
				if body != nil {
					bodyBytes, _ := json.Marshal(body)
					bodyReader = bytes.NewReader(bodyBytes)
					req.Body = io.NopCloser(bodyReader)
				}

				continue
			}
			return nil, fmt.Errorf("server error after %d retries: %d", maxRetries, resp.StatusCode)
		}

		// Success or non-retryable error
		return resp, nil
	}

	return nil, fmt.Errorf("max retries exceeded")
}

// get performs a GET request and unmarshals the response into result.
func (c *JiraClient) get(path string, result interface{}) error {
	resp, err := c.doRequest(http.MethodGet, path, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GET %s failed with status %d: %s", path, resp.StatusCode, string(body))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// post performs a POST request and unmarshals the response into result.
func (c *JiraClient) post(path string, body, result interface{}) error {
	resp, err := c.doRequest(http.MethodPost, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("POST %s failed with status %d: %s", path, resp.StatusCode, string(bodyBytes))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// put performs a PUT request.
func (c *JiraClient) put(path string, body interface{}) error {
	resp, err := c.doRequest(http.MethodPut, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("PUT %s failed with status %d: %s", path, resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// Jira API types

// CreateProjectRequest represents a Jira project creation request.
type CreateProjectRequest struct {
	Key                 string `json:"key"`
	Name                string `json:"name"`
	ProjectTypeKey      string `json:"projectTypeKey"`
	ProjectTemplateKey  string `json:"projectTemplateKey"`
	LeadAccountID       string `json:"leadAccountId"`
	AssigneeType        string `json:"assigneeType"`
}

// CreateProjectResponse represents a Jira project creation response.
type CreateProjectResponse struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Self string `json:"self"`
}

// CreateMetaResponse represents the response from /issue/createmeta.
type CreateMetaResponse struct {
	Projects []struct {
		IssueTypes []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"issuetypes"`
	} `json:"projects"`
}

// CreateIssueRequest represents a Jira issue creation request.
type CreateIssueRequest struct {
	Fields CreateIssueFields `json:"fields"`
}

type CreateIssueFields struct {
	Project     map[string]string `json:"project"`
	IssueType   map[string]string `json:"issuetype"`
	Parent      map[string]string `json:"parent,omitempty"`
	Summary     string            `json:"summary"`
	Description interface{}       `json:"description,omitempty"`
	Labels      []string          `json:"labels,omitempty"`
	DueDate     string            `json:"duedate,omitempty"`
}

// CreateIssueResponse represents a Jira issue creation response.
type CreateIssueResponse struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Self string `json:"self"`
}

// UpdateIssueRequest represents a Jira issue update request.
type UpdateIssueRequest struct {
	Fields map[string]interface{} `json:"fields"`
}

// CreateLinkRequest represents a Jira issue link creation request.
type CreateLinkRequest struct {
	Type          map[string]string `json:"type"`
	InwardIssue   map[string]string `json:"inwardIssue"`
	OutwardIssue  map[string]string `json:"outwardIssue"`
}

// Jira API methods

// GetSelf retrieves the current user's account information.
func (c *JiraClient) GetSelf() (accountID string, err error) {
	var result struct {
		AccountID string `json:"accountId"`
	}

	if err := c.get("/rest/api/3/myself", &result); err != nil {
		return "", fmt.Errorf("failed to get user info: %w", err)
	}

	return result.AccountID, nil
}

// CreateProject creates a new Jira project.
func (c *JiraClient) CreateProject(key, name, leadAccountID string) (*CreateProjectResponse, error) {
	req := CreateProjectRequest{
		Key:                key,
		Name:               name,
		ProjectTypeKey:     "software",
		ProjectTemplateKey: "com.pyxis.greenhopper.jira:gh-kanban-template",
		LeadAccountID:      leadAccountID,
		AssigneeType:       "PROJECT_LEAD",
	}

	var resp CreateProjectResponse
	if err := c.post("/rest/api/3/project", req, &resp); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return &resp, nil
}

// GetCreateMeta discovers issue type IDs for a project.
func (c *JiraClient) GetCreateMeta(projectKey string) (epicID, storyID, subTaskID string, err error) {
	path := fmt.Sprintf("/rest/api/3/issue/createmeta?projectKeys=%s&expand=projects.issuetypes", projectKey)

	var resp CreateMetaResponse
	if err := c.get(path, &resp); err != nil {
		return "", "", "", fmt.Errorf("failed to get create meta: %w", err)
	}

	if len(resp.Projects) == 0 {
		return "", "", "", fmt.Errorf("no projects found in createmeta response")
	}

	issueTypes := resp.Projects[0].IssueTypes
	for _, it := range issueTypes {
		switch it.Name {
		case "Epic":
			epicID = it.ID
		case "Story":
			storyID = it.ID
		case "Sub-task":
			subTaskID = it.ID
		}
	}

	if epicID == "" || storyID == "" || subTaskID == "" {
		return "", "", "", fmt.Errorf("missing required issue types (Epic=%s, Story=%s, Sub-task=%s)", epicID, storyID, subTaskID)
	}

	return epicID, storyID, subTaskID, nil
}

// CreateIssue creates a new Jira issue.
func (c *JiraClient) CreateIssue(req *CreateIssueRequest) (*CreateIssueResponse, error) {
	var resp CreateIssueResponse
	if err := c.post("/rest/api/3/issue", req, &resp); err != nil {
		return nil, fmt.Errorf("failed to create issue: %w", err)
	}

	return &resp, nil
}

// UpdateIssue updates an existing Jira issue.
func (c *JiraClient) UpdateIssue(key string, req *UpdateIssueRequest) error {
	path := fmt.Sprintf("/rest/api/3/issue/%s", key)
	if err := c.put(path, req); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	return nil
}

// CreateLink creates a link between two Jira issues.
func (c *JiraClient) CreateLink(req *CreateLinkRequest) error {
	if err := c.post("/rest/api/3/issueLink", req, nil); err != nil {
		return fmt.Errorf("failed to create link: %w", err)
	}

	return nil
}
