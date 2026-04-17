# Timeline Day Calculation Fix

**Date:** 2026-04-16
**Issue:** Succeeding milestones were starting on the same day as preceding milestone completion, not the next business day

---

## Problem

The original timeline calculation had milestones starting on the same day their dependencies completed:
```
m0: day 0-5 (completes day 5)
m1: day 5-15 (starts day 5) ← WRONG: starts same day m0 completes
```

This is logically incorrect because work cannot begin on a milestone until the previous one is complete. The next milestone should start the **next business day**.

---

## Solution

Updated formula:
- **Old:** `start_day = predecessor.completion_day`
- **New:** `start_day = predecessor.completion_day + 1`

**For milestones with dependencies:**
```
start_day = max(dependency.completion_day) + 1
```

**For first milestone (no dependencies):**
```
start_day = 0
```

---

## Changes Made

### 1. Skill Definition (`/skills/delivery-timeline/SKILL.md`)

**Updated Step 6: Build the Development Timeline**
- Added explicit formula: `start_day = max(dependency.completion_day) + 1`
- Updated sequential milestone example with correct calculations
- Updated multi-PR strategy example with correct day transitions
- Clarified parallel milestone behavior (share start_day = dependency.completion_day + 1)

### 2. Specification (`/docs/specifications/timeline/spec.md`)

**Updated Milestone Entry validation:**
- Added: `start_day: Non-negative integer; equals max(dependency.completion_day) + 1 or 0 if no dependencies`

**Updated Validation Checklist:**
- Changed: "For each milestone with dependencies: completion_day > all dependency completion_days"
- To: "For each milestone with dependencies: start_day = max(dependency.completion_day) + 1"
- Added: "For each milestone: completion_day = start_day + estimated_days"
- Clarified: "Parallel milestones share the same start_day but have independent completion_day values"

### 3. Example Timeline (`/skills/delivery-timeline/examples/timeline.yaml`)

**Updated summary:**
- `total_development_days`: 55 → 63 (+8 days)
- `total_delivery_days`: 80 → 88 (+8 days)
- Added `delivery_model: foundation-first` (was missing)

**Updated milestone days (8 sequential milestones):**
```
Before (wrong):          After (correct):
m0: day 0-5             m0: day 0-5
m1: day 5-15            m1: day 6-16    (+1 start)
m2: day 15-25           m2: day 17-27   (+2 start)
m3: day 25-35           m3: day 28-38   (+3 start)
m4: day 35-43           m4: day 39-47   (+4 start)
m5: day 43-48           m5: day 48-53   (+5 start)
m6: day 48-53           m6: day 54-59   (+6 start)
m7: day 53-55           m7: day 60-63   (+7 start, +8 total)
```

**Impact:** 7 milestone transitions × 1 day gap = +7 days development time
**Total increase:** 55 → 63 development days (+8 days including final transition to post-dev)

**Updated post-development phases:** All shifted forward by 8 days (now start at day 63 instead of 55)

**Updated workback calendar dates:**
- `project_start_date`: 2026-02-13 → 2026-02-03 (10 calendar days earlier to accommodate 8 business days)
- All milestone and delivery phase calendar dates recalculated
- `post-signoff` still completes on production_deploy_date (2026-06-05)

---

## Impact Analysis

### Development Timeline Impact
For an N-milestone sequential project:
- **Old formula:** Total days = Σ(estimated_days)
- **New formula:** Total days = Σ(estimated_days) + (N - 1)

For 8 milestones:
- Old: 5+10+10+10+8+5+5+3 = 56 days (wrong by 1 due to off-by-one in original example)
- New: 5+10+10+10+8+5+5+3 + 7 transitions = 63 days

### Parallel Milestones
No change in logic - parallel milestones already shared the same start_day. Now it's explicit that they all start the day after their shared dependency completes.

### Multi-PR Strategy
Updated to clarify that after merge completes, the next milestone starts the next day:
- Old: `m1.start_day = m0-merge.completion_day`
- New: `m1.start_day = m0-merge.completion_day + 1`

---

## Validation

### Before (incorrect):
```yaml
- id: m0
  start_day: 0
  completion_day: 5
  estimated_days: 5

- id: m1
  start_day: 5         # ← Same day m0 completes
  completion_day: 15
  estimated_days: 10
  dependencies: [m0]
```

### After (correct):
```yaml
- id: m0
  start_day: 0
  completion_day: 5
  estimated_days: 5

- id: m1
  start_day: 6         # ← Next day after m0 completes
  completion_day: 16
  estimated_days: 10
  dependencies: [m0]
```

---

## Testing Checklist

When implementing this fix in the actual delivery-timeline skill code:

- [ ] Sequential milestones: Verify start_day = prev.completion_day + 1
- [ ] Parallel milestones: Verify all share start_day = dependency.completion_day + 1
- [ ] Multi-PR strategy: Verify next milestone starts day after merge
- [ ] Post-dev phases: Verify start on day after last milestone (no extra gap)
- [ ] Workback dates: Verify calendar date calculations with new day counts
- [ ] Edge case: First milestone (no dependencies) starts at day 0
- [ ] Edge case: Milestone depending on multiple parallel predecessors starts day after latest completion

---

## Files Modified

1. `/Users/kydavis/Sites/sherpy/skills/delivery-timeline/SKILL.md`
2. `/Users/kydavis/Sites/sherpy/docs/specifications/timeline/spec.md`
3. `/Users/kydavis/Sites/sherpy/skills/delivery-timeline/examples/timeline.yaml`

---

## Notes

- This fix affects **all generated timelines going forward**
- Existing timeline.yaml files should be regenerated
- The ~15% increase in development days (N-1 additional days for N milestones) should be communicated to stakeholders
- Calendar workback calculations automatically adjust based on new total_delivery_days
