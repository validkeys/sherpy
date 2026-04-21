# Manual Browser Testing Guide

This guide covers manual testing procedures for browser-related functionality that cannot be automated in integration tests.

## Browser Open Behavior (CLI Start Command)

### Overview
When running `sherpy start`, the CLI should automatically open the Sherpy UI in the default browser after the daemon starts successfully.

### Test Procedure

#### Prerequisites
- Sherpy packages built: `pnpm run build`
- No existing Sherpy daemon running: `sherpy stop`

#### macOS Testing
1. Run `sherpy start` from terminal
2. **Expected behavior:**
   - Console shows "Sherpy started on http://localhost:3100"
   - Default browser opens automatically to http://localhost:3100
   - If browser already has the tab open, it should focus/reload it
3. **Verify:**
   - Browser opens within 1-2 seconds
   - Correct URL loaded
   - Application loads successfully
4. **Test with different browsers:**
   - Set Safari as default: test
   - Set Chrome as default: test
   - Set Firefox as default: test

#### Windows Testing
1. Run `sherpy start` from Command Prompt or PowerShell
2. **Expected behavior:**
   - Console shows "Sherpy started on http://localhost:3100"
   - Default browser opens automatically to http://localhost:3100
3. **Verify:**
   - Browser opens within 1-2 seconds
   - Correct URL loaded
   - Application loads successfully
4. **Test with different browsers:**
   - Set Edge as default: test
   - Set Chrome as default: test
   - Set Firefox as default: test

#### Linux Testing
1. Run `sherpy start` from terminal
2. **Expected behavior:**
   - Console shows "Sherpy started on http://localhost:3100"
   - Default browser opens automatically to http://localhost:3100
3. **Verify:**
   - Browser opens within 1-2 seconds
   - Correct URL loaded
   - Application loads successfully
4. **Test with different browsers:**
   - Set Firefox as default: test
   - Set Chrome/Chromium as default: test
5. **Test desktop environments:**
   - GNOME: verify xdg-open works
   - KDE: verify xdg-open works
   - XFCE: verify xdg-open works

### Edge Cases to Test

#### No Default Browser Set
- **macOS:** Should still work (uses system default)
- **Windows:** Should show OS dialog to select browser
- **Linux:** May fail if xdg-open not configured - check error handling

#### Browser Already Running
- Should open new tab in existing browser instance
- Should not spawn multiple browser processes

#### Browser Blocked by Firewall/Security
- CLI should still report success
- User can manually navigate to http://localhost:3100

#### Headless/SSH Environment
- Browser open will fail (expected)
- Daemon should still start successfully
- User gets console message with URL to copy

### Troubleshooting

#### Browser doesn't open on macOS
```bash
# Test if 'open' command works
open http://localhost:3100
```

#### Browser doesn't open on Windows
```cmd
# Test if 'start' command works
start http://localhost:3100
```

#### Browser doesn't open on Linux
```bash
# Test if xdg-open is installed
which xdg-open

# Test if xdg-open works
xdg-open http://localhost:3100

# Install if missing (Debian/Ubuntu)
sudo apt-get install xdg-utils

# Install if missing (Fedora/RHEL)
sudo dnf install xdg-utils
```

### Test Checklist

- [ ] macOS - Safari
- [ ] macOS - Chrome
- [ ] macOS - Firefox
- [ ] Windows - Edge
- [ ] Windows - Chrome
- [ ] Windows - Firefox
- [ ] Linux - Firefox
- [ ] Linux - Chrome/Chromium
- [ ] Edge case: No browser configured
- [ ] Edge case: Browser already running
- [ ] Edge case: Headless environment (SSH)

### Implementation Details

**Code location:** `packages/cli/src/commands/start.ts:17-25`

```typescript
function openBrowser(url: string): void {
  const command = process.platform === "darwin" ? "open" :
                  process.platform === "win32" ? "start" : "xdg-open";

  spawn(command, [url], {
    detached: true,
    stdio: "ignore"
  }).unref();
}
```

**Design decisions:**
- Detached spawn prevents CLI from blocking
- stdio: "ignore" suppresses browser output
- unref() allows CLI to exit immediately
- 1-second delay gives daemon time to start

### Reporting Issues

If browser behavior is inconsistent:
1. Capture platform details: OS version, browser, terminal
2. Check if manual browser commands work
3. Verify daemon is running: `sherpy stop` then `sherpy start`
4. Report to: https://github.com/anthropics/sherpy/issues
