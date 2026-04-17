# Timeline.yaml Specification Review

**Date:** 2026-04-16
**Reviewer:** Claude
**Document:** `/Users/kydavis/Sites/sherpy/docs/specifications/timeline/spec.md`

---

## Executive Summary

The timeline.yaml specification is comprehensive and well-structured. Found 14 concision issues, 8 gaps, and 11 clarity problems. No critical errors. Recommended changes will reduce document size by ~20% while improving precision.

---

## 1. CONCISION ISSUES

### C1: Redundant Duration Logic (Lines 93-106 vs 189-191)
**Issue:** Extended QA duration logic appears in two formats:
- Table footnotes (lines 97-103)
- Conditional formula in QA Phases table (line 189)

**Recommendation:** Remove footnotes from first table. Keep the precise formula in the QA Phases section (line 189).

### C2: Delivery Model Section Duplicates Schema (Lines 200-214)
**Issue:** "Delivery Model Differences" repeats information from Milestone Entry (66-76) and Delivery Phase Entry sections (77-134).

**Recommendation:** Reduce to 3-sentence summary:
```markdown
## Delivery Model Differences

Standard strategies (`single-feature-branch`, `value-first`, `risk-first`, `vertical-slice`, `foundation-first`) complete all milestones before opening a single PR. Multi-PR strategy inserts a 4-day PR cycle after each milestone. See Delivery Phase Entry sections for detailed schemas.
```

### C3: Generation Process Redundant with Skill (Lines 296-310)
**Issue:** 10-step generation process duplicates the skill definition and is procedural (how to generate) rather than declarative (what the output is).

**Recommendation:** Remove or reduce to 2 sentences:
```markdown
## Generation Process

The delivery-timeline skill reads milestones.yaml, gathers user parameters (deploy date, QA rounds), converts durations to business days, builds a dependency-ordered timeline, and generates workback dates by counting backwards from the production deploy date. See skill definition for detailed implementation steps.
```

### C4: Common Patterns Section Low Value (Lines 354-375)
**Issue:** Examples like "Small Project" and "Sequential Milestones" are generic and don't add validation or specification value.

**Recommendation:** Remove entire section or condense to 1 paragraph noting typical ranges.

### C5: CLI Tool Support is Speculative (Lines 377-413)
**Issue:** Describes hypothetical `sherpy timeline`, `sherpy validate`, `sherpy workback` commands that don't exist.

**Recommendation:** Remove entire section. These belong in tool documentation, not document specification.

### C6: Best Practices Too Verbose (Lines 415-453)
**Issue:** 38 lines of guidance ("DO/DON'T") are useful but not part of the technical specification.

**Recommendation:** Move to separate "Timeline Planning Guide" document. Replace with 1-sentence note: "See Timeline Planning Guide for production deploy date selection, QA planning, and workback accuracy considerations."

### C7: Validation Summary Duplicates Later Checklist (Lines 230-264 vs 313-350)
**Issue:** Two validation checklists with 90% overlap. The gap analysis checklist (313-350) is more detailed.

**Recommendation:** Remove "Validation Summary" section. Keep only "Gap Analysis Checklist" (retitle to "Validation Checklist").

### C8: Schema Examples in Comments (Lines 13-19)
**Issue:** Inline YAML schema shows example values in comments, then explains validation rules. Creates visual noise.

**Recommendation:** Remove inline comments, rely on validation rules immediately following.

### C9: Workback Section Over-Explains (Lines 136-173)
**Issue:** 37 lines to explain a relatively straightforward date-mapping concept with multiple redundant explanations of business day arithmetic.

**Recommendation:** Consolidate date calculation explanations. Current has 3 separate explanations (lines 159-163, 154, 162).

### C10: Duration Conversion Table Note (Lines 193-196)
**Issue:** 4-line note explains business days when it's already stated in the table header and throughout the document.

**Recommendation:** Remove notes. Change table header to "Duration Conversion (Business Days Only)".

### C11: Integration Section Verbose (Lines 267-292)
**Issue:** Lists every related document with explanations that are already covered elsewhere. The workflow diagram is helpful but surrounded by redundant text.

**Recommendation:** Keep workflow diagram. Reduce prose to: "Input: milestones.yaml and user parameters. Output: timeline.yaml and updated milestones.yaml (with estimated_days). Related: milestone tasks files, qa-test-plan.yaml."

### C12: Root Level Schema (Lines 12-26)
**Issue:** 4 fields with validation rules each explained in 2-3 lines. Could be more compact.

**Recommendation:** Use table format instead of bullet list for validation rules.

### C13: Summary Section (Lines 27-49)
**Issue:** Similar verbosity - could use table format.

**Recommendation:** Consolidate into schema + validation table.

### C14: Repeated "Required" Annotations
**Issue:** Every field says "(required)" inline, then validation rules repeat required status.

**Recommendation:** Use single table with Required column instead of inline annotations.

---

## 2. GAPS

### G1: Missing Validation - Duplicate Milestone IDs
**Location:** Timeline Integrity section (lines 238-244)

**Gap:** No validation rule prevents two milestones from having identical IDs.

