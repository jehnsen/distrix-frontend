"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** State the consequence, not the action. "This cannot be reversed." */
  consequence: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  /**
   * When set, the user must type this exactly. Required for destructive posts —
   * voiding an invoice, cancelling a dispatched delivery.
   */
  requireTyped?: string;
  tone?: "destructive" | "default";
}

/**
 * States what will happen, and for destructive posts makes the user type the
 * document number. Muscle memory should not be able to void an invoice.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  onConfirm,
  requireTyped,
  tone = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>
        {/* Body is a child so its typed/busy state resets on every open. */}
        <ConfirmBody
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
          tone={tone}
          {...(requireTyped !== undefined ? { requireTyped } : {})}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBody({
  confirmLabel,
  onConfirm,
  onOpenChange,
  requireTyped,
  tone,
}: {
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  requireTyped?: string;
  tone: "destructive" | "default";
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = requireTyped === undefined || typed.trim() === requireTyped;

  async function confirm() {
    if (!matches || busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {requireTyped !== undefined && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-typed">
            Type <span className="font-mono font-medium text-ink">{requireTyped}</span> to
            confirm
          </Label>
          <Input
            id="confirm-typed"
            autoComplete="off"
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirm();
              }
            }}
            className="font-mono"
            placeholder={requireTyped}
          />
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={tone === "destructive" ? "destructive" : "default"}
          disabled={!matches || busy}
          onClick={() => void confirm()}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
