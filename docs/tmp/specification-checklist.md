# Sherpy Document Specification Checklist

Use this checklist to systematically create specifications for each document in the workflow.

---

## Requirements Phase

### 1. gap-analysis-worksheet.md
- [x] Read existing skill and examples
- [x] Create `/docs/specifications/gap-analysis-worksheet/` directory
- [x] Write `spec.md` with complete schema definition
- [x] Create `example.md` with realistic content
- [x] Mark as complete in tracker

### 2. business-requirements.yaml
- [x] Read existing skill and examples
- [x] Create `/docs/specifications/business-requirements/` directory
- [x] Write `spec.md` with complete schema definition
- [x] Create `example.yaml` with realistic content
- [x] Mark as complete in tracker

### 3. technical-requirements.yaml
- [x] Read existing skill and examples
- [x] Create `/docs/specifications/technical-requirements/` directory
- [x] Write `spec.md` with complete schema definition
- [x] Create `example.yaml` with realistic content
- [x] Mark as complete in tracker

---

## Style Anchors Phase

### 3.5. style-anchors-index.yaml
- [x] Read existing skill and examples
- [x] Create `/docs/specifications/style-anchors-index/` directory
- [x] Write `spec.md` with complete schema definition
- [x] Create `example.yaml` with realistic content
- [x] Mark as complete in tracker

### 3.6. style-anchor-document.md
- [x] Read existing skill and examples
- [x] Create `/docs/specifications/style-anchor-document/` directory
- [x] Write `spec.md` with complete schema definition
- [x] Create `example.md` with realistic content
- [x] Mark as complete in tracker

---

## Implementation Phase

### 4. milestones.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/milestones/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content
- [ ] Mark as complete in tracker

### 5. milestone-tasks.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/milestone-tasks/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content (milestone-m1.tasks.yaml)
- [ ] Mark as complete in tracker

---

## Review Phase

### 6. implementation-plan-review.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/implementation-plan-review/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content
- [ ] Mark as complete in tracker

---

## Delivery Phase

### 7. definition-of-done.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/definition-of-done/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content
- [ ] Mark as complete in tracker

### 8. timeline.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/timeline/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content
- [ ] Mark as complete in tracker

### 9. qa-test-plan.yaml
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/qa-test-plan/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.yaml` with realistic content
- [ ] Mark as complete in tracker

---

## Architecture Phase

### 10. adr-index.md
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/adr-index/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content (INDEX.md)
- [ ] Mark as complete in tracker

### 11. adr-document.md
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/adr-document/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content (ADR-001.md)
- [ ] Mark as complete in tracker

---

## Summary Phase

### 12. developer-summary.md
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/developer-summary/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content
- [ ] Mark as complete in tracker

### 13. executive-summary.md
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/executive-summary/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content
- [ ] Mark as complete in tracker

---

## Artifact/Supporting Documents

### 14. business-interview.jsonl
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/business-interview/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.jsonl` with realistic content
- [ ] Mark as complete in tracker

### 15. technical-interview.jsonl
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/technical-interview/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.jsonl` with realistic content
- [ ] Mark as complete in tracker


### 17. continue.md
- [ ] Read existing skill and examples
- [ ] Create `/docs/specifications/continue/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content (CONTINUE.md)
- [ ] Mark as complete in tracker

### 18. feature-flags.md
- [ ] Investigate if this is generated (may be documentation only)
- [ ] If generated: Create `/docs/specifications/feature-flags/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content (FEATURE_FLAGS.md)
- [ ] Mark as complete in tracker

### 19. updates.md
- [ ] Investigate if this is generated (may be documentation only)
- [ ] If generated: Create `/docs/specifications/updates/` directory
- [ ] Write `spec.md` with complete schema definition
- [ ] Create `example.md` with realistic content (UPDATES.md)
- [ ] Mark as complete in tracker

---

## Process for Each Document

1. **Research Phase**
   - Read the skill that generates this document
   - Search for existing examples in test fixtures or docs
   - Note dependencies (what inputs it requires)
   - Note consumers (what documents depend on this)

2. **Structure Phase**
   - Create the specification directory
   - Draft the spec.md outline
   - Define all fields, types, and constraints

3. **Validation Phase**
   - Document required vs optional fields
   - Define validation rules
   - List common errors to prevent

4. **Example Phase**
   - Create realistic example file
   - Ensure it demonstrates all major features
   - Validate it against the spec

5. **Review Phase**
   - Cross-check with skill implementation
   - Ensure completeness
   - Update tracker

---

## Current Progress

**Working On:** Nothing
**Last Completed:** technical-requirements.yaml (found existing spec + example)
**Next Up:** milestones.yaml

**Completed Specs (6/19):**
1. gap-analysis-worksheet.md ✓
2. business-requirements.yaml ✓
3. technical-requirements.yaml ✓
4. style-anchors-index.yaml ✓ (documented in style-anchors-spec.md)
5. style-anchor-document.md ✓ (documented in style-anchors-spec.md)

---

## Notes

- Start with requirements phase documents (most foundational)
- Move through phases in workflow order
- Each spec should be self-contained and complete
- Examples should be realistic, not placeholder content
- Cross-reference related documents in specs
