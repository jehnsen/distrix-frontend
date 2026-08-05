/**
 * Print routes live outside the `(app)` group deliberately: no sidebar, no top
 * bar, no command palette. What is on screen is exactly what comes out of the
 * printer, so what the clerk proofreads is what the customer receives.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-surface-sunken py-6 print:bg-white print:py-0">{children}</div>;
}
