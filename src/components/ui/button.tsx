import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Distrix buttons: 6px radius, no bounce, 2px accent focus ring, 13px label.
 * `default` is the one primary action on a screen; toolbars use `outline`.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-md border border-transparent font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-[160ms] ease-out",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-overdue",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-ink hover:bg-accent-strong",
        outline:
          "border-border bg-surface text-ink hover:bg-surface-sunken aria-expanded:bg-surface-sunken",
        secondary: "bg-surface-sunken text-ink hover:bg-border",
        ghost:
          "text-ink-muted hover:bg-surface-sunken hover:text-ink aria-expanded:bg-surface-sunken aria-expanded:text-ink",
        subtle: "bg-accent-wash text-accent hover:bg-accent hover:text-accent-ink",
        destructive: "bg-overdue text-ink-inverse hover:brightness-110",
        "destructive-outline":
          "border-border bg-surface text-overdue hover:border-overdue hover:bg-overdue-wash",
        link: "h-auto p-0 text-accent underline-offset-2 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-7 px-2.5 text-sm",
        default: "h-8 px-3 text-base",
        lg: "h-9 px-4 text-base",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