**Recommendation:** Add: "✓ All milestone IDs are unique"

### G2: Missing Edge Case - Weekend Project Start Date
**Location:** Workback Integrity section (lines 246-251)

**Gap:** Validation checks that deploy date and completion dates are weekdays, but doesn't address what happens if calculated project_start_date falls on weekend.

**Recommendation:** Add validation rule: "✓ project_start_date is a weekday (if weekend, adjusted to previous Friday)"

### G3: Ambiguous Round Suffix Behavior
**Location:** Line 107

**Gap:** Says round suffix "may be omitted" when qa_rounds==1, but doesn't specify if this is:
- Implementation choice (both `post-qa-deadline` and `post-qa-r1-deadline` are valid)
- Required behavior (MUST omit)
- Recommended behavior (SHOULD omit)

**Recommendation:** Clarify: "When qa_rounds == 1, round suffix SHOULD be omitted (use `post-qa-deadline` not `post-qa-r1-deadline`)."

### G4: Missing Migration Path for definition-of-done.yaml
**Location:** Line 279

**Gap:** States definition-of-done.yaml is "deprecated, now merged into milestones.yaml" but doesn't explain:
- Which version deprecated it
- How to migrate existing files
- What fields moved where

**Recommendation:** Either remove mention of deprecated file OR add footnote: "deprecated in milestones.yaml v1.1.0 (moved to acceptance_criteria and exit_checklist fields)"

### G5: No Maximum Bounds for QA Parameters
**Location:** Validation Rules for qa_rounds and qa_days_per_round (lines 46-47)

**Gap:** Only validates ≥1, no upper bounds. Should flag unrealistic values (e.g., 50 QA rounds, 100 days per round).

**Recommendation:** Add: "qa_rounds: Integer 1-10 (warn if >5)", "qa_days_per_round: Integer 1-20 (warn if >10)"

### G6: Ambiguous Business Day Arithmetic - Deploy Date Inclusion
**Location:** Date Calculation section (lines 159-163)

**Gap:** Doesn't clarify whether production_deploy_date is day 0 or day N in the count. If post-signoff completion_day is 80 and total_delivery_days is 80, is the deploy date the 80th day counted or the anchor point?

**Recommendation:** Add explicit example: "If total_delivery_days=80 and production_deploy_date=2026-06-05, then day 80 completes on 2026-06-05. Counting backwards 80 business days gives project_start_date (day 0)."

### G7: Missing Validation - Start Before Completion
**Location:** Timeline Integrity (lines 238-244)

**Gap:** No explicit check that for every item: start_day ≤ completion_day

**Recommendation:** Add: "✓ For all items: start_day ≤ completion_day"

### G8: Missing Field - Multi-PR Merge Timing
**Location:** Multi-PR Delivery Phase Entry (lines 109-138)

**Gap:** Line 137 says merge happens "Same day as review-feedback completion" but the schema shows estimated_days: 0. Doesn't clarify if merge start_day equals feedback completion_day or feedback completion_day + 1.

**Recommendation:** Add clarification: "start_day and completion_day both equal the completion_day of [milestone-id]-review-feedback"

---

## 3. CLARITY ISSUES

### CL1: Document Purpose Mixes "What" and "How" (Line 6)
**Current:** "Transforms milestones into a complete delivery schedule..."

**Issue:** Reads like skill description (action verb), not document specification.

**Recommendation:** "Complete delivery schedule with relative-day timeline and calendar workback, generated from milestones.yaml by delivery-timeline skill."

### CL2: total_delivery_days Validation Logic Error (Lines 42-44)
**Current:** "total_delivery_days: Positive integer, ≥ total_development_days"

**Issue:** Should be ">" not "≥" because post-development phases always add at least 1 day (deployment).

**Recommendation:** "total_delivery_days: Positive integer, > total_development_days (development + post-development phases)"

### CL3: Confusing Asterisk Notation in Table (Lines 97-103)
**Current:** Uses "*3 if first of multiple QA rounds" notation mixing two conditional paths

**Issue:** Dual-condition footnotes are hard to parse. Reader must mentally evaluate "if R==1 AND qa_rounds>1" vs "if R==qa_rounds OR qa_rounds==1".

**Recommendation:** Replace with explicit rows or use decision table:
```
| Phase | Duration when qa_rounds=1 | Duration when qa_rounds>1 AND round=1 | Duration when qa_rounds>1 AND round>1 |
```

### CL4: project_start_date Calculation Unclear (Line 154)
**Current:** "Calculated as production_deploy_date minus total_delivery_days business days"

**Issue:** Doesn't clarify if this is inclusive or exclusive counting.

**Recommendation:** "production_deploy_date minus total_delivery_days business days (deploy date is day N, project start is day 0)"

### CL5: Inconsistent Field Name for Production Deploy (Line 171)
**Current:** Schema shows `start_date`/`completion_date` for timeline items, but production-deploy uses `date`

**Issue:** Field name change not explained in schema section.

**Recommendation:** In schema (lines 166-172), explicitly note: "Production deploy entry uses `date` field (not start_date/completion_date) since it's a point-in-time event."

