import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "subtle" | "destructive" | "contrast";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold tracking-tight transition duration-calm ease-calm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-neutral-950";
    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-6 text-base",
    } as const;
    const variants = {
      primary: "bg-accent text-white shadow-card hover:bg-accent-600",
      secondary: "border border-primary text-primary hover:bg-primary-50",
      ghost: "text-primary hover:bg-primary-50",
      outline: "border border-neutral-300 text-neutral-800 hover:border-primary hover:text-primary",
      subtle: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
      destructive: "bg-danger text-white hover:bg-danger/90",
      contrast: "bg-white text-primary shadow-card hover:bg-neutral-100",
    } as const;
    return (
      <button ref={ref} className={cn(base, sizes[size], variants[variant], className)} {...props} />
    );
  }
);
Button.displayName = "Button";
