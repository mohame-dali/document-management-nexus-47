import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-[#e2e8f0] bg-[#edf2f7] text-[#1a202c] hover:bg-[#e2e8f0]",
        destructive:
          "border-[#feb2b2] bg-[#feeeee] text-[#9b2c2c] hover:bg-[#fed7d7]",
        success:
          "border-[#bbf0d0] bg-[#ebf8f1] text-[#22543d] hover:bg-[#def7ec]",
        warning:
          "border-[#fbd38d] bg-[#fef9e7] text-[#744210] hover:bg-[#feecdc]",
        info:
          "border-[#bee3f8] bg-[#ebf4ff] text-[#2c5282] hover:bg-[#dbeafe]",
        soft:
          "border-[#e2e8f0] bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]",
        outline: "border-[#cbd5e1] text-[#1a202c]",
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
