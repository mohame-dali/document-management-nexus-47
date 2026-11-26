import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-200 focus:outline-none focus:ring-[3px] focus:ring-[#2c5282] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2c5282] text-white hover:bg-[#1e3a5f] dark:bg-blue-600 dark:hover:bg-blue-500",
        secondary:
          "border-slate-200/80 bg-slate-100/90 text-slate-800 hover:bg-slate-200/80 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800",
        destructive:
          "border-red-200/80 bg-red-50/90 text-red-800 hover:bg-red-100/80 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80",
        success:
          "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/80",
        warning:
          "border-amber-200/80 bg-amber-50/90 text-amber-800 hover:bg-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950/80",
        info:
          "border-blue-200/80 bg-blue-50/90 text-[#1e3a5f] hover:bg-blue-100/80 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950/80",
        soft:
          "border-slate-200/80 bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800",
        outline:
          "border-slate-300/80 bg-white/90 text-slate-800 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200",
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
