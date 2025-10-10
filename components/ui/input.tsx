import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-surface-border bg-white/90 px-4 text-sm text-neutral-800 shadow-sm transition duration-calm ease-calm placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-dark-border dark:bg-neutral-900/80 dark:text-neutral-100",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
