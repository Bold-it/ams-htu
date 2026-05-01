import { cn } from "@/lib/utils";
import { AccreditationStatus, getStatusLabel } from "@/lib/accreditation-data";
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, BellOff, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: AccreditationStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
  isSnoozed?: boolean;
}

export function StatusBadge({ 
  status, 
  showIcon = true, 
  size = "md",
  isSnoozed = false
}: StatusBadgeProps) {
  const badgeClasses = {
    active: "status-badge-active",
    upcoming: "status-badge-upcoming",
    warning: "status-badge-warning",
    critical: "status-badge-critical",
    expired: "status-badge-expired",
    snoozed: "bg-amber-50 text-amber-700 border-amber-200",
    not_yet_accredited: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  const icons = {
    active: CheckCircle2,
    upcoming: AlertTriangle,
    warning: AlertTriangle,
    critical: AlertCircle,
    expired: XCircle,
    snoozed: BellOff,
    not_yet_accredited: Clock,
  };

  const Icon = icons[status] || icons.active;

  return (
    <span
      className={cn(
        "status-badge",
        isSnoozed ? "bg-amber-50 text-amber-700 border-amber-200" : badgeClasses[status],
        size === "sm" && "px-2 py-0.5 text-[10px]"
      )}
    >
      {isSnoozed ? (
        <>
          <BellOff className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />
          Snoozed ({getStatusLabel(status)})
        </>
      ) : (
        <>
          {showIcon && <Icon className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />}
          {getStatusLabel(status)}
        </>
      )}
    </span>
  );
}
