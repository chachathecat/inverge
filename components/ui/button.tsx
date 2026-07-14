import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-pill)] text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--primary)] text-[color:var(--text-inverse)] hover:bg-[color:var(--primary-hover)]",
        outline:
          "border border-[var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)]",
        ghost:
          "bg-transparent text-[color:var(--muted-strong)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground-strong)]",
      },
      size: {
        default: "h-11 px-5.5",
        lg: "h-12 px-6.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
