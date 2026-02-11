import { Clock, ArrowRight } from "lucide-react";
import { Accreditation, formatDisplayDate } from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";

interface ExpiryTimelineProps {
  accreditations: Accreditation[];
  onSelect: (accreditation: Accreditation) => void;
}

export function ExpiryTimeline({ accreditations, onSelect }: ExpiryTimelineProps) {
  // Filter to show only items expiring within 12 months, sorted by urgency
  const upcomingExpirations = accreditations
    .filter((a) => a.daysUntilExpiry <= 365)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 5);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-base font-semibold">Upcoming Expirations</h3>
          <p className="text-sm text-muted-foreground">
            Next 12 months · Most urgent first
          </p>
        </div>
      </div>

      {upcomingExpirations.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              No upcoming expirations
            </p>
            <p className="text-xs text-muted-foreground/70">
              All programmes are compliant for the next 12 months
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingExpirations.map((accreditation, index) => (
            <button
              key={accreditation.id}
              onClick={() => onSelect(accreditation)}
              className="group flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-accent hover:bg-muted/50"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {accreditation.programmeName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={accreditation.status} size="sm" showIcon={false} />
                  <span className="text-xs text-muted-foreground">
                    {accreditation.daysUntilExpiry <= 0
                      ? "Expired"
                      : `${accreditation.daysUntilExpiry} days left`}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDisplayDate(accreditation.expiryDate)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
