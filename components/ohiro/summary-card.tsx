"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  variant?: "default" | "positive" | "warning" | "critical" | "accent";
  className?: string;
  badge?: React.ReactNode;
}

const variantStyles = {
  default: "border-border/40 bg-card/60",
  positive: "border-[hsl(var(--risk-low))/20] bg-[hsl(var(--risk-low))/5]",
  warning: "border-[hsl(var(--risk-medium))/20] bg-[hsl(var(--risk-medium))/5]",
  critical: "border-[hsl(var(--risk-critical))/20] bg-[hsl(var(--risk-critical))/5]",
  accent: "border-[hsl(var(--accent))/20] bg-[hsl(var(--accent))/5]",
};

const iconStyles = {
  default: "text-muted-foreground",
  positive: "text-[hsl(var(--risk-low))]",
  warning: "text-[hsl(var(--risk-medium))]",
  critical: "text-[hsl(var(--risk-critical))]",
  accent: "text-[hsl(var(--accent))]",
};

const valueStyles = {
  default: "text-foreground",
  positive: "text-[hsl(var(--risk-low))]",
  warning: "text-[hsl(var(--risk-medium))]",
  critical: "text-[hsl(var(--risk-critical))]",
  accent: "text-[hsl(var(--accent))]",
};

export function SummaryCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  trend,
  trendLabel,
  variant = "default",
  className,
  badge,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 backdrop-blur-sm transition-all duration-200 hover:border-opacity-60",
        variantStyles[variant],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("p-1.5 rounded-md bg-card/80", iconStyles[variant])}>
              <Icon className="size-4" />
            </div>
          )}
          <span className="text-xs font-mono font-medium text-muted-foreground tracking-wider uppercase">
            {title}
          </span>
        </div>
        {badge}
      </div>

      {/* Value */}
      <div className={cn("text-2xl font-mono font-bold tracking-tight mb-1", valueStyles[variant])}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs font-mono text-muted-foreground">{subtitle}</div>
      )}

      {/* Trend */}
      {trendLabel && (
        <div
          className={cn(
            "mt-2 text-xs font-mono flex items-center gap-1",
            trend === "up" && "text-[hsl(var(--risk-low))]",
            trend === "down" && "text-[hsl(var(--risk-critical))]",
            trend === "neutral" && "text-muted-foreground"
          )}
        >
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trend === "neutral" && "—"}
          {trendLabel}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
