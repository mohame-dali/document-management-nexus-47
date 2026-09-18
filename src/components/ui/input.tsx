import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded border border-[#e2e8f0] bg-white px-4 py-2 text-sm text-[#1a202c] shadow-xs transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#a0aec0] focus-visible:outline-none focus-visible:border-[#2c5282] focus-visible:ring-1 focus-visible:ring-[#2c5282]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f7fafc]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
