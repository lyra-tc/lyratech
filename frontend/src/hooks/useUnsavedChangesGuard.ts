"use client";

import { useCallback, useState } from "react";

interface UnsavedChangesGuardOptions {
  isDirty: boolean;
  onClose: () => void;
}

interface UnsavedChangesGuard {
  /** Route every dismiss gesture (Cancel, X, ESC, backdrop) through this. */
  requestClose: () => void;
  /** Whether the "discard changes?" dialog is currently shown. */
  confirmOpen: boolean;
  /** User chose to discard: closes the dialog and the modal. */
  confirmDiscard: () => void;
  /** User chose to keep editing: closes the dialog only. */
  cancelDiscard: () => void;
}

/**
 * Guards a form modal against losing unsaved edits. When `isDirty`, a dismiss
 * gesture opens a confirmation dialog instead of closing immediately; when the
 * form matches its initial state, it closes straight away.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onClose,
}: UnsavedChangesGuardOptions): UnsavedChangesGuard {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => setConfirmOpen(false), []);

  return { requestClose, confirmOpen, confirmDiscard, cancelDiscard };
}
