import { AlertCircle, XCircle } from "lucide-react";
import { DashboardMetrics } from "@/lib/accreditation-data";

interface AlertBannerProps {
  metrics: DashboardMetrics;
}

export function AlertBanner({ metrics }: AlertBannerProps) {
  const { critical, expired } = metrics;
  const totalUrgent = critical + expired;

  if (totalUrgent === 0) return null;

  return (
    <div className="alert-banner-critical animate-fade-in">
      {expired > 0 ? (
        <XCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {expired > 0
            ? `${expired} programme${expired > 1 ? "s" : ""} ${expired > 1 ? "have" : "has"} expired!`
            : `${critical} programme${critical > 1 ? "s" : ""} require${critical === 1 ? "s" : ""} urgent attention!`}
        </p>
        <p className="mt-0.5 text-xs opacity-80">
          {expired > 0
            ? "Immediate action required. Contact the accrediting body for reinstatement options."
            : "These programmes will expire within 3 months. Begin renewal process immediately."}
        </p>
      </div>
    </div>
  );
}
