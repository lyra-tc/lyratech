"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `handler` whenever Escape is pressed while `enabled` is true.
 *
 * `handler` is read through a ref, so callers don't need to memoize it. Pass
 * `enabled=false` to suspend handling (e.g. while a modal is saving, or while a
 * nested confirmation dialog is stacked on top of it).
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handlerRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
