import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-44 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm leading-7 text-[color:var(--foreground-strong)] outline-none transition focus-visible:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[color:rgba(16,35,63,0.08)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
