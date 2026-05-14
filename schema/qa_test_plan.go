package schema

import (
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type QATestPlan struct {
	Version     string       `yaml:"version"`
	Project     string       `yaml:"project"`
	Generated   string       `yaml:"generated"`
	Sources     QASources    `yaml:"sources"`
	Summary     QASummary    `yaml:"summary"`
	TestSuites  []QATestSuite `yaml:"test_suites"`
}

type QASources struct {
	BusinessRequirements  string `yaml:"business_requirements"`
	TechnicalRequirements string `yaml:"technical_requirements"`
}

type QASummary struct {
	TotalTestSuites int          `yaml:"total_test_suites"`
	TotalTestCases  int          `yaml:"total_test_cases"`
	ByPriority      QAPriority   `yaml:"by_priority"`
	Coverage        QACoverage   `yaml:"coverage"`
}

type QAPriority struct {
	High   int `yaml:"high"`
	Medium int `yaml:"medium"`
	Low    int `yaml:"low"`
}

type QACoverage struct {
	FunctionalRequirements string `yaml:"functional_requirements"`
	Personas               string `yaml:"personas"`
	HasPerformanceTests    bool   `yaml:"has_performance_tests"`
	HasSecurityTests       bool   `yaml:"has_security_tests"`
}

type QATestSuite struct {
	ID              string        `yaml:"id"`
	Name            string        `yaml:"name"`
	Description     string        `yaml:"description"`
	RequirementRefs []string      `yaml:"requirement_refs"`
	TestCases       []QATestCase  `yaml:"test_cases"`
}

type QATestCase struct {
	ID             string   `yaml:"id"`
	Name           string   `yaml:"name"`
	Type           string   `yaml:"type"`
	Priority       string   `yaml:"priority"`
	Preconditions  []string `yaml:"preconditions"`
	Steps          []string `yaml:"steps"`
	ExpectedResult string   `yaml:"expected_result"`
	RequirementRefs []string `yaml:"requirement_refs"`
	Tags           []string `yaml:"tags,omitempty"`
}

var qaSuiteIDPattern = regexp.MustCompile(`^ts-[a-z0-9-]+$`)
var qaCaseIDPattern = regexp.MustCompile(`^tc-[a-z0-9-]+-\d{3}$`)
var qaValidCaseTypes = map[string]bool{
	"positive": true, "negative": true, "edge": true,
	"security": true, "performance": true,
}
var qaValidCasePriorities = map[string]bool{
	"high": true, "medium": true, "low": true,
}
var qaCoveragePattern = regexp.MustCompile(`^\d+%$`)

func ValidateQATestPlan(data []byte, strict bool) (*ValidationResult, error) {
	var doc QATestPlan
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	result := &ValidationResult{}

	validateQAMetadata(doc, result)
	validateQASummary(doc, result)
	validateQATestSuites(doc, result)

	if strict {
		result.ApplyStrict()
		result.Warnings = nil
	}

	return result, nil
}

func validateQAMetadata(doc QATestPlan, r *ValidationResult) {
	if strings.TrimSpace(doc.Project) == "" {
		r.Errors = append(r.Errors, "project is required")
	}
	if strings.TrimSpace(doc.Version) == "" {
		r.Errors = append(r.Errors, "version is required")
	}
	if strings.TrimSpace(doc.Generated) == "" {
		r.Errors = append(r.Errors, "generated is required")
	}
	if strings.TrimSpace(doc.Sources.BusinessRequirements) == "" {
		r.Errors = append(r.Errors, "sources.business_requirements is required")
	}
	if strings.TrimSpace(doc.Sources.TechnicalRequirements) == "" {
		r.Errors = append(r.Errors, "sources.technical_requirements is required")
	}
}

func validateQASummary(doc QATestPlan, r *ValidationResult) {
	if doc.Summary.TotalTestSuites < 1 {
		r.Errors = append(r.Errors, "summary.total_test_suites must be >= 1")
	}
	if doc.Summary.TotalTestCases < 1 {
		r.Errors = append(r.Errors, "summary.total_test_cases must be >= 1")
	}
	if !qaCoveragePattern.MatchString(doc.Summary.Coverage.FunctionalRequirements) {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.coverage.functional_requirements must be N%% format (got %q)", doc.Summary.Coverage.FunctionalRequirements))
	}
	if !qaCoveragePattern.MatchString(doc.Summary.Coverage.Personas) {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.coverage.personas must be N%% format (got %q)", doc.Summary.Coverage.Personas))
	}

	prioritySum := doc.Summary.ByPriority.High + doc.Summary.ByPriority.Medium + doc.Summary.ByPriority.Low
	if prioritySum != doc.Summary.TotalTestCases {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.by_priority sum (%d) does not match total_test_cases (%d)", prioritySum, doc.Summary.TotalTestCases))
	}
}

func validateQATestSuites(doc QATestPlan, r *ValidationResult) {
	if len(doc.TestSuites) < 1 {
		r.Errors = append(r.Errors, "test_suites must have at least 1 entry")
		return
	}

	if doc.Summary.TotalTestSuites != len(doc.TestSuites) {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.total_test_suites is %d but found %d suites", doc.Summary.TotalTestSuites, len(doc.TestSuites)))
	}

	totalCases := 0
	seenSuiteIDs := map[string]bool{}
	allCaseIDs := map[string]bool{}
	hasPerf := false
	hasSec := false

	for i, suite := range doc.TestSuites {
		// Check length before regex to prevent ReDoS
		if len(suite.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.id exceeds maximum length of %d characters", i, MaxIDLength))
		} else if !qaSuiteIDPattern.MatchString(suite.ID) {
			r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.id must match ts-[slug] pattern (got %q)", i, suite.ID))
		}
		if seenSuiteIDs[suite.ID] {
			r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.id %q is duplicated", i, suite.ID))
		}
		seenSuiteIDs[suite.ID] = true

		if len(suite.RequirementRefs) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.requirement_refs must have at least 1 entry", i))
		}
		if len(suite.TestCases) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases must have at least 1 entry", i))
			continue
		}

		for j, tc := range suite.TestCases {
			// Check length before regex to prevent ReDoS
			if len(tc.ID) > MaxIDLength {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.id exceeds maximum length of %d characters", i, j, MaxIDLength))
			} else if !qaCaseIDPattern.MatchString(tc.ID) {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.id must match tc-[slug]-NNN pattern (got %q)", i, j, tc.ID))
			}
			if allCaseIDs[tc.ID] {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.id %q is duplicated", i, j, tc.ID))
			}
			allCaseIDs[tc.ID] = true

			if !qaValidCaseTypes[tc.Type] {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.type must be positive, negative, edge, security, or performance (got %q)", i, j, tc.Type))
			}
			if !qaValidCasePriorities[tc.Priority] {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.priority must be high, medium, or low (got %q)", i, j, tc.Priority))
			}
			if len(tc.Preconditions) < 1 {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.preconditions must have at least 1 entry", i, j))
			}
			if len(tc.Steps) < 1 {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.steps must have at least 1 entry", i, j))
			}
			if len(tc.RequirementRefs) < 1 {
				r.Errors = append(r.Errors, fmt.Sprintf("test_suites.%d.test_cases.%d.requirement_refs must have at least 1 entry", i, j))
			}

			if tc.Type == "performance" {
				hasPerf = true
			}
			if tc.Type == "security" {
				hasSec = true
			}
			totalCases++
		}
	}

	if doc.Summary.TotalTestCases != totalCases {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.total_test_cases is %d but found %d cases", doc.Summary.TotalTestCases, totalCases))
	}
	if doc.Summary.Coverage.HasPerformanceTests != hasPerf {
		r.Warnings = append(r.Warnings, fmt.Sprintf("summary.coverage.has_performance_tests is %v but found %v performance test cases", doc.Summary.Coverage.HasPerformanceTests, hasPerf))
	}
	if doc.Summary.Coverage.HasSecurityTests != hasSec {
		r.Warnings = append(r.Warnings, fmt.Sprintf("summary.coverage.has_security_tests is %v but found %v security test cases", doc.Summary.Coverage.HasSecurityTests, hasSec))
	}
}
