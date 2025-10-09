import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary-300 placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
