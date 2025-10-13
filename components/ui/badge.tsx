import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "info" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary-50 text-primary border border-primary/20",
    info: "bg-primary text-white border border-transparent",
    success: "bg-success-subtle text-success border border-success/40",
    warning: "bg-warning-subtle text-warning border border-warning/40",
    danger: "bg-danger-subtle text-danger border border-danger/40",
    neutral: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
