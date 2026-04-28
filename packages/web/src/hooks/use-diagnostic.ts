import { useEffect, useRef } from "react";

/**
 * Diagnostic hook to track render count and detect what caused re-renders.
 * Usage: useDiagnostic('ComponentName', { prop1, prop2, state1, state2 })
 *
 * Logs [ComponentName #N] on each render and [ComponentName #N → #N+1 CHANGED: key1, key2] when values change.
 */
export function useDiagnostic(name: string, values: Record<string, unknown>) {
  const renderCount = useRef(0);
  const prevValues = useRef<Record<string, unknown>>({});
  const mountTime = useRef(Date.now());

  renderCount.current++;
  const count = renderCount.current;
  const elapsed = Date.now() - mountTime.current;

  const changedKeys: string[] = [];
  for (const key of Object.keys(values)) {
    if (values[key] !== prevValues.current[key]) {
      changedKeys.push(key);
    }
  }

  if (count === 1) {
    console.log(
      `[DIAG] ${name} #${count} MOUNT (+${elapsed}ms)`,
    );
  } else {
    console.log(
      `[DIAG] ${name} #${count} re-render (+${elapsed}ms)${changedKeys.length > 0 ? ` CHANGED: [${changedKeys.join(", ")}]` : " (no tracked values changed)"}`,
    );
    if (changedKeys.length > 0) {
      for (const key of changedKeys) {
        const prev = prevValues.current[key];
        const next = values[key];
        const prevStr = prev instanceof Object ? JSON.stringify(prev)?.substring(0, 80) : String(prev);
        const nextStr = next instanceof Object ? JSON.stringify(next)?.substring(0, 80) : String(next);
        console.log(`[DIAG]   ${key}: ${prevStr} → ${nextStr}`);
      }
    }
  }

  prevValues.current = { ...values };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log(`[DIAG] ${name} #${count} effect: DID_MOUNT`);
    return () => {
      console.log(`[DIAG] ${name} #${count} effect: WILL_UNMOUNT`);
    };
  }, []);
}
