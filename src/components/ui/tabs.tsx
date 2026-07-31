"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-3 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

/**
 * `line` is the Distrix default for document tabs (Attachments / Related /
 * Activity) — an underline reads as navigation. `segmented` is for switching a
 * view of the same data (e.g. Local vs International PO).
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch",
  {
    variants: {
      variant: {
        line: "gap-4 border-b border-border group-data-horizontal/tabs:h-9 group-data-vertical/tabs:gap-0 group-data-vertical/tabs:border-b-0 group-data-vertical/tabs:border-l",
        segmented:
          "gap-0.5 rounded-md bg-surface-sunken p-0.5 group-data-horizontal/tabs:h-8",
      },
    },
    defaultVariants: { variant: "line" },
  }
)

function TabsList({
  className,
  variant = "line",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
        "text-base font-medium text-ink-muted transition-colors duration-[160ms] ease-out",
        "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        "hover:text-ink disabled:pointer-events-none disabled:opacity-45",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Underline variant: 2px accent rule, flush with the list border.
        "group-data-[variant=line]/tabs-list:h-9 group-data-[variant=line]/tabs-list:px-0.5",
        "group-data-[variant=line]/tabs-list:data-active:text-ink",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-accent",
        "group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        "group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:inset-x-0 group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:-bottom-px group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:h-0.5",
        "group-data-[variant=line]/tabs-list:group-data-vertical/tabs:after:inset-y-0 group-data-[variant=line]/tabs-list:group-data-vertical/tabs:after:-left-px group-data-[variant=line]/tabs-list:group-data-vertical/tabs:after:w-0.5",
        "group-data-[variant=line]/tabs-list:group-data-vertical/tabs:h-8 group-data-[variant=line]/tabs-list:group-data-vertical/tabs:justify-start group-data-[variant=line]/tabs-list:group-data-vertical/tabs:px-3",
        // Segmented variant: raised white chip on the sunken track.
        "group-data-[variant=segmented]/tabs-list:h-7 group-data-[variant=segmented]/tabs-list:rounded-sm group-data-[variant=segmented]/tabs-list:px-3",
        "group-data-[variant=segmented]/tabs-list:data-active:bg-surface group-data-[variant=segmented]/tabs-list:data-active:text-ink group-data-[variant=segmented]/tabs-list:data-active:shadow-raised",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-base outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
