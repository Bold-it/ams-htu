import { X, Calendar, Clock, Mail, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accreditation,
  formatDisplayDate,
  formatDaysUntilExpiry,
  getStatusLabel,
} from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";
import { differenceInDays, parseISO } from "date-fns";

interface AccreditationDetailModalProps {
  accreditation: Accreditation | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReminder: (accreditation: Accreditation) => void;
  onDelete: (accreditation: Accreditation) => void;
}

export function AccreditationDetailModal({
  accreditation,
  isOpen,
  onClose,
  onSendReminder,
  onDelete,
}: AccreditationDetailModalProps) {
  if (!accreditation) return null;

  const {
    programmeName,
    startDate,
    expiryDate,
    email,
    daysUntilExpiry,
    status,
  } = accreditation;

  // Calculate progress through accreditation cycle
  const totalDays = startDate
    ? differenceInDays(parseISO(expiryDate), parseISO(startDate))
    : 0;
  const elapsedDays = startDate
    ? differenceInDays(new Date(), parseISO(startDate))
    : 0;
  const progressPercent =
    totalDays > 0 ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : 0;

  const getProgressClass = () => {
    switch (status) {
      case "active":
        return "progress-active";
      case "warning":
        return "progress-warning";
      case "critical":
        return "progress-critical";
      case "expired":
        return "progress-expired";
    }
  };

  const getRecommendedActions = () => {
    switch (status) {
      case "active":
        return [
          "Continue routine monitoring",
          "Schedule next review in 6 months",
          "Maintain accreditation documentation",
        ];
      case "warning":
        return [
          "Initiate renewal application process",
          "Gather required documentation",
          "Contact accrediting body for requirements",
          "Allocate budget for renewal fees",
          "Assign renewal coordinator",
        ];
      case "critical":
        return [
          "Escalate to department leadership",
          "Submit renewal application immediately",
          "Request expedited processing if available",
          "Prepare contingency plans",
          "Daily progress monitoring",
        ];
      case "expired":
        return [
          "Notify all stakeholders immediately",
          "Contact accrediting body for reinstatement options",
          "Assess impact on current students",
          "Implement emergency remediation plan",
          "Document lessons learned",
        ];
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <DialogTitle className="text-lg">{programmeName}</DialogTitle>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dates Section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Start Date
              </div>
              <p className="mt-1 font-semibold">
                {formatDisplayDate(startDate)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Expiry Date
              </div>
              <p className="mt-1 font-semibold">
                {formatDisplayDate(expiryDate)}
              </p>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time Remaining
            </div>
            <p className="mt-1 text-xl font-bold">
              {formatDaysUntilExpiry(daysUntilExpiry)}
            </p>

            {/* Progress Bar */}
            {startDate && (
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>{formatDisplayDate(startDate)}</span>
                  <span>{formatDisplayDate(expiryDate)}</span>
                </div>
                <div className="progress-timeline">
                  <div
                    className={`progress-timeline-fill ${getProgressClass()}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {Math.round(progressPercent)}% of accreditation cycle completed
                </p>
              </div>
            )}
          </div>

          {/* Contact Email */}
          {email && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Contact Email
              </div>
              <p className="mt-1 font-medium">{email}</p>
            </div>
          )}

          {/* Status Alert */}
          <div
            className={`rounded-lg border p-4 ${status === "expired" || status === "critical"
              ? "border-status-critical bg-status-critical-bg"
              : status === "warning"
                ? "border-status-warning bg-status-warning-bg"
                : "border-status-active bg-status-active-bg"
              }`}
          >
            <div className="flex items-start gap-3">
              {status === "active" ? (
                <CheckCircle className="mt-0.5 h-5 w-5 text-status-active" />
              ) : (
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 ${status === "expired" || status === "critical"
                    ? "text-status-critical"
                    : "text-status-warning"
                    }`}
                />
              )}
              <div className="flex-1">
                <h4
                  className={`font-semibold ${status === "expired" || status === "critical"
                    ? "text-status-critical"
                    : status === "warning"
                      ? "text-status-warning"
                      : "text-status-active"
                    }`}
                >
                  {status === "active"
                    ? "Compliant"
                    : status === "warning"
                      ? "Renewal Planning Required"
                      : status === "critical"
                        ? "Urgent Action Required"
                        : "Accreditation Expired"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {status === "active"
                    ? "This programme is fully accredited with more than 12 months remaining."
                    : status === "warning"
                      ? "Begin the renewal process to ensure continuity of accreditation."
                      : status === "critical"
                        ? "Less than 6 months remaining. Expedite the renewal process immediately."
                        : "The accreditation has lapsed. Contact the accrediting body for reinstatement."}
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div>
            <h4 className="mb-3 font-semibold">Recommended Actions</h4>
            <ul className="space-y-2">
              {getRecommendedActions().map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              {(status === "warning" ||
                status === "critical" ||
                status === "expired") &&
                email && (
                  <Button
                    onClick={() => onSendReminder(accreditation)}
                    className="flex-1 gap-2 bg-accent hover:bg-accent/90"
                  >
                    <Mail className="h-4 w-4" />
                    Send Reminder
                  </Button>
                )}
            </div>
            <Button
              variant="destructive"
              onClick={() => onDelete(accreditation)}
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Accreditation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
