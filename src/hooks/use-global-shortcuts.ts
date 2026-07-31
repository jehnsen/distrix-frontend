"use client";

import { usePathname, useRouter } from "next/navigation";

import { findNavItem } from "@/lib/nav";
import { useUiStore } from "@/stores/ui-store";
import { useHotkey } from "@/hooks/use-hotkey";

/** Only list routes take `n` — /orders does, /orders/SO-1 does not. */
function newRecordHref(pathname: string): string | null {
  const item = findNavItem(pathname);
  if (!item || pathname !== item.href) return null;
  if (item.href === "/dashboard" || item.href === "/settings") return null;
  return `${item.href}/new`;
}

/**
 * The shell half of the keyboard map (§5): ⌘K palette, `/` search, `n` new.
 * Row navigation (j/k/Enter) belongs to DataTable and save shortcuts (⌘Enter,
 * ⌘S) belong to the form, so each stays scoped to the thing it acts on.
 */
export function useGlobalShortcuts(): void {
  const router = useRouter();
  const pathname = usePathname();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const commandOpen = useUiStore((s) => s.commandOpen);

  useHotkey("k", () => setCommandOpen(!commandOpen), { mod: true, allowInInput: true });

  // `/` is a search shorthand everywhere; it opens the palette when the page
  // has no local search box to focus.
  useHotkey("/", () => {
    const local = document.querySelector<HTMLInputElement>('[data-search-input="true"]');
    if (local) {
      local.focus();
      local.select();
      return;
    }
    setCommandOpen(true);
  });

  useHotkey("n", () => {
    const href = newRecordHref(pathname);
    if (href) router.push(href);
  });
}
