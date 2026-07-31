"use client";

import { useEffect, useRef } from "react";

export interface HotkeyOptions {
  /** Require ⌘ on Apple platforms / Ctrl elsewhere. */
  mod?: boolean;
  shift?: boolean;
  /** Fire even while a text field has focus. Off by default. */
  allowInInput?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
}

const TEXT_ENTRY = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (!TEXT_ENTRY.has(target.tagName)) return false;
  // Checkboxes and radios are inputs but never swallow a letter key.
  if (target instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "range"].includes(target.type);
  }
  return true;
}

function modPressed(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

/**
 * Single-key or mod-key shortcut. Keys are matched case-insensitively against
 * `event.key`, so pass "k", "/", "Enter", "Escape".
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
): void {
  const {
    mod = false,
    shift = false,
    allowInInput = false,
    enabled = true,
    preventDefault = true,
  } = options;

  // Keeps the listener stable so callers can pass an inline closure.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (mod !== modPressed(event)) return;
      if (shift !== event.shiftKey) return;
      if (event.altKey) return;
      if (!allowInInput && isTextEntry(event.target)) return;
      if (event.isComposing) return;

      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, mod, shift, allowInInput, enabled, preventDefault]);
}
