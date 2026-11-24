import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded border-[1.5px] border-[#94a3b8] bg-white px-4 py-2 text-[15px] text-[#0f172a] shadow-subtle transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#475569] hover:border-[#64748b] focus-visible:outline-none focus-visible:border-[#1e3a5f] focus-visible:ring-[3px] focus-visible:ring-[#2c5282]/25 disabled:cursor-not-allowed disabled:opacity-65 disabled:bg-[#f1f5f9] disabled:text-[#475569]",
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
