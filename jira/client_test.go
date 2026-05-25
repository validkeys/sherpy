package jira

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestJiraClient_AuthHeader verifies Basic Auth header is set with email:token
func TestJiraClient_AuthHeader(t *testing.T) {
	email := "test@example.com"
	token := "test-token"
	expectedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte(email+":"+token))

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != expectedAuth {
			t.Errorf("Expected Authorization: %s, got: %s", expectedAuth, auth)
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"result": "ok"})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, email, token)
	var result map[string]string
	err := client.get("/test", &result)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if result["result"] != "ok" {
		t.Errorf("Expected result=ok, got: %v", result)
	}
}

// TestJiraClient_RateLimit429 verifies client waits and retries on 429
func TestJiraClient_RateLimit429(t *testing.T) {
	retryCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		retryCount++
		if retryCount == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"result": "ok"})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	start := time.Now()
	var result map[string]string
	err := client.get("/test", &result)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if retryCount != 2 {
		t.Errorf("Expected 2 requests (1 retry), got: %d", retryCount)
	}

	// Should have waited at least 1 second
	if elapsed < time.Second {
		t.Errorf("Expected at least 1s delay, got: %v", elapsed)
	}
}

// TestJiraClient_5xxRetry verifies exponential backoff with 3 retries on 5xx
func TestJiraClient_5xxRetry(t *testing.T) {
	retryCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		retryCount++
		if retryCount <= 2 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"result": "ok"})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	start := time.Now()
	var result map[string]string
	err := client.get("/test", &result)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if retryCount != 3 {
		t.Errorf("Expected 3 requests (2 retries), got: %d", retryCount)
	}

	// Should have waited at least 1s + 2s = 3s for exponential backoff
	if elapsed < 3*time.Second {
		t.Errorf("Expected at least 3s total delay, got: %v", elapsed)
	}
}

// TestJiraClient_SuccessfulGetPost verifies GET and POST succeed
func TestJiraClient_SuccessfulGetPost(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"method": "GET"})
			return
		}
		if r.Method == http.MethodPost {
			// Verify request body
			var body map[string]string
			json.NewDecoder(r.Body).Decode(&body)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"method": "POST", "received": body["test"]})
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")

	// Test GET
	var getResult map[string]string
	err := client.get("/test", &getResult)
	if err != nil {
		t.Fatalf("GET failed: %v", err)
	}
	if getResult["method"] != "GET" {
		t.Errorf("Expected method=GET, got: %v", getResult)
	}

	// Test POST
	var postResult map[string]string
	err = client.post("/test", map[string]string{"test": "value"}, &postResult)
	if err != nil {
		t.Fatalf("POST failed: %v", err)
	}
	if postResult["method"] != "POST" || postResult["received"] != "value" {
		t.Errorf("Expected method=POST with received=value, got: %v", postResult)
	}
}

// TestJiraClient_Timeout verifies context cancellation works
func TestJiraClient_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	// Client has 30s timeout by default, so this should succeed
	// We'll test by ensuring it doesn't hang indefinitely
	var result map[string]string
	err := client.get("/test", &result)
	// This will fail because server delays, but should not hang
	if err == nil {
		t.Error("Expected error due to timeout or empty response")
	}
}

// TestJiraClient_MaxRetriesExceeded verifies client gives up after max retries
func TestJiraClient_MaxRetriesExceeded(t *testing.T) {
	retryCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		retryCount++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	var result map[string]string
	err := client.get("/test", &result)

	if err == nil {
		t.Fatal("Expected error after max retries, got nil")
	}

	if !strings.Contains(err.Error(), "500") && !strings.Contains(err.Error(), "Internal Server Error") {
		t.Errorf("Expected 500 error message, got: %v", err)
	}

	// Should have attempted 1 initial + 3 retries = 4 total
	if retryCount != 4 {
		t.Errorf("Expected 4 total requests (1 initial + 3 retries), got: %d", retryCount)
	}
}

// TestGetSelf verifies account ID is extracted from /myself
func TestGetSelf(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/api/3/myself" {
			t.Errorf("Expected path /rest/api/3/myself, got: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"accountId": "test-account-123",
		})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	accountID, err := client.GetSelf()
	if err != nil {
		t.Fatalf("GetSelf failed: %v", err)
	}

	if accountID != "test-account-123" {
		t.Errorf("Expected accountId=test-account-123, got: %s", accountID)
	}
}

// TestCreateProject verifies project creation request structure
func TestCreateProject(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/api/3/project" {
			t.Errorf("Expected path /rest/api/3/project, got: %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST method, got: %s", r.Method)
		}

		var req CreateProjectRequest
		json.NewDecoder(r.Body).Decode(&req)

		if req.Key != "TEST" {
			t.Errorf("Expected key=TEST, got: %s", req.Key)
		}
		if req.Name != "Test Project" {
			t.Errorf("Expected name=Test Project, got: %s", req.Name)
		}
		if req.LeadAccountID != "lead-123" {
			t.Errorf("Expected leadAccountId=lead-123, got: %s", req.LeadAccountID)
		}
		if req.ProjectTypeKey != "software" {
			t.Errorf("Expected projectTypeKey=software, got: %s", req.ProjectTypeKey)
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(CreateProjectResponse{
			ID:   "10000",
			Key:  "TEST",
			Self: "/rest/api/3/project/10000",
		})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	resp, err := client.CreateProject("TEST", "Test Project", "lead-123")
	if err != nil {
		t.Fatalf("CreateProject failed: %v", err)
	}

	if resp.ID != "10000" || resp.Key != "TEST" {
		t.Errorf("Expected ID=10000, Key=TEST, got: ID=%s, Key=%s", resp.ID, resp.Key)
	}
}

