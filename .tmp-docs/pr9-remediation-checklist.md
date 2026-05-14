# PR #9 Remediation - Quick Reference Checklist

## Pre-Flight Checks

- [ ] On branch `feat/sherpy-prompt-command`
- [ ] Workspace clean (`git status`)
- [ ] Go 1.26+ installed (`go version`)
- [ ] Make available (`make --version`)
- [ ] Git 2.x+ (`git --version`)

---

## M1: Critical Fixes (15 minutes) ⚠️ BLOCKING

### M1-T1: Remove Binary (5 min)
- [ ] Check if sherpy is tracked: `git ls-files --error-unmatch sherpy`
- [ ] Remove if tracked: `git rm -f sherpy`
- [ ] Verify: `git status | grep deleted.*sherpy`
- [ ] Commit: "fix: Remove committed binary from repository"

### M1-T2: Add to .gitignore (5 min)
- [ ] Add patterns to `.gitignore`:
  ```
  # Compiled binaries
  /sherpy
  *.exe
  *.out
  ```
- [ ] Build test: `make build`
- [ ] Verify ignored: `git status` should not show sherpy
- [ ] Clean: `rm -f sherpy`
- [ ] Commit: "chore: Add binary patterns to .gitignore"

### M1-T3: Update PR Description (5 min)
- [ ] Navigate to GitHub PR #9
- [ ] Add "Building from Source" section (see plan)
- [ ] Save PR description
- [ ] Verify section appears

**M1 Complete:** Push to GitHub, verify PR updated

---

## M2: Should-Fix Issues (25-55 minutes)

### M2-T3: Write Test Script FIRST (15 min) - TDD
- [ ] Create `install_test.sh` (see plan for full script)
- [ ] Make executable: `chmod +x install_test.sh`
- [ ] Run: `./install_test.sh`
- [ ] Verify: All 7 tests pass
- [ ] Commit: "test: Add version check validation script"

### M2-T1: Implement Version Check (20 min) - After M2-T3
- [ ] Edit `install.sh` line 78+
- [ ] Add version comparison logic (see plan)
- [ ] Test with script: `./install_test.sh`
- [ ] Verify: All 7 tests still pass
- [ ] shellcheck: `shellcheck install.sh`
- [ ] Commit: "fix: Complete Go version check in install.sh"

### M2-T2: Fresh Binary Tests (20 min) - TDD, Parallel with M2-T1
- [ ] Write TestBinaryIsFresh first (see plan)
- [ ] Run: `go test -v -run TestBinaryIsFresh ./integration`
- [ ] Verify: FAIL (proves issue exists)
- [ ] Update `findBinary()` function (see plan)
- [ ] Run: `go test -v -run TestBinaryIsFresh ./integration`
- [ ] Verify: PASS
- [ ] All tests: `go test -v ./integration`
- [ ] Race detector: `go test -race ./integration`
- [ ] Commit: "fix: Always build fresh binary in integration tests"

**M2 Quality Checks:**
- [ ] `go test ./... -v` - All pass
- [ ] `go test -race ./...` - No warnings
- [ ] `go vet ./...` - No issues
- [ ] `gofmt -l .` - No output
- [ ] `go mod tidy && git diff go.mod go.sum` - Clean
- [ ] `make clean && make build` - Success
- [ ] `./sherpy prompt --list` - Works

**M2 Complete:** Commit combined or separate, push to GitHub

---

## M3: Optional Improvements (35-90 minutes)

Can be done in separate PR(s) after M1+M2 merge.

### M3-T1: Remove Runtime Stripping (25 min) - TDD
- [ ] Capture baseline: `go test -bench=BenchmarkPromptContent -benchmem ./prompt > bench-before.txt`
- [ ] Write TestPromptContentNoFrontmatter (see plan)
- [ ] Run test: Should pass (already stripped at build)
- [ ] Simplify PromptContent() (remove stripFrontmatter call)
- [ ] Keep stripFrontmatter in test file for validation
- [ ] Run tests: `go test -v ./prompt`
- [ ] Capture new: `go test -bench=BenchmarkPromptContent -benchmem ./prompt > bench-after.txt`
- [ ] Compare: `benchstat bench-before.txt bench-after.txt`
- [ ] Verify improvement: ~20% faster
- [ ] Commit: "perf: Remove redundant frontmatter stripping"

### M3-T2: Add Validation (25 min) - TDD
- [ ] Write TestValidationDetectsMissingContent first
- [ ] Write TestValidationDetectsOrphanedContent
- [ ] Run tests: `go test -v -run TestValidation ./prompt`
- [ ] Add init() validation to registry.go
- [ ] Test with fake mismatch (should panic)
- [ ] Revert, test normal (should work)
- [ ] Run all: `go test -v ./prompt`
- [ ] Commit: "feat: Add prompt content validation in init()"

