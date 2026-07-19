import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

/**
 * Debounced auto-save every `delay` ms (default 7s).
 * Never saves on every keystroke — only after the quiet period elapses with a
 * dirty flag set. Concurrent saves are locked to avoid duplicate-key races.
 */
export default function useAutoSave(saveFn, { delay = 7000, enabled = true } = {}) {
  const [status, setStatus] = useState("idle"); // idle | dirty | saving | saved | conflict | error
  const [conflictPayload, setConflictPayload] = useState(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveFnRef = useRef(saveFn);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    saveFnRef.current = saveFn;
    enabledRef.current = enabled;
  }, [saveFn, enabled]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setStatus((s) => (s === "saving" ? s : "dirty"));
  }, []);

  const saveNow = useCallback(async () => {
    if (!dirtyRef.current || !enabledRef.current || savingRef.current) return;
    dirtyRef.current = false;
    savingRef.current = true;
    setStatus("saving");
    try {
      await saveFnRef.current();
      setStatus("saved");
      setConflictPayload(null);
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.data?.code === "VERSION_CONFLICT") {
        setStatus("conflict");
        setConflictPayload(err.response.data);
        dirtyRef.current = false;
      } else {
        dirtyRef.current = true;
        setStatus("error");
      }
      throw err;
    } finally {
      savingRef.current = false;
    }
  }, []);

  // Periodically flush when dirty (debounced so we save ~delay after the last edit).
  const debouncedFlush = useDebouncedCallback(() => {
    if (dirtyRef.current && !savingRef.current) saveNow().catch(() => {});
  }, delay);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      debouncedFlush();
    }, Math.max(1000, Math.floor(delay / 2)));
    return () => {
      clearInterval(id);
      debouncedFlush.cancel();
    };
  }, [enabled, delay, debouncedFlush]);

  return { status, markDirty, saveNow, conflictPayload, setStatus, setConflictPayload };
}
