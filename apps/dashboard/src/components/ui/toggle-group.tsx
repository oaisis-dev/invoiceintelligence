"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleGroupVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md text-muted-foreground"
)

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-white data-[state=on]:shadow-[var(--shadow-button)] hover:bg-primary/5 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
  {
    variants: {
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-9 px-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function ToggleGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(toggleGroupVariants(), className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleGroupItemVariants>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-size={size}
      className={cn(toggleGroupItemVariants({ size }), className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
