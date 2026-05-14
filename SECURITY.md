# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Sherpy CLI, please report it by emailing security@validkeys.com or opening a confidential issue on GitHub.

**Please do not open public issues for security vulnerabilities.**

## Security Features

Sherpy CLI implements multiple layers of security to protect against common attack vectors.

### 1. Path Traversal Protection

**Problem**: Malicious file paths could access sensitive system files.

**Solution**:
- MaxDepth validation limits directory traversal
- Path cleaning prevents `../` attacks
- Absolute path validation
- Symlink detection and blocking

**Protected Operations**:
- File reading (`validate`, `to-markdown`)
- File writing (`to-markdown -o`)

**Example Attack Prevented**:
```bash
# Blocked: Attempt to read /etc/passwd
sherpy validate -t business-requirements -f ../../../../../../etc/passwd
# Error: path traversal blocked (exceeds max depth)

# Blocked: Attempt to write to system directory
sherpy to-markdown -t business-requirements -f input.yaml -o /etc/malicious.md
# Error: path traversal blocked
```

**Code**: `cmd/root.go:115-140`

### 2. File Size Limits

**Problem**: Large files could exhaust memory or cause denial of service.

**Solution**:
- 10MB maximum file size (10,485,760 bytes)
- Size checked before reading file contents
- Early rejection prevents memory exhaustion

**Protected Operations**:
- All file read operations
- YAML parsing
- Markdown conversion

**Example Attack Prevented**:
```bash
# Blocked: 100MB file
dd if=/dev/zero of=huge.yaml bs=1M count=100
sherpy validate -t business-requirements -f huge.yaml
# Error: file size exceeds maximum of 10MB

# Blocked: 1GB file
sherpy to-markdown -t business-requirements -f 1gb-file.yaml -o output.md
# Error: file size exceeds maximum of 10MB
```

**Code**: `cmd/root.go:170-177`

**Configuration**:
```go
const MaxFileSize = 10 * 1024 * 1024 // 10MB
```

### 3. Secure File Permissions

**Problem**: Output files could be readable by other users, exposing sensitive planning data.

**Solution**:
- Output files created with `0600` permissions (user read/write only)
- No group or world access
- Applied automatically to all markdown output

**Protected Data**:
- Business requirements documents
- Technical specifications
- Project timelines
- QA test plans
- Any converted markdown output

**Verification**:
```bash
sherpy to-markdown -t business-requirements -f input.yaml -o output.md
ls -l output.md
# Output: -rw------- 1 user group 12345 May 13 10:00 output.md
#          ^^^ = 0600 permissions (user only)
```

**Code**: `cmd/root.go:224`

### 4. Injection Prevention

**Problem**: Malicious YAML content could inject markdown/HTML into generated output.

**Solution**:
- Markdown special character escaping
- HTML entity encoding
- Template structure separation
- User content sanitization

**Protected Against**:
- Markdown injection
- XSS (Cross-Site Scripting)
- Template injection
- Malicious link injection

**Example Attacks Prevented**:
```yaml
# Attack: Markdown injection
project: "[click me](javascript:alert('xss'))"

# Sanitized output:
# \[click me\]\(javascript:alert\('xss'\)\)

# Attack: HTML injection
project: "<script>alert('xss')</script>"

# Sanitized output:
# &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;

# Attack: Image injection
overview:
  problem: "![](http://malicious.com/track.gif)"

# Sanitized output:
# \!\[\]\(http://malicious.com/track.gif\)
```

**Escape Functions**:
```go
// markdown/converter.go
funcMap["escapeMarkdown"] = func(s string) string {
    // Escapes: \ [ ] ( ) * _ ` # !
}

funcMap["escapeHTML"] = func(s string) string {
    // Escapes: & < > " '
}
```

**Usage in Templates**:
```go
// Escape user-controlled content
{{escapeMarkdown .Project}}

// Escape HTML in descriptions
{{escapeHTML .Overview.Problem}}
```

**Code**: `markdown/converter.go:41-76`

### 5. ReDoS Protection

**Problem**: Long strings in regex validation could cause CPU exhaustion (Regular Expression Denial of Service).

**Solution**:
- MaxIDLength = 100 characters
- Length validation before regex evaluation
- Applied to all ID patterns

**Protected Patterns**:
- Functional Requirement IDs (`FR-\d{1,4}`)
- QA Suite IDs (`ts-[a-z0-9-]+`)
- QA Case IDs (`tc-[a-z0-9-]+-\d{3}`)
- Milestone IDs (`m\d+`)
- Milestone Task IDs (`m\d+-\d{3}`)
- Timeline IDs (`m\d+`)

**Example Attack Prevented**:
```yaml
# Attack: 10,000 character ID
functional_requirements:
  - id: "FR-111111111111111111111111..." # 10,000 chars
    description: "test"

# Protected: Length checked first
# Error: functional_requirements.0.id exceeds maximum length of 100 characters
```

**Validation Flow**:
```go
// 1. Check length (fast, O(1))
if len(id) > MaxIDLength {
    return error("exceeds maximum length")
}

