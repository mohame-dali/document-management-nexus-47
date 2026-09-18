import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2c5282] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#234269] shadow-xs",
        destructive:
          "bg-[#e53e3e] text-white hover:bg-[#c53030] shadow-xs",
        success:
          "bg-[#38a169] text-white hover:bg-[#2f855a] shadow-xs",
        outline:
          "border border-[#e2e8f0] bg-white text-[#2d3748] hover:bg-[#f7fafc] hover:text-[#1a202c] shadow-xs",
        secondary:
          "bg-[#edf2f7] text-[#2d3748] hover:bg-[#e2e8f0]",
        ghost: "text-[#4a5568] hover:bg-[#edf2f7] hover:text-[#1a202c]",
        link: "text-[#2c5282] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-4 text-sm",
        lg: "h-12 rounded px-6",
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
