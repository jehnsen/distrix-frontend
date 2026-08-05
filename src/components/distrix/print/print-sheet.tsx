"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

import { formatTin } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** GATE 9: company details come from the Settings-backed company profile. */
export const COMPANY = {
  name: "Pacific Pantry Distribution Inc.",
  address: "18 Dr. A. Santos Ave., Sucat, Parañaque, Metro Manila 1700",
  tin: "00412887600000",
  phone: "+63 2 8823 4400",
  email: "accounts@pacificpantry.ph",
  birPermit: "FP122026-0418-00291",
} as const;

/**
 * An A4 page with a print toolbar that is itself excluded from the print. The
 * sheet is a fixed 210mm so what appears on screen is laid out exactly as it
 * will be on paper — a clerk proofreading a delivery receipt should not be
 * guessing where the page breaks.
 */
export function PrintSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // The tab exists to be printed, so offer the dialog straight away.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("auto") === "1") window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div
        data-print="hide"
        className="mx-auto mb-4 flex w-[210mm] max-w-[calc(100vw-2rem)] items-center justify-between gap-3 print:hidden"
      >
        <p className="text-base text-ink-muted">
          A4 preview — what you see is what prints.
        </p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={16} strokeWidth={1.75} />
          Print
        </Button>
      </div>

      <article
        className={cn(
          "mx-auto w-[210mm] max-w-[calc(100vw-2rem)] bg-white p-[14mm] text-[10pt] leading-snug text-black",
          "shadow-overlay print:w-auto print:max-w-none print:p-0 print:shadow-none",
          className,
        )}
      >
        {children}
      </article>
    </>
  );
}

/** The letterhead every printed document shares. */
export function PrintHeader({
  docType,
  docNo,
  meta,
}: {
  docType: string;
  docNo: string;
  meta: { label: string; value: string }[];
}) {
  return (
    <header className="flex items-start justify-between gap-8 border-b-2 border-black pb-3">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[13pt] font-bold tracking-tight">{COMPANY.name}</h1>
        <p className="text-[8pt] text-neutral-700">{COMPANY.address}</p>
        <p className="text-[8pt] text-neutral-700">
          TIN {formatTin(COMPANY.tin)} · {COMPANY.phone} · {COMPANY.email}
        </p>
        <p className="text-[7.5pt] text-neutral-500">BIR Permit {COMPANY.birPermit}</p>
      </div>

      <div className="shrink-0 text-right">
        <h2 className="text-[12pt] font-bold uppercase tracking-wide">{docType}</h2>
        <p className="font-mono text-[12pt] font-semibold tabular-nums">{docNo}</p>
        <dl className="mt-1.5 flex flex-col gap-0.5 text-[8.5pt]">
          {meta.map((row) => (
            <div key={row.label} className="flex justify-end gap-2">
              <dt className="text-neutral-600">{row.label}</dt>
              <dd className="font-mono tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

export function PrintParty({
  label,
  name,
  code,
  tin,
  address,
  extra,
}: {
  label: string;
  name: string;
  code: string;
  tin?: string;
  address: string;
  extra?: { label: string; value: string }[];
}) {
  return (
    <section className="flex items-start justify-between gap-8 border-b border-neutral-300 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[7.5pt] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="text-[11pt] font-semibold">{name}</span>
        <span className="font-mono text-[8.5pt] text-neutral-600">{code}</span>
        <span className="max-w-[95mm] text-[8.5pt] text-neutral-700">{address}</span>
        {tin && (
          <span className="font-mono text-[8.5pt] text-neutral-700">
            TIN {formatTin(tin)}
          </span>
        )}
      </div>
      {extra && extra.length > 0 && (
        <dl className="flex shrink-0 flex-col gap-0.5 text-[8.5pt]">
          {extra.map((row) => (
            <div key={row.label} className="flex justify-end gap-3">
              <dt className="text-neutral-600">{row.label}</dt>
              <dd className="font-mono font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Signature blocks, which every printed logistics document needs. */
export function PrintSignatures({
  blocks,
}: {
  blocks: { label: string; name?: string; note?: string }[];
}) {
  return (
    <section className="mt-8 grid grid-cols-3 gap-6 break-inside-avoid">
      {blocks.map((block) => (
        <div key={block.label} className="flex flex-col gap-1">
          <div className="h-12 border-b border-black" />
          <span className="text-[7.5pt] font-semibold uppercase tracking-wider text-neutral-500">
            {block.label}
          </span>
          {block.name && <span className="text-[9pt] font-medium">{block.name}</span>}
          {block.note && <span className="text-[7.5pt] text-neutral-500">{block.note}</span>}
        </div>
      ))}
    </section>
  );
}
