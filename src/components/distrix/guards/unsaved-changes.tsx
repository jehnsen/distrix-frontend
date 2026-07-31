"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Blocks a full page unload (tab close, reload, external link) while a document
 * has unsaved edits. App Router has no navigation-cancel API, so in-app links
 * are intercepted at the click.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Browsers show their own copy; returnValue only triggers the prompt.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href?.startsWith("/")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.dataset["allowDirtyNav"] === "true") return;
      if (href === window.location.pathname) return;

      event.preventDefault();
      setPendingHref(href);
    }

    // Capture phase, so the guard runs before Next's own link handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  const discard = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    // router.push is programmatic, so the click interceptor does not see it.
    if (href) router.push(href);
  }, [pendingHref, router]);

  return {
    /** Render this next to the form. */
    prompt: (
      <UnsavedChangesDialog
        open={pendingHref !== null}
        onStay={() => setPendingHref(null)}
        onDiscard={discard}
      />
    ),
  };
}

function UnsavedChangesDialog({
  open,
  onStay,
  onDiscard,
}: {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent className="w-[min(26rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>
            This document has edits that have not been saved. Leaving now discards them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStay}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            Discard edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
