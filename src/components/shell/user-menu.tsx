"use client";

import Link from "next/link";
import { Check, LogOut, Monitor, Moon, Rows3, Settings, Sun } from "lucide-react";

import { initials } from "@/lib/format";
import { COMPANY_NAME, CURRENT_USER } from "@/lib/shell-constants";
import { useUiStore, type ThemeMode } from "@/stores/ui-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function UserMenu() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const density = useUiStore((s) => s.density);
  const toggleDensity = useUiStore((s) => s.toggleDensity);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu for ${CURRENT_USER.name}`}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-wash font-medium text-accent outline-none transition-colors hover:bg-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-xs">{initials(CURRENT_USER.name)}</span>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-base font-medium text-ink">{CURRENT_USER.name}</span>
          <span className="text-xs font-normal text-ink-muted">{CURRENT_USER.role}</span>
          <span className="truncate text-xs font-normal text-ink-muted">{COMPANY_NAME}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleDensity} closeOnClick={false}>
          <Rows3 size={16} strokeWidth={1.75} />
          <span>Compact rows</span>
          {density === "compact" && (
            <Check size={16} strokeWidth={1.75} className="ml-auto text-accent" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemeMode)}
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon size={16} strokeWidth={1.75} />
              <span>{label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings size={16} strokeWidth={1.75} />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogOut size={16} strokeWidth={1.75} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
