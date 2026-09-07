"use client";

import { useEffect } from "react";

// `lockCount` is module-level state: a dev Fast-Refresh reload can re-run the
// effects without running their cleanups, leaving the count drifted (and the
// body stuck locked/unlocked) until a full reload. Production is unaffected.
let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lock() {
  lockCount += 1;
  if (lockCount > 1) return;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  savedOverflow = document.body.style.overflow;
  savedPaddingRight = document.body.style.paddingRight;
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

/**
 * Locks `<body>` scroll while `active` is true. Ref-counted, so stacked modals
 * (e.g. a form modal plus its "discard changes?" dialog) don't fight over
 * `body.style.overflow`. Compensates the disappearing scrollbar with matching
 * body `padding-right` so page content doesn't jump horizontally.
 *
 * The no-arg form (`useScrollLock()`) assumes the component is conditionally
 * mounted — i.e. only rendered while the modal is open. An always-mounted
 * component must pass its open state (`useScrollLock(isOpen)`); otherwise the
 * body stays locked forever.
 */
export function useScrollLock(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
