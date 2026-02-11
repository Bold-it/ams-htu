import { cn } from "@/lib/utils";
import { AccreditationStatus, getStatusLabel } from "@/lib/accreditation-data";
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: AccreditationStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, showIcon = true, size = "md" }: StatusBadgeProps) {
  const badgeClasses = {
    active: "status-badge-active",
    warning: "status-badge-warning",
    critical: "status-badge-critical",
    expired: "status-badge-expired",
  };

  const icons = {
    active: CheckCircle2,
    warning: AlertTriangle,
    critical: AlertCircle,
    expired: XCircle,
  };

  const Icon = icons[status];

  return (
    <span
      className={cn(
        "status-badge",
        badgeClasses[status],
        size === "sm" && "px-2 py-0.5 text-[10px]"
      )}
    >
      {showIcon && <Icon className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />}
      {getStatusLabel(status)}
    </span>
  );
}
