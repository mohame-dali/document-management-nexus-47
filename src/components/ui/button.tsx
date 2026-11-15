import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2c5282] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#2c5282] text-white hover:bg-[#1e3a5f] active:bg-[#172c48] shadow-subtle",
        destructive:
          "bg-[#b91c1c] text-white hover:bg-[#991b1b] active:bg-[#7f1d1d] shadow-subtle",
        success:
          "bg-[#166534] text-white hover:bg-[#14532d] active:bg-[#052e16] shadow-subtle",
        outline:
          "border-[1.5px] border-[#94a3b8] bg-white text-[#0f172a] hover:bg-[#f1f5f9] hover:border-[#475569] shadow-subtle",
        secondary:
          "border border-[#cbd5e1] bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]",
        ghost: "text-[#1e293b] hover:bg-[#e2e8f0]/75 hover:text-[#0f172a]",
        link: "text-[#1e3a5f] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded px-4 text-sm",
        lg: "h-12 rounded px-6 text-base",
        icon: "h-11 w-11 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
