"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer relative flex size-4 shrink-0 items-center justify-center rounded-xs",
        "border border-border-strong bg-surface text-accent-ink",
        "transition-colors duration-[120ms] ease-out outline-none",
        // Widens the hit area to 40px without changing the painted box.
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "aria-invalid:border-overdue",
        "data-checked:border-accent data-checked:bg-accent",
        "data-indeterminate:border-accent data-indeterminate:bg-accent",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-3.5"
      >
        <MinusIcon
          strokeWidth={3}
          className="hidden group-data-indeterminate/checkbox:block"
        />
        <CheckIcon
          strokeWidth={3}
          className="block group-data-indeterminate/checkbox:hidden"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
