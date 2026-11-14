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
          "flex flex-col items-center justify-center rounded border border-[#cbd5e1] bg-white px-6 py-10 text-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-[#cbd5e1] bg-[#f1f5f9] text-[#1e3a5f]">
            {icon}
          </div>
        )}
        <h3 className="text-base sm:text-lg font-bold text-[#0f172a]">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 max-w-md text-sm text-[#334155] leading-relaxed">
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