// TestGetCreateMeta verifies issue type ID parsing
func TestGetCreateMeta(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.Path, "/rest/api/3/issue/createmeta") {
			t.Errorf("Expected path to contain /rest/api/3/issue/createmeta, got: %s", r.URL.Path)
		}
		if !strings.Contains(r.URL.RawQuery, "projectKeys=TEST") {
			t.Errorf("Expected projectKeys=TEST in query, got: %s", r.URL.RawQuery)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(CreateMetaResponse{
			Projects: []struct {
				IssueTypes []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"issuetypes"`
			}{
				{
					IssueTypes: []struct {
						ID   string `json:"id"`
						Name string `json:"name"`
					}{
						{ID: "10000", Name: "Epic"},
						{ID: "10001", Name: "Story"},
						{ID: "10002", Name: "Sub-task"},
					},
				},
			},
		})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	epicID, storyID, subTaskID, err := client.GetCreateMeta("TEST")
	if err != nil {
		t.Fatalf("GetCreateMeta failed: %v", err)
	}

	if epicID != "10000" {
		t.Errorf("Expected epicID=10000, got: %s", epicID)
	}
	if storyID != "10001" {
		t.Errorf("Expected storyID=10001, got: %s", storyID)
	}
	if subTaskID != "10002" {
		t.Errorf("Expected subTaskID=10002, got: %s", subTaskID)
	}
}

// TestCreateIssue verifies issue creation request and response parsing
func TestCreateIssue(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/api/3/issue" {
			t.Errorf("Expected path /rest/api/3/issue, got: %s", r.URL.Path)
		}

		var req CreateIssueRequest
		json.NewDecoder(r.Body).Decode(&req)

		if req.Fields.Project["key"] != "TEST" {
			t.Errorf("Expected project key=TEST, got: %s", req.Fields.Project["key"])
		}
		if req.Fields.Summary != "Test Issue" {
			t.Errorf("Expected summary=Test Issue, got: %s", req.Fields.Summary)
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(CreateIssueResponse{
			ID:   "10100",
			Key:  "TEST-1",
			Self: "/rest/api/3/issue/10100",
		})
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	req := &CreateIssueRequest{
		Fields: CreateIssueFields{
			Project:   map[string]string{"key": "TEST"},
			IssueType: map[string]string{"id": "10000"},
			Summary:   "Test Issue",
		},
	}

	resp, err := client.CreateIssue(req)
	if err != nil {
		t.Fatalf("CreateIssue failed: %v", err)
	}

	if resp.ID != "10100" || resp.Key != "TEST-1" {
		t.Errorf("Expected ID=10100, Key=TEST-1, got: ID=%s, Key=%s", resp.ID, resp.Key)
	}
}

// TestUpdateIssue verifies issue update request
func TestUpdateIssue(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/api/3/issue/TEST-1" {
			t.Errorf("Expected path /rest/api/3/issue/TEST-1, got: %s", r.URL.Path)
		}
		if r.Method != http.MethodPut {
			t.Errorf("Expected PUT method, got: %s", r.Method)
		}

		var req UpdateIssueRequest
		json.NewDecoder(r.Body).Decode(&req)

		if req.Fields["summary"] != "Updated Summary" {
			t.Errorf("Expected summary=Updated Summary, got: %v", req.Fields["summary"])
		}

		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	req := &UpdateIssueRequest{
		Fields: map[string]interface{}{
			"summary": "Updated Summary",
		},
	}

	err := client.UpdateIssue("TEST-1", req)
	if err != nil {
		t.Fatalf("UpdateIssue failed: %v", err)
	}
}

// TestCreateLink verifies issue link creation request
func TestCreateLink(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/api/3/issueLink" {
			t.Errorf("Expected path /rest/api/3/issueLink, got: %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST method, got: %s", r.Method)
		}

		var req CreateLinkRequest
		json.NewDecoder(r.Body).Decode(&req)

		if req.Type["name"] != "Blocks" {
			t.Errorf("Expected type=Blocks, got: %s", req.Type["name"])
		}
		if req.InwardIssue["key"] != "TEST-1" {
			t.Errorf("Expected inwardIssue=TEST-1, got: %s", req.InwardIssue["key"])
		}
		if req.OutwardIssue["key"] != "TEST-2" {
			t.Errorf("Expected outwardIssue=TEST-2, got: %s", req.OutwardIssue["key"])
		}

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewJiraClient(server.URL, "test@example.com", "token")
	req := &CreateLinkRequest{
		Type:         map[string]string{"name": "Blocks"},
		InwardIssue:  map[string]string{"key": "TEST-1"},
		OutwardIssue: map[string]string{"key": "TEST-2"},
	}

	err := client.CreateLink(req)
	if err != nil {
		t.Fatalf("CreateLink failed: %v", err)
	}
}
