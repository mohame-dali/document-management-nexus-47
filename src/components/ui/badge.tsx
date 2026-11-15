import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus:ring-[3px] focus:ring-[#2c5282] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2c5282] text-white hover:bg-[#1e3a5f]",
        secondary:
          "border-[#cbd5e1] bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]",
        destructive:
          "border-[#fca5a5] bg-[#fef2f2] text-[#7f1d1d] hover:bg-[#fee2e2]",
        success:
          "border-[#86efac] bg-[#ecfdf5] text-[#14532d] hover:bg-[#d1fae5]",
        warning:
          "border-[#f59e0b] bg-[#fef9e7] text-[#78350f] hover:bg-[#fef3c7]",
        info:
          "border-[#93c5fd] bg-[#ebf4ff] text-[#1e3a5f] hover:bg-[#dbeafe]",
        soft:
          "border-[#cbd5e1] bg-[#f1f5f9] text-[#1e293b] hover:bg-[#e2e8f0]",
        outline: "border-[#94a3b8] bg-white text-[#0f172a]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
