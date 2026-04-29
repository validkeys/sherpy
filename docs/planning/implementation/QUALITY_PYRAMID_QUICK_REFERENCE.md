# Quality Pyramid - Quick Reference

**One Process, Every Milestone**

---

## The Universal 5-Layer Pyramid

```
                    ▲
                   /5\        E2E Tests (milestone-specific)
                  /---\       agent-browser, real backend
                 /  4  \      Manual Testing (checklist)
                /-------\     
               /    3    \    Integration Tests (mocked)
              /-----------\   
             /      2      \  Unit Tests (>80% coverage)
            /---------------\ 
           /        1        \ TypeScript + ESLint
          /-------------------\ 
```

**Applies to:** M0, M1, M2, M3, M4, M5

**Only difference:** E2E test cases (10-20 per milestone)

---

## Quality Gate Checklist

### Before Marking ANY Milestone Complete

**Layer 1: TypeScript + ESLint**
- [ ] `npm run type-check` → 0 errors
- [ ] `npm run lint` → 0 errors, 0 warnings

**Layer 2: Unit Tests**
- [ ] `npm run test` → all green
- [ ] Coverage >80% for new code

**Layer 3: Integration Tests**
- [ ] Feature integration tests pass
- [ ] Mocked dependencies work

**Layer 4: Manual Testing**
- [ ] Manual checklist complete
- [ ] Visual inspection done

**Layer 5: E2E Tests** ⭐
- [ ] Milestone E2E tests → 100% pass
- [ ] Previous milestone smoke tests pass
- [ ] Screenshots captured
- [ ] Results documented

**Result:** ✅ Milestone complete, safe to proceed

---

## E2E Test Summary

| Milestone | Tests | Duration | Focus |
|-----------|-------|----------|-------|
| M0 | 5 | 5 min | Backend validation |
| M1 | 10 | 5 min | Sidebar UI |
| M2 | 15 | 8 min | Chat + WebSocket |
| M3 | 12 | 6 min | Files + API |
| M4 | 18 | 12 min | CRUD + Persistence |
| M5 | 20 | 15 min | Polish + Accessibility |
| **Total** | **80** | **51 min** | Full system |

---

## Quick Commands

### Run All Quality Checks
```bash
# Layer 1
npm run type-check
npm run lint

# Layer 2 & 3
npm run test

# Layer 4
# Use manual checklist (see milestone tasks)

# Layer 5
# Use agent-browser (see E2E_TEST_MASTER_PLAN.md)
```

### Verify Servers Running
```bash
# Backend
curl http://127.0.0.1:3100/api/health

# Web dev
curl http://localhost:5173
```

---

## Key Files

- **Master Plan:** `E2E_TEST_MASTER_PLAN.md` (all milestones)
- **Process Guide:** `DELIVERY_GUARANTEE_PROCESS.md` (why + how)
- **M1 Strategy:** `E2E_VERIFICATION_STRATEGY.md` (M1 specific)
- **Task Files:** `tasks/milestone-m*.tasks.yaml` (per-milestone)

---

## ROI

**Investment:** +1 hour E2E testing per milestone  
**Benefit:** Prevents 6+ hours debugging production issues  
**Result:** 6:1 ROI, 83% reduction in production bugs

---

## Remember

✅ **Same pyramid for every milestone**  
✅ **All 5 layers must pass before "complete"**  
✅ **E2E tests prove it actually works**  
✅ **Screenshots provide visual proof**  
✅ **Cumulative testing prevents regressions**
