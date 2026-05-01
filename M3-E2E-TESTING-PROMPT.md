# M3 Files Tab E2E Testing with agent-browser

**Branch:** `worktree-ui-refactor` (pushed to origin)  
**Location:** `/workspace/.claude/worktrees/ui-refactor`  
**Latest Commit:** `669bb4b` - "chore: apply prettier formatting to codebase"  
**Previous Commit:** `f19ab5b` - "feat(m3): complete Files Tab UI with tree view and preview"

## ✅ M3 Implementation Complete

All 13 tasks (m3-001 through m3-013) are complete:
- **Tasks 1-5:** Feature structure, API layer, state atoms (29 tests passing)
- **Tasks 6-8:** UI components - FileTreeFolder, FileTreeItem, FileTree
- **Task 9:** FilePreview with YAML syntax highlighting and Markdown rendering
- **Task 10:** Integration tests (14 new tests, 43 total passing)
- **Task 11:** Integrated into Files tab with split-pane layout
- **Task 12:** Error boundaries and loading states
- **Task 13:** Code review and quality gates passed

## 🎯 Manual E2E Testing Required

Use `/agent-browser` to perform end-to-end testing of the Files Tab feature in the running dev server.

### Dev Server Status
- **Web:** Running on `http://localhost:5173`
- **API:** Running on `http://localhost:3100`
- **Backend:** Using mock runtime (VITE_BACKEND_URL not set)

### Test Scenarios

#### 1. Initial State & Navigation
- [ ] Open browser to `http://localhost:5173`
- [ ] Verify app loads with sidebar and tabs
- [ ] Click on "Files" tab
- [ ] Verify Files tab becomes active
- [ ] Verify split-pane layout appears (tree on left, preview on right)

#### 2. File Tree Rendering
- [ ] Verify "Documents" heading appears in left panel
- [ ] Check if folders are visible (requirements, implementation, summaries, etc.)
- [ ] Verify folders are initially collapsed (no files visible)
- [ ] Check for proper folder icons and chevron indicators

#### 3. Folder Expansion/Collapse
- [ ] Click on "requirements" folder
- [ ] Verify folder expands and files appear
- [ ] Verify chevron rotates to indicate expanded state
- [ ] Verify files are listed under the folder
- [ ] Click folder again to collapse
- [ ] Verify files disappear and chevron rotates back
- [ ] Repeat for "implementation" and "summaries" folders

#### 4. File Selection & Preview
- [ ] Expand "requirements" folder
- [ ] Click on a YAML file (e.g., "business-requirements.yaml")
- [ ] Verify file gets visual selection feedback (background color, border)
- [ ] Verify preview appears in right panel
- [ ] Verify YAML content shows with syntax highlighting
- [ ] Verify document metadata shows (document type, last updated)

#### 5. Markdown Preview
- [ ] Expand "summaries" folder
- [ ] Click on a Markdown file (e.g., "executive-summary.md")
- [ ] Verify Markdown renders with formatting (headings, bold, links)
- [ ] Verify prose styling is applied

#### 6. Empty States
- [ ] If no documents exist: Verify "No documents available yet" message
- [ ] With no file selected: Verify "Select a file to preview" with icon in right panel

#### 7. Loading States
- [ ] Check for skeleton loaders during initial document fetch
- [ ] Verify smooth transition from loading to content

#### 8. Error Handling
- [ ] If API fails: Verify error message "Failed to load documents"
- [ ] Verify error boundary catches any component errors

#### 9. Tab Switching
- [ ] Switch from Files to Chat tab
- [ ] Verify Chat tab becomes active
- [ ] Switch back to Files tab
- [ ] Verify selected file and expanded folders are preserved (state persistence)

#### 10. Keyboard Navigation
- [ ] Tab to Files tab trigger
- [ ] Press Enter/Space to activate Files tab
- [ ] Tab to folders in tree
- [ ] Press Enter/Space to expand/collapse folders
- [ ] Tab to file items
- [ ] Press Enter/Space to select files

#### 11. Visual Polish
- [ ] Verify hover states on folders and files
- [ ] Verify proper indentation for nested items
- [ ] Verify icons are appropriate (folder/folder-open, file types)
- [ ] Verify responsive layout (30/70 split maintained)
- [ ] Verify scrolling works in both tree and preview panels

## 🔍 Known Limitations (Expected)

Since we're using mock runtime with no real backend documents:
- Tree may show "No documents available yet" (expected if mock doesn't provide documents)
- This is correct behavior - the UI is ready, just needs real data

## 📝 Testing Instructions

Use `/agent-browser` to:
1. Navigate to `http://localhost:5173`
2. Execute each test scenario above
3. Take screenshots of key states (initial, expanded tree, file preview, etc.)
4. Report any visual issues, layout problems, or functionality bugs
5. Verify all acceptance criteria from milestone-m3.tasks.yaml are met

## ✅ Success Criteria

All M3 acceptance criteria should be verified:
- ✓ Files tab shows tree view with all folders
- ✓ Click file displays preview inline
- ✓ YAML rendering with syntax highlighting
- ✓ Markdown rendering with formatting
- ✓ Preview pane is read-only
- ✓ Visual feedback for selected file
- ✓ React Query integration working
- ✓ Loading and error states functional

## 🚀 After Testing

If all tests pass:
1. Document any issues found
2. Create bug tickets if needed
3. Consider M3 milestone complete
4. Ready to proceed to M4 (next milestone)

## 📂 Key Files for Reference

- Feature index: `src/features/files/index.ts`
- Components: `src/features/files/components/`
  - `file-tree.tsx` - Main tree orchestration
  - `file-tree-folder.tsx` - Expandable folders
  - `file-tree-item.tsx` - Clickable files
  - `file-preview.tsx` - Preview pane
  - `files-container.tsx` - Split-pane layout
  - `files-error-boundary.tsx` - Error handling
- Tests: `src/features/files/components/*.test.tsx`
- Task plan: `docs/planning/implementation/tasks/milestone-m3.tasks.yaml`

---

**Ready for E2E testing with `/agent-browser`!**
