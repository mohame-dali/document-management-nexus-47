
import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-[15px] font-medium text-slate-900 dark:text-slate-100 shadow-subtle transition-colors duration-200 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:border-[#1e3a5f] dark:focus-visible:border-blue-400 focus-visible:ring-[3px] focus-visible:ring-[#2c5282]/25 disabled:cursor-not-allowed disabled:opacity-65 disabled:bg-slate-100 dark:disabled:bg-slate-800/70 disabled:text-slate-500 dark:disabled:text-slate-400",
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
