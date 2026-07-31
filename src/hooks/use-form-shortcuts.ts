"use client";

import { useHotkey } from "@/hooks/use-hotkey";

/**
 * ⌘S saves a draft, ⌘Enter saves and closes (§5). Both fire while a field has
 * focus, because that is where the user's hands are.
 */
export function useFormShortcuts({
  onSaveDraft,
  onSaveAndClose,
  enabled = true,
}: {
  onSaveDraft?: () => void;
  onSaveAndClose?: () => void;
  enabled?: boolean;
}): void {
  useHotkey("s", () => onSaveDraft?.(), {
    mod: true,
    allowInInput: true,
    enabled: enabled && Boolean(onSaveDraft),
  });

  useHotkey("Enter", () => onSaveAndClose?.(), {
    mod: true,
    allowInInput: true,
    enabled: enabled && Boolean(onSaveAndClose),
  });
}
