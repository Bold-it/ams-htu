import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "active" | "warning" | "critical";
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: MetricCardProps) {
  const variantClasses = {
    default: "metric-card",
    active: "metric-card metric-card-active",
    warning: "metric-card metric-card-warning",
    critical: "metric-card metric-card-critical",
  };

  const iconColors = {
    default: "text-primary",
    active: "text-status-active",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };

  return (
    <div className={cn(variantClasses[variant], "animate-fade-in")}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-2.5",
            variant === "default" && "bg-primary/10",
            variant === "active" && "bg-status-active/10",
            variant === "warning" && "bg-status-warning/10",
            variant === "critical" && "bg-status-critical/10"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColors[variant])} />
        </div>
      </div>
    </div>
  );
}
