# GitHub Issues Created - M2 E2E Testing Results

**Date:** 2026-04-30  
**Branch:** worktree-ui-refactor  
**Commit:** 88f1ac4

---

## Issues Created

### Issue #6: Mock runtime AI responses not displaying in chat thread 🐛
**Status:** Open  
**Priority:** HIGH - Blocks PR  
**URL:** https://github.com/validkeys/sherpy/issues/6

**Summary:**
User messages submit and display correctly, but AI responses from `useLocalRuntime` are not appearing in the chat thread. The mock runtime's `onNew` callback should return an AI response after 500ms, but nothing renders.

**Impact:**
- Blocks merge of M2 runtime architecture fixes
- Makes mock runtime unusable for development
- Prevents full chat functionality validation

**Root Causes (hypotheses):**
1. Thread component not rendering assistant messages
2. useLocalRuntime message format incompatible
3. Message state not triggering re-render
4. @assistant-ui/react version compatibility

**Next Steps:**
- Debug with browser DevTools
- Add logging to onNew callback
- Verify message schema against @assistant-ui docs
- Check Thread component configuration

---

### Issue #7: Sidebar skill invocation buttons not triggering chat messages 🐛
**Status:** Open  
**Priority:** MEDIUM - Blocks M2 feature validation  
**URL:** https://github.com/validkeys/sherpy/issues/7

**Summary:**
Clicking sidebar workflow step buttons (e.g., "Navigate to Business Requirements") does not send messages to the chat. Buttons register clicks without errors, but no skill commands appear.

**Impact:**
- Auto-skill invocation feature cannot be validated
- Workflow step navigation unusable
- Likely related to Issue #6

**Root Causes (hypotheses):**
1. `runtime.append()` incompatible with useLocalRuntime
2. Async errors being swallowed
3. Loading state not rendering
4. Event handler not connected properly

**Next Steps:**
- Add logging to handleStepClick and useChatActions
- Test if append() works with useLocalRuntime
- Check @assistant-ui docs for programmatic message API
- Verify loading state updates

---

### Issue #8: Add E2E test automation for M2 chat functionality 💡
**Status:** Open  
**Priority:** MEDIUM - Technical Debt  
**URL:** https://github.com/validkeys/sherpy/issues/8

**Summary:**
Enhance project with automated E2E testing for chat functionality to catch regressions early and enable CI/CD validation.

**Benefits:**
- Catch regressions before merge
- Faster feedback cycle
- Consistent test coverage
- Living documentation
- Safe refactoring

**Recommended Approach:**
- Use Playwright for E2E testing
- Cover all M2 test scenarios
- Integrate with GitHub Actions CI
- Capture screenshots/videos on failure

**Estimated Effort:** 8-12 hours

**Timeline:** Post-M2 (before M3 milestone)

---

## Issue Relationships

```
Issue #6 (AI responses) ← May be related to → Issue #7 (Sidebar invocation)
                                                ↓
                                        Both use runtime.append()
                                                ↓
                                    May be useLocalRuntime limitation
```

**Hypothesis:** If `runtime.append()` doesn't work properly with `useLocalRuntime`, it would explain both issues:
- Sidebar buttons use `append()` → no message appears (Issue #7)
- Mock runtime's `onNew` may not fire for appended messages → no AI response (Issue #6)

**Recommendation:** Debug Issue #6 first. If append() is the problem, fixing it will likely resolve Issue #7 as well.

---

## Priority Order

1. **🔴 Issue #6** - HIGH Priority (blocks PR)
   - Fix AI response rendering
   - Estimated: 1-2 hours

2. **🟡 Issue #7** - MEDIUM Priority (M2 feature)
   - Fix sidebar skill invocation
   - Estimated: 30-60 min (may auto-resolve with #6)

3. **🟢 Issue #8** - MEDIUM Priority (technical debt)
   - Add E2E test automation
   - Estimated: 8-12 hours
   - Timeline: Post-M2

---

## Success Metrics

### Before Issues Fixed
- ❌ AI responses not rendering
- ❌ Sidebar invocation not working
- ⚠️ Manual E2E testing only
- ❌ Not ready for PR

### After Issues Fixed
- ✅ AI responses render correctly
- ✅ Sidebar skill invocation works
- ✅ Full M2 functionality validated
- ✅ Ready for PR merge

### After E2E Automation (Issue #8)
- ✅ Automated test suite in CI
- ✅ Regression protection
- ✅ Faster development cycles
- ✅ Confident refactoring

---

## Team Actions

### Immediate (Today/Tomorrow)
- [ ] Assign Issue #6 to developer
- [ ] Debug AI response rendering
- [ ] Test fix in browser
- [ ] Verify Issue #7 still exists after #6 fix

### Short-term (This Week)
- [ ] Complete fixes for #6 and #7
- [ ] Re-run manual E2E tests
- [ ] Update test documentation
- [ ] Merge runtime architecture fixes to main

### Medium-term (Next Sprint)
- [ ] Assign Issue #8 to developer
- [ ] Implement Playwright E2E tests
- [ ] Set up GitHub Actions CI
- [ ] Document E2E testing workflow

---

## Documentation References

- **E2E Test Results:** `test-results/M2-E2E-POST-FIX-VERIFICATION.md`
- **Test Scenarios:** `docs/planning/implementation/m2-manual-test-scenarios.yaml`
- **Fix Documentation:** `M2-FIXES-COMPLETE.md`
- **Architecture:** `packages/web/CLAUDE.md`

---

## Notes

All issues have been created with detailed reproduction steps, code references, impact analysis, and debugging suggestions. Each issue is self-contained and actionable.

The issues follow a logical progression:
1. Fix critical bugs (blocking PR)
2. Validate feature completeness
3. Add automation (prevent future regressions)

---

**Created by:** Claude Sonnet 4.5  
**Test Tool:** agent-browser CLI  
**Next Action:** Developer assignment and bug fixing
