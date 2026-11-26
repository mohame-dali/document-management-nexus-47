import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-10 text-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[#1e3a5f] dark:text-sky-400">
            {icon}
          </div>
        )}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-5 flex items-center justify-center gap-3">{action}</div>}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
