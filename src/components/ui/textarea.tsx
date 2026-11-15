
import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded border-[1.5px] border-[#94a3b8] bg-white px-3.5 py-2.5 text-[15px] text-[#0f172a] shadow-subtle transition-colors duration-200 placeholder:text-[#475569] hover:border-[#64748b] focus-visible:outline-none focus-visible:border-[#1e3a5f] focus-visible:ring-[3px] focus-visible:ring-[#2c5282]/25 disabled:cursor-not-allowed disabled:opacity-65 disabled:bg-[#f1f5f9] disabled:text-[#475569]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
