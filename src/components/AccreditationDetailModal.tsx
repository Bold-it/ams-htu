import { X, Calendar, Clock, Mail, AlertTriangle, CheckCircle, Trash2, Edit2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { accreditationKeys } from "@/hooks/useAccreditations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "super_admin";
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    programmeName: "",
    faculty: "",
    department: "",
    startDate: "",
    expiryDate: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (accreditation) {
      setFormData({
        programmeName: accreditation.programmeName,
        faculty: accreditation.faculty || "",
        department: accreditation.department || "",
        startDate: accreditation.startDate || "",
        expiryDate: accreditation.expiryDate,
        email: accreditation.email || "",
      });
      setIsEditing(false);
    }
  }, [accreditation]);

  if (!accreditation) return null;

  const {
    programmeName,
    faculty,
    department,
    startDate,
    expiryDate,
    email,
    daysUntilExpiry,
    status,
  } = accreditation;

  const handleSave = async () => {
    if (!formData.programmeName || !formData.expiryDate) {
      toast.error("Programme name and expiry date are required");
      return;
    }

    setIsSaving(true);
    const { error } = await api.updateAccreditation(accreditation.id, {
      programme_name: formData.programmeName,
      faculty: formData.faculty,
      department: formData.department,
      start_date: formData.startDate,
      expiry_date: formData.expiryDate,
      email: formData.email,
    });
    setIsSaving(false);

    if (error) {
      toast.error(`Failed to update: ${error}`);
    } else {
      toast.success("Accreditation updated successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
    }
  };

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
              {isEditing ? (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Programme Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.programmeName}
                      onChange={(e) => setFormData({ ...formData, programmeName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-faculty">Faculty / School</Label>
                      <Input
                        id="edit-faculty"
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dept">Department</Label>
                      <Input
                        id="edit-dept"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <DialogTitle className="text-lg">{programmeName}</DialogTitle>
                  {(faculty || department) && (
                    <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                      {faculty} {faculty && department && "•"} {department}
                    </p>
                  )}
                  <div className="mt-2">
                    <StatusBadge status={status} />
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expiry">Expiry Date</Label>
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* Status Alert (only show when not editing) */}
          {!isEditing && (
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
          )}

          {/* Recommended Actions (only show when not editing) */}
          {!isEditing && (
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
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1" disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex-1 gap-2 bg-primary" disabled={isSaving}>
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Close
                  </Button>
                  {isAdmin && (
                    <Button onClick={() => setIsEditing(true)} className="flex-1 gap-2 bg-slate-100 text-slate-900 hover:bg-slate-200">
                      <Edit2 className="h-4 w-4" />
                      Edit Details
                    </Button>
                  )}
                </>
              )}
            </div>

            {!isEditing && isAdmin && (
              <>
                {(status === "warning" || status === "critical" || status === "expired") && email && (
                  <Button onClick={() => onSendReminder(accreditation)} className="w-full gap-2 bg-accent hover:bg-accent/90">
                    <Mail className="h-4 w-4" />
                    Send Reminder
                  </Button>
                )}
                <Button variant="destructive" onClick={() => onDelete(accreditation)} className="w-full gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Accreditation
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