### M3-T3: Document Token Efficiency (15 min)
- [ ] Gather actual sizes: `cd skills && find . -name "SKILL.md" -exec du -k {} +`
- [ ] Add section to README.md (see plan)
- [ ] Verify calculations match
- [ ] Check markdown: `markdownlint README.md` (if available)
- [ ] Commit: "docs: Document token efficiency calculation"

### M3-T4: Concurrency Tests (35 min) - TDD
- [ ] Write TestPromptContentConcurrentSafety first
- [ ] Run with race: `go test -race -v -run TestPromptContentConcurrentSafety ./prompt`
- [ ] Verify: PASS with no warnings
- [ ] Add BenchmarkPromptContentSequential
- [ ] Add BenchmarkPromptContentConcurrent
- [ ] Run benchmarks: `go test -bench=BenchmarkPromptContent -benchmem ./prompt`
- [ ] Verify: Concurrent ~4x faster than sequential
- [ ] Run with race: `go test -race ./prompt -v`
- [ ] Commit: "test: Add concurrency benchmarks"

**M3 Quality Checks:**
- [ ] `go test ./... -v` - All pass
- [ ] `go test -race ./...` - No warnings
- [ ] `go vet ./...` - No issues
- [ ] `gofmt -l .` - No output
- [ ] `go mod tidy && git diff go.mod go.sum` - Clean
- [ ] `make clean && make build && make test` - Success

**M3 Complete:** Create PR with all M3 improvements or separate PRs

---

## Drift Recovery Procedure

If you encounter unexpected issues:

1. **STOP immediately**
2. **Revert changes:**
   ```bash
   git checkout <file>  # Single file
   # OR
   git reset --hard HEAD  # All changes
   ```
3. **Document blocker:**
   - What you attempted
   - What failed
   - Files affected
   - Why plan was insufficient
4. **Seek guidance** before continuing

**Allowed without stopping:**
- Minor formatting (gofmt)
- Whitespace changes
- Import additions for new code in same task

---

## Final Verification Checklist

Before pushing:

- [ ] All tests pass: `go test ./... -v`
- [ ] No race conditions: `go test -race ./...`
- [ ] No vet issues: `go vet ./...`
- [ ] Code formatted: `gofmt -l . | grep -v vendor` (empty)
- [ ] Dependencies clean: `go mod tidy && git diff go.mod go.sum` (empty)
- [ ] Binary builds: `make clean && make build`
- [ ] Binary works: `./sherpy --version && ./sherpy prompt --list`
- [ ] All commits have proper messages (conventional commits)
- [ ] PR description updated (M1-T3)

---

## Time Tracking

| Milestone | Estimated | Actual | Notes |
|-----------|-----------|--------|-------|
| M1-T1 | 5 min | | |
| M1-T2 | 5 min | | |
| M1-T3 | 5 min | | |
| **M1 Total** | **15 min** | | |
| M2-T3 | 15 min | | |
| M2-T1 | 20 min | | |
| M2-T2 | 20 min | | |
| **M2 Total** | **55 min** | | (Can parallelize to 25 min) |
| M3-T1 | 25 min | | |
| M3-T2 | 25 min | | |
| M3-T3 | 15 min | | |
| M3-T4 | 35 min | | |
| **M3 Total** | **90 min** | | (Can parallelize to 35 min) |
| **Grand Total** | **160 min** | | (Can optimize to 75 min) |

---

## Success Criteria

### M1 (Critical) - Required for PR merge
- [x] Binary removed from repository
- [x] `.gitignore` contains `/sherpy`
- [x] `git status` shows binary as ignored
- [x] PR description updated with build instructions

### M2 (Should Fix) - Required for quality
- [x] Install script enforces Go 1.26+
- [x] install_test.sh validates version logic (7 tests pass)
- [x] Integration tests always build fresh binary
- [x] TestBinaryIsFresh proves rebuild behavior
- [x] All tests pass including new tests
- [x] Race detector clean

### M3 (Optional) - Nice to have
- [x] Frontmatter only stripped once (build-time)
- [x] Benchmarks show ~20% performance improvement
- [x] Prompt validation catches mismatches at startup
- [x] README documents token efficiency with real numbers
- [x] Concurrency benchmarks show 4x speedup
- [x] 100K concurrent operations complete safely

---

## Help

**Stuck?** Review the full plan at `/workspace/.tmp-docs/pr9-remediation-plan.md`

**Review findings?** See `/workspace/.tmp-docs/pr9-remediation-plan-review.md`

**What changed?** See `/workspace/.tmp-docs/pr9-remediation-improvements-summary.md`

**Questions?**
- Check drift policy in full plan
- Review style anchors section
- Verify task dependencies
- Check commit message templates
