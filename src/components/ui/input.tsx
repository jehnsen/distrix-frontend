import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  /** Mono + tabular + right-aligned. Use for every amount, qty, ID and code. */
  numeric?: boolean
}

function Input({ className, type, numeric = false, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-numeric={numeric || undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-base text-ink",
        "transition-[border-color,box-shadow] duration-[160ms] ease-out outline-none",
        "placeholder:text-ink-muted/70",
        "focus-visible:border-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted",
        "read-only:bg-surface-sunken read-only:text-ink-muted",
        "aria-invalid:border-overdue aria-invalid:focus-visible:outline-overdue",
        "file:mr-2 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        numeric && "text-right font-mono tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
