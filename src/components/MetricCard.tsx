import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "active" | "upcoming" | "warning" | "critical" | "expired";
  onClick?: () => void;
  isSelected?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  onClick,
  isSelected,
}: MetricCardProps) {
  const variantClasses = {
    default: "metric-card",
    active: "metric-card metric-card-active",
    upcoming: "metric-card bg-blue-50/50 border-blue-200",
    warning: "metric-card metric-card-warning",
    critical: "metric-card metric-card-critical",
    expired: "metric-card metric-card-expired",
  };

  const iconColors = {
    default: "text-primary",
    active: "text-emerald-600",
    upcoming: "text-blue-600",
    warning: "text-amber-600",
    critical: "text-red-600",
    expired: "text-slate-600",
  };

  return (
    <div 
      className={cn(
        variantClasses[variant], 
        "animate-fade-in cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onClick}
    >
      
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "w-max rounded-2xl p-3 shadow-inner",
            variant === "default" && "bg-primary/10",
            variant === "active" && "bg-emerald-500/10",
            variant === "upcoming" && "bg-blue-500/10",
            variant === "warning" && "bg-amber-500/10",
            variant === "critical" && "bg-red-500/10",
            variant === "expired" && "bg-slate-500/10"
          )}
        >
          <Icon className={cn("h-6 w-6", iconColors[variant])} />
        </div>
        
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{title}</p>
          <p className={cn(
            "text-3xl font-black tracking-tighter",
            variant === "default" ? "text-slate-900" : iconColors[variant]
          )}>{value}</p>
          {subtitle && (
            <p className="text-[10px] font-medium text-slate-400 italic">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
