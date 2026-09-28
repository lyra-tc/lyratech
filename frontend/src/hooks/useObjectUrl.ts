"use client";

import { useEffect, useState } from "react";

/**
 * A blob: URL for previewing a local File. Revoked when the file changes or
 * on unmount. Created in an effect (not useMemo) so StrictMode's
 * mount/unmount/mount cycle can't leave us holding a revoked URL.
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}