### CL6: Confusing Multi-PR Validation Phrasing (Lines 254-256)
**Current:** Two bullets both mention "post-pr-creation through post-merge" but with opposite meaning

**Issue:** Negative conditions ("no X", "omits Y") are harder to parse than positive assertions.

**Recommendation:** Rephrase as positive checks:
- "✓ Multi-pr timeline contains per-milestone PR phases"
- "✓ Multi-pr post-dev phases start with post-deployment (omit post-pr-* phases)"
- "✓ Standard strategy post-dev phases include post-pr-creation through post-merge"
- "✓ Standard strategy timeline contains no per-milestone PR phases"

### CL7: Extended QA Duration Logic Complex (Lines 262-263)
**Current:** "First QA round (if multiple rounds) uses extended durations (3 days impl, 2 days feedback)"

**Issue:** Conditional embedded in prose. Requires reader to parse "if multiple rounds" parenthetical.

**Recommendation:** Use decision table:
```
QA Feedback Duration Rules:
- qa_rounds == 1: feedback-impl = 2 days, feedback = 1 day
- qa_rounds > 1 AND round == 1: feedback-impl = 3 days, feedback = 2 days
- qa_rounds > 1 AND round > 1: feedback-impl = 2 days, feedback = 1 day
```

### CL8: Timeline Integrity "Strictly Increasing" Ambiguous (Line 241)
**Current:** "completion_day values strictly increasing for sequential milestones"

**Issue:** "Strictly increasing" is mathematically precise but "sequential milestones" is undefined. Does this mean milestones with dependencies or milestones in array order?

**Recommendation:** "✓ For each milestone with a single dependency: completion_day > dependency's completion_day"

### CL9: is_large_project Threshold Description (Lines 217-226)
**Current:** Explains formula, impact, then notes user override, but ordering makes it seem like the flag controls behavior.

**Issue:** Causal relationship unclear. Flag is derived from metrics but doesn't drive QA rounds.

**Recommendation:** Reorder: "Projects with >30 dev days OR >5 milestones are flagged as is_large_project (informational only). User-specified qa_rounds always takes precedence."

### CL10: Parallel Milestones Definition Missing (Line 242)
**Current:** "Parallel milestones have correct independent completion_day values"

**Issue:** "Parallel milestones" not defined in document. Reader must infer from context.

**Recommendation:** Add definition: "Parallel milestones (milestones sharing the same dependency) have independent completion_day values calculated from shared start_day."

### CL11: Gap Analysis Checklist vs Validation Summary Confusion (Lines 230 & 313)
**Current:** Two sections with similar names and overlapping content

**Issue:** Unclear which one to use. "Gap Analysis Checklist" sounds like it's for finding problems, "Validation Summary" sounds like confirmation.

**Recommendation:** Merge into single "Validation Checklist" section. Remove "Summary" from title to avoid confusion.

---

## 4. RECOMMENDATIONS SUMMARY

### High Priority (Accuracy/Completeness)
1. Fix total_delivery_days validation (CL2) - math error
2. Add duplicate ID validation (G1) - prevents invalid files
3. Clarify round suffix behavior (G3) - removes ambiguity
4. Add start ≤ completion validation (G7) - basic integrity check
5. Clarify business day arithmetic (G6) - prevents miscalculation

### Medium Priority (Usability)
6. Merge validation sections (C7) - reduces confusion
7. Clarify extended QA duration logic (CL7) - complex conditional
8. Define parallel milestones (CL10) - missing definition
9. Add weekend project start handling (G2) - edge case
10. Fix multi-PR validation phrasing (CL6) - clarity

### Low Priority (Concision)
11. Remove/condense: Common Patterns (C4), CLI Tools (C5), Best Practices (C6)
12. Consolidate delivery model section (C2)
13. Reduce generation process (C3)
14. Streamline integration section (C11)
15. Convert schema to table format (C12, C13, C14)

### Optional Enhancements
16. Add QA parameter bounds (G5) - prevents unrealistic inputs
17. Clarify definition-of-done migration (G4) - historical reference
18. Explain production-deploy date field (CL5) - minor inconsistency

---

## 5. ESTIMATED IMPACT

**Current:** 475 lines, ~19KB
**After High Priority:** 465 lines, ~18.5KB (-2.6%)
**After Medium Priority:** 450 lines, ~17.5KB (-7.9%)
**After Low Priority:** 380 lines, ~14.5KB (-23.7%)

**Quality Improvements:**
- 8 gaps filled (100% of identified gaps)
- 11 clarity issues resolved (100% of identified issues)
- 14 concision improvements (remove ~95 lines of redundant/speculative content)

---

## 6. NEXT STEPS

**Recommended Approach:**
1. Apply High Priority fixes first (accuracy/completeness) - 30 min
2. Review updated version with user
3. Apply Medium Priority improvements (usability) - 30 min
4. Evaluate Low Priority concision changes - user decision on how aggressive to be

**Alternative:** Apply all changes at once in single pass (~90 min total)

Would you like me to:
1. **Apply all recommended changes** and generate updated spec.md
2. **Apply high priority only** and review before continuing
3. **Show specific diffs** for each change before applying
4. **Discuss specific concerns** about any recommendations
