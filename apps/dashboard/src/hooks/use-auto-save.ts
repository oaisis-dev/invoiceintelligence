"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave<T>({
  data,
  onSave,
  enabled = true,
  debounceMs = 1500,
}: UseAutoSaveOptions<T>) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const isFirstRender = useRef(true);

  // Keep refs fresh via effects
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const doSave = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveState("saving");
    setSaveError(null);

    try {
      await onSaveRef.current(dataRef.current);
      isSavingRef.current = false;
      setSaveState("saved");
    } catch (err) {
      isSavingRef.current = false;
      const message = err instanceof Error ? err.message : "Save failed";
      setSaveError(message);
      setSaveState("error");
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled || isSavingRef.current) return;

    // Intentional: show "dirty" immediately when data changes, before debounce fires.
    // This is safe because the effect only runs when `data` changes (user action).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("dirty");
    setSaveError(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void doSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, enabled, debounceMs, doSave]);

  const triggerSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    void doSave();
  }, [doSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { saveState, saveError, triggerSave };
}
