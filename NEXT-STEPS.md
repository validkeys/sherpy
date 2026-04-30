# M2 Runtime Architecture - Next Steps

**Status:** Testing Complete, Issues Identified  
**Date:** 2026-04-30  
**Current Branch:** worktree-ui-refactor

---

## 🎯 Current Situation

### ✅ What's Working
- Runtime architecture refactored successfully
- Single runtime instance (no duplicates)
- User messages submit and display correctly
- Clean code, no console errors
- Professional UI/UX

### ❌ What Needs Fixing
- **Issue #6:** AI responses not rendering (HIGH priority)
- **Issue #7:** Sidebar skill invocation unclear (MEDIUM priority)

---

## 🚀 Immediate Next Steps (1-2 hours)

### Step 1: Debug AI Response Rendering

**File:** `packages/web/src/features/chat/hooks/use-mock-runtime.ts`

Add debugging to the `onNew` callback:

```typescript
onNew: async (message) => {
  console.log('🔵 Mock runtime onNew called with:', message);
  
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const userText = message.content
    .filter((content) => content.type === 'text')
    .map((content) => content.text)
    .join(' ');

  const response = {
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: `Mock AI response to: "${userText}"...`,
      },
    ],
  };
  
  console.log('🟢 Mock runtime returning response:', response);
  return response;
},
```

### Step 2: Check Runtime State

Add to `chat-container.tsx`:

```typescript
const runtime = useAssistantRuntime();

useEffect(() => {
  console.log('🔍 Runtime state:', runtime.getState());
}, [runtime]);
```

### Step 3: Test in Browser

```bash
cd packages/web
npm run dev
# Open http://localhost:5175
# Open DevTools Console
# Send a message
# Watch console logs
```

**Expected Console Output:**
```
🔵 Mock runtime onNew called with: {...}
🟢 Mock runtime returning response: {...}
🔍 Runtime state: { messages: [...] }
```

**If onNew is NOT called:**
- Issue: Composer not triggering runtime's message handler
- Check: Thread component configuration
- Check: AssistantRuntimeProvider setup

**If onNew IS called but response not visible:**
- Issue: Thread component not rendering assistant messages
- Check: Thread component props
- Check: Message format compatibility with @assistant-ui/react

---

## 📋 Debugging Checklist

### Check 1: Is onNew Being Called?
```typescript
// In use-mock-runtime.ts
onNew: async (message) => {
  console.log('✅ onNew called!', message);
  // ...
}
```

- [ ] If YES → Continue to Check 2
- [ ] If NO → Problem with composer/runtime integration

### Check 2: Is Response Format Correct?
```typescript
// Check @assistant-ui/react docs for exact schema
const response = {
  role: 'assistant',
  content: [{ type: 'text', text: 'Response' }],
};
```

- [ ] Verify against @assistant-ui/react documentation
- [ ] Check package version compatibility

### Check 3: Is Thread Rendering Messages?
```typescript
// In chat-container.tsx
<Thread 
  // Add debug props if available
  onMessagesChange={(msgs) => console.log('Messages:', msgs)}
/>
```

- [ ] Check Thread component props
- [ ] Verify messages array updates

### Check 4: Is runtime.append() Working?
```typescript
// In use-chat-actions.ts
const sendMessage = (content: string) => {
  console.log('📤 Appending message:', content);
  runtime.append({
    role: 'user',
    content: [{ type: 'text', text: content }],
  });
  console.log('✅ Append complete');
};
```

- [ ] Verify append is called
- [ ] Check if append triggers onNew

---

## 🔧 Potential Fixes

### Fix 1: If onNew Not Triggering

**Problem:** `useLocalRuntime` may not handle programmatic `append()` the same as user submissions.

**Solution:** Check @assistant-ui/react docs for proper API:

```typescript
// May need to use different method
runtime.submitMessage(message);
// OR
runtime.switchToNewThread(); // If needed
```

### Fix 2: If Message Format Wrong

**Problem:** Response format may not match expected schema.

**Solution:** Match exact format from @assistant-ui examples:

```typescript
// Check official examples for correct structure
return {
  role: 'assistant',
  content: [{ 
    type: 'text', 
    text: 'Response text here' 
  }],
  // May need additional fields
};
```

### Fix 3: If Thread Not Rendering

**Problem:** Thread component may need specific configuration.

**Solution:** Check Thread component props:

```typescript
<Thread
  // May need these props
  welcome={{
    message: "Welcome message",
  }}
  // Other config options
/>
```

---

## 🎯 Success Criteria

You'll know it's fixed when:

1. **Console shows:**
   ```
   🔵 Mock runtime onNew called
   🟢 Mock runtime returning response
   ```

2. **Browser shows:**
   - User message: "Test message"
   - AI response: "Mock AI response to: 'Test message'"

3. **No errors in console**

---

## 📞 If Stuck

### Option 1: Check @assistant-ui Examples
Look at official examples:
- https://github.com/assistant-ui/assistant-ui
- Find example using `useLocalRuntime`
- Compare with our implementation

### Option 2: Check Package Versions
```bash
cd packages/web
npm list @assistant-ui/react
```

Ensure version matches expected API.

### Option 3: Simplify Test Case
Create minimal reproduction:

```typescript
// Minimal test component
function TestChat() {
  const runtime = useLocalRuntime({
    initialMessages: [],
    onNew: async (msg) => {
      console.log('Received:', msg);
      return {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
      };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime.runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

If this works → problem in our integration  
If this fails → problem with package/setup

---

## 📚 Resources

- **GitHub Issues:** https://github.com/validkeys/sherpy/issues
  - Issue #6: AI responses not rendering
  - Issue #7: Sidebar skill invocation
  - Issue #8: E2E test automation

- **Documentation:**
  - `test-results/M2-E2E-POST-FIX-VERIFICATION.md`
  - `test-results/GITHUB-ISSUES-SUMMARY.md`
  - `M2-FIXES-COMPLETE.md`
  - `E2E-TESTING-COMPLETE.md`

- **@assistant-ui Docs:**
  - https://assistant-ui.com/docs
  - Check useLocalRuntime documentation
  - Check Thread component API

---

## ⏱️ Estimated Timeline

- **Debug + Fix:** 1-2 hours
- **Test + Verify:** 30 minutes
- **Update Docs:** 15 minutes
- **Create PR:** 15 minutes

**Total:** 2-3 hours until PR ready

---

## ✅ When Complete

After fixing issues:

1. **Re-run E2E tests:**
   ```bash
   agent-browser open http://localhost:5175
   # Test scenarios manually
   ```

2. **Update documentation:**
   - Mark Issue #6 as fixed
   - Update `M2-FIXES-COMPLETE.md`
   - Update `E2E-TESTING-COMPLETE.md`

3. **Create PR:**
   ```bash
   git push origin worktree-ui-refactor
   gh pr create --title "fix(m2): refactor runtime architecture and fix duplicate runtime creation" \
     --body "Fixes runtime architecture issues and enables mock runtime for development"
   ```

4. **Celebrate! 🎉**

---

**Good luck with the debugging!** The hard part (architecture refactoring) is done. This is just integration polish.
