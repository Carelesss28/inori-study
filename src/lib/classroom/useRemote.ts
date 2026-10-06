"use client";

import { useCallback, useEffect, useState } from "react";

interface RemoteState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

/**
 * Loads `load()` (memoize it with useCallback), keeps the last good data while refreshing,
 * and re-polls every `intervalMs` while the tab is visible — that's what keeps a feed "live".
 */
export function useRemote<T>(load: (() => Promise<T>) | null, intervalMs = 0) {
  const [state, setState] = useState<RemoteState<T>>({ loading: true });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error: Error) => !cancelled && setState((s) => ({ ...s, error, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [load, tick]);

  useEffect(() => {
    if (!load || !intervalMs) return;
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), intervalMs);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, intervalMs, refresh]);

  return { ...state, refresh };
}
