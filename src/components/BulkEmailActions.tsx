import { Mail, AlertTriangle, AlertCircle, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accreditation } from "@/lib/accreditation-data";

interface BulkEmailActionsProps {
  accreditations: Accreditation[];
  selectedIds: Set<string>;
  onSendToWarning: () => void;
  onSendToCritical: () => void;
  onSendToSelected: () => void;
  onClearSelection: () => void;
}

export function BulkEmailActions({
  accreditations,
  selectedIds,
  onSendToWarning,
  onSendToCritical,
  onSendToSelected,
  onClearSelection,
}: BulkEmailActionsProps) {
  const warningCount = accreditations.filter(
    (a) => a.status === "warning" && a.email
  ).length;
  const criticalCount = accreditations.filter(
    (a) => (a.status === "critical" || a.status === "expired") && a.email
  ).length;
  const selectedWithEmail = accreditations.filter(
    (a) =>
      selectedIds.has(a.id) &&
      a.email &&
      a.status !== "active"
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedIds.size > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onSendToSelected}
            disabled={selectedWithEmail === 0}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Send to Selected ({selectedWithEmail})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Clear Selection
          </Button>
          <div className="mx-2 hidden h-4 w-px bg-border sm:block" />
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onSendToWarning}
        disabled={warningCount === 0}
        className="gap-2"
      >
        <AlertTriangle className="h-4 w-4 text-status-warning" />
        <span className="hidden sm:inline">Send to All Warning</span>
        <span className="sm:hidden">Warning</span>
        <span className="rounded-full bg-status-warning/10 px-1.5 py-0.5 text-xs font-medium text-status-warning">
          {warningCount}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onSendToCritical}
        disabled={criticalCount === 0}
        className="gap-2"
      >
        <AlertCircle className="h-4 w-4 text-status-critical" />
        <span className="hidden sm:inline">Send to All Critical</span>
        <span className="sm:hidden">Critical</span>
        <span className="rounded-full bg-status-critical/10 px-1.5 py-0.5 text-xs font-medium text-status-critical">
          {criticalCount}
        </span>
      </Button>
    </div>
  );
}