// 2. Then apply regex (safe, limited input)
if !pattern.MatchString(id) {
    return error("invalid format")
}
```

**Code**: 
- `schema/validation_helpers.go:11-23` (MaxIDLength, validateIDFormat)
- `schema/business_requirements.go:234-240` (FR IDs)
- `schema/qa_test_plan.go:150-169` (QA IDs)
- `schema/milestone_tasks.go:137-143` (Task IDs)
- `schema/milestones.go:99-104` (Milestone IDs)
- `schema/timeline.go:172-177` (Timeline IDs)

### 6. Template Panic Recovery

**Problem**: Malformed templates or nil pointer access could crash the application.

**Solution**:
- Defer/recover pattern around template execution
- Graceful error messages
- Application continues after errors

**Protected Operations**:
- Template parsing
- Template execution
- Markdown generation

**Example Error Handling**:
```go
// markdown/converter.go:56-74
func execTemplate(name, text string, data interface{}) (result string, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("template execution panic: %v", r)
        }
    }()
    
    // Template execution
    // If panic occurs, recovered and returned as error
}
```

**Prevents**:
- Nil pointer dereference crashes
- Index out of bounds panics
- Type assertion failures
- Application termination

**Code**: `markdown/converter.go:56-74`

## Security Best Practices

### For Users

1. **Validate file sources**
   ```bash
   # Check file origin
   ls -l docs/business-requirements.yaml
   # Verify owner and permissions
   ```

2. **Use strict mode for untrusted input**
   ```bash
   sherpy validate -t business-requirements -f untrusted.yaml --strict
   ```

3. **Run in isolated environments**
   ```bash
   # Use Docker for untrusted files
   docker run --rm -v $(pwd):/data:ro sherpy validate -t business-requirements -f /data/input.yaml
   ```

4. **Verify output permissions**
   ```bash
   sherpy to-markdown -t business-requirements -f input.yaml -o output.md
   ls -l output.md  # Should be -rw------- (600)
   ```

5. **Limit file sizes**
   ```bash
   # Check before processing
   size=$(stat -f%z input.yaml)  # macOS
   size=$(stat -c%s input.yaml)  # Linux
   
   if [ "$size" -gt 10485760 ]; then
     echo "File too large"
     exit 1
   fi
   ```

### For Developers

1. **Always use escape functions in templates**
   ```go
   // Bad: Raw user input
   {{.Project}}
   
   // Good: Escaped user input
   {{escapeMarkdown .Project}}
   {{escapeHTML .Description}}
   ```

2. **Validate length before regex**
   ```go
   // Bad: Direct regex on untrusted input
   if pattern.MatchString(userInput) { ... }
   
   // Good: Length check first
   if len(userInput) > MaxIDLength {
       return error("too long")
   }
   if pattern.MatchString(userInput) { ... }
   ```

3. **Use path cleaning**
   ```go
   // Bad: Direct file operations
   os.Open(userPath)
   
   // Good: Clean and validate first
   cleanPath := filepath.Clean(userPath)
   if !isValidPath(cleanPath) {
       return error("invalid path")
   }
   os.Open(cleanPath)
   ```

4. **Handle panics gracefully**
   ```go
   // Use defer/recover for error-prone operations
   func riskyOperation() (err error) {
       defer func() {
           if r := recover(); r != nil {
               err = fmt.Errorf("panic: %v", r)
           }
       }()
       // Risky code here
   }
   ```

## Security Testing

### Test Suite Coverage

Our security tests cover:
- ✅ Path traversal attempts (7 test cases)
- ✅ File size limits (3 test cases)
- ✅ Markdown injection (9 test cases)
- ✅ HTML injection (8 test cases)
- ✅ ReDoS prevention (5 test cases)
- ✅ Template panics (3 test cases)

**Total: 35 security-specific test cases**

### Running Security Tests

```bash
# All security tests
go test ./... -v -run "Security|Traversal|Injection|ReDoS|Panic"

# Path traversal tests
go test ./cmd -v -run TestValidatePathTraversal
go test ./cmd -v -run TestReadFileWithLimit

# Injection tests
go test ./markdown -v -run "TestEscape|TestMarkdownInjection"

# ReDoS tests
go test ./schema -v -run "TestValidateIDFormat|TestReDoS"

# Panic recovery tests
go test ./markdown -v -run TestExecTemplatePanic
```

### Manual Security Testing

```bash
# Test path traversal
sherpy validate -t business-requirements -f ../../etc/passwd

# Test file size limits
dd if=/dev/zero of=/tmp/huge.yaml bs=1M count=20
sherpy validate -t business-requirements -f /tmp/huge.yaml

# Test injection
cat > /tmp/inject.yaml <<EOF
project: "<script>alert('xss')</script>"
version: "1.0"
generated: "2024-01-01"
EOF
sherpy to-markdown -t business-requirements -f /tmp/inject.yaml

# Test ReDoS
python3 -c "print('id: FR-' + '1' * 10000)" > /tmp/redos.yaml
sherpy validate -t business-requirements -f /tmp/redos.yaml
```

## Vulnerability History

| Date | CVE | Severity | Description | Fixed In |
|------|-----|----------|-------------|----------|
| 2024-05-13 | N/A | N/A | Initial security implementation | v1.0.0 |

No vulnerabilities have been reported. All security features were implemented proactively.

## Security Releases

Security fixes are released as patch versions (e.g., v1.0.1) and documented in the changelog.

Subscribe to security advisories:
- GitHub: Watch this repository for security alerts
- Email: security@validkeys.com

## Acknowledgments

Security features implemented following:
- OWASP Top 10 guidelines
- CWE (Common Weakness Enumeration)
- Go security best practices
- Industry standard security patterns

## Contact

- **Security Issues**: security@validkeys.com
- **General Issues**: https://github.com/validkeys/sherpy/issues
- **Documentation**: https://github.com/validkeys/sherpy

## License

Security features are part of Sherpy CLI and covered under the MIT License.
