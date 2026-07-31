import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 text-xs font-medium whitespace-nowrap transition-colors duration-[160ms] ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-ink",
        accent: "border-accent/20 bg-accent-wash text-accent",
        neutral: "border-border bg-neutral-wash text-ink-muted",
        paid: "border-paid/20 bg-paid-wash text-paid",
        overdue: "border-overdue/20 bg-overdue-wash text-overdue",
        partial: "border-partial/20 bg-partial-wash text-partial",
        info: "border-info/20 bg-info-wash text-info",
        outline: "border-border text-ink",
        /** For counts in nav and tabs — quiet, mono, no colour. */
        count: "min-w-5 bg-surface-sunken px-1.5 font-mono text-ink-muted tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
