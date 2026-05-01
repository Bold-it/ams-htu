import { X, Calendar, Clock, Mail, AlertTriangle, CheckCircle, Trash2, Edit2, Save, BellOff, RefreshCcw, RotateCcw } from "lucide-react";
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
  AccreditationType,
  WorkflowStatus,
  formatDisplayDate,
  formatDaysUntilExpiry,
  getStatusLabel,
  getAccreditationTypeLabel,
} from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";
import { differenceInDays, parseISO } from "date-fns";
import WorkflowTracker from "./WorkflowTracker";
import DocumentVault from "./DocumentVault";
import ReadinessChecklist from "./ReadinessChecklist";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectGroup, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList } from "lucide-react";
import { HTU_STRUCTURE } from "@/lib/htu-structure";

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
  const [formData, setFormData] = useState<{
    programmeName: string;
    accreditationType: AccreditationType;
    faculty: string;
    department: string;
    startDate: string;
    expiryDate: string;
    email: string;
    workflowStatus: WorkflowStatus;
    institutionId: string;
    snoozedUntil: string | null;
    remarks: string;
    programmeCategory: 'EP' | 'NP';
    firstAccreditationDate: string;
  }>({
    programmeName: "",
    accreditationType: "programme",
    faculty: "",
    department: "",
    startDate: "",
    expiryDate: "",
    email: "",
    workflowStatus: "accredited",
    institutionId: "HTU",
    snoozedUntil: null,
    remarks: "",
    programmeCategory: "EP",
    firstAccreditationDate: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [customFaculty, setCustomFaculty] = useState(false);
  const [customDept, setCustomDept] = useState(false);

  useEffect(() => {
    if (accreditation) {
      setFormData({
        programmeName: accreditation.programmeName,
        accreditationType: accreditation.accreditationType,
        faculty: accreditation.faculty || "",
        department: accreditation.department || "",
        startDate: accreditation.startDate || "",
        expiryDate: accreditation.expiryDate,
        email: accreditation.email || "",
        workflowStatus: accreditation.workflowStatus,
        institutionId: accreditation.institutionId || "HTU",
        snoozedUntil: accreditation.snoozedUntil || null,
        remarks: accreditation.remarks || "",
        programmeCategory: accreditation.programmeCategory || "EP",
        firstAccreditationDate: accreditation.firstAccreditationDate || "",
      });
      setIsEditing(false);
      setCustomFaculty(false);
      setCustomDept(false);
    }
  }, [accreditation]);

  if (!accreditation) return null;

  // Values from the saved accreditation object for display mode
  const {
    programmeName: displayProgrammeName,
    faculty: displayFaculty,
    department: displayDepartment,
    startDate: displayStartDate,
    expiryDate: displayExpiryDate,
    email: displayEmail,
    daysUntilExpiry,
    status,
  } = accreditation;

  // Filter logic for edit mode dropdowns
  const selectedFaculty = HTU_STRUCTURE.find(f => f.name === formData.faculty);
  const availableDepts = selectedFaculty ? selectedFaculty.departments : [];
  const selectedDept = availableDepts.find(d => d.name === formData.department);
  const availableProgrammes = selectedDept ? selectedDept.programmes : [];

  const handleSave = async (updatedSnooze?: string | null) => {
    // Handle snooze button calls (string/null) vs Save button calls (event)
    const snoozeVal = updatedSnooze !== undefined 
      ? updatedSnooze 
      : formData.snoozedUntil;

    if (!formData.programmeName) {
      toast.error("Programme name is required");
      return;
    }

    setIsSaving(true);
    const { error } = await api.updateAccreditation(accreditation.id, {
      programme_name: formData.programmeName,
      accreditation_type: formData.accreditationType,
      faculty: formData.faculty,
      department: formData.department,
      start_date: formData.startDate,
      expiry_date: formData.expiryDate,
      email: formData.email,
      workflow_status: formData.workflowStatus,
      institution_id: formData.institutionId,
      snoozed_until: snoozeVal,
      remarks: formData.remarks,
      programme_category: formData.programmeCategory,
      first_accreditation_date: formData.firstAccreditationDate,
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

  const handleSaveStatusOnly = async (newStatus: WorkflowStatus) => {
    setIsSaving(true);
    const { error } = await api.updateAccreditation(accreditation.id, {
      programme_name: formData.programmeName,
      accreditation_type: formData.accreditationType,
      faculty: formData.faculty,
      department: formData.department,
      start_date: formData.startDate,
      expiry_date: formData.expiryDate,
      email: formData.email,
      workflow_status: newStatus,
      institution_id: formData.institutionId,
      snoozed_until: formData.snoozedUntil,
      remarks: formData.remarks,
      programme_category: formData.programmeCategory,
      first_accreditation_date: formData.firstAccreditationDate,
    });
    setIsSaving(false);

    if (error) {
      toast.error(`Failed to update status: ${error}`);
    } else {
      toast.success(`Workflow stage updated to ${newStatus.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
    }
  };

  const handleStartRenewal = async () => {
    const confirmRenewal = window.confirm(
      `Are you sure you want to start a new renewal cycle for "${displayProgrammeName}"? \n\nThis will: \n1. Reset all internal QA checkpoints \n2. Move the stage back to Self-Assessment \n3. Clear any existing snooze settings.`
    );

    if (!confirmRenewal) return;

    setIsSaving(true);
    
    // 1. Reset Checkpoints on backend
    const { error: resetError } = await api.resetCheckpoints(accreditation.id);
    if (resetError) {
      toast.error(`Failed to reset checkpoints: ${resetError}`);
      setIsSaving(false);
      return;
    }

    // 2. Update workflow status and clear snooze
    const { error: updateError } = await api.updateAccreditation(accreditation.id, {
      ...formData,
      programme_name: formData.programmeName,
      workflow_status: 'self_assessment',
      snoozed_until: null,
      remarks: formData.remarks,
      programme_category: formData.programmeCategory,
      first_accreditation_date: formData.firstAccreditationDate,
    });

    setIsSaving(false);

    if (updateError) {
      toast.error(`Failed to update workflow: ${updateError}`);
    } else {
      toast.success("Renewal cycle initiated! The programme is now in Self-Assessment.");
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
      onClose(); // Close modal to refresh everything
    }
  };

  // Calculate progress through accreditation cycle
  const totalDays = displayStartDate
    ? differenceInDays(parseISO(displayExpiryDate), parseISO(displayStartDate))
    : 0;
  const elapsedDays = displayStartDate
    ? differenceInDays(new Date(), parseISO(displayStartDate))
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
      default:
        return "";
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
      default:
        return [];
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-faculty">Faculty / School</Label>
                      {!customFaculty ? (
                        <Select 
                          value={formData.faculty} 
                          onValueChange={(val) => {
                            if (val === "OTHER") {
                              setCustomFaculty(true);
                              setFormData(f => ({ ...f, faculty: "", department: "" }));
                            } else {
                              setFormData(f => ({ ...f, faculty: val, department: "" }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Faculty" />
                          </SelectTrigger>
                          <SelectContent>
                            {HTU_STRUCTURE.map(f => (
                              <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                            ))}
                            <SelectItem value="OTHER">Other...</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Enter Faculty Name" 
                            value={formData.faculty}
                            onChange={(e) => setFormData(f => ({ ...f, faculty: e.target.value }))}
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFaculty(false)}>Reset</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="edit-dept">Department</Label>
                        {!customDept && !customFaculty ? (
                          <Select 
                            value={formData.department} 
                            disabled={!formData.faculty}
                            onValueChange={(val) => {
                              if (val === "OTHER") {
                                setCustomDept(true);
                                setFormData(f => ({ ...f, department: "" }));
                              } else {
                                setFormData(f => ({ ...f, department: val }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={formData.faculty ? "Select Department" : "Select Faculty first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDepts.map(d => (
                                <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                              ))}
                              <SelectItem value="OTHER">Other...</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter Department" 
                              value={formData.department}
                              onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => { setCustomDept(false); setCustomFaculty(false); }}>Reset</Button>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Programme Name</Label>
                      <div className="relative">
                        <Input
                          id="edit-name"
                          value={formData.programmeName}
                          onChange={(e) => setFormData({ ...formData, programmeName: e.target.value })}
                          list="edit-programme-suggestions"
                        />
                        <datalist id="edit-programme-suggestions">
                          {availableProgrammes.map(p => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Accreditation Type</Label>
                      <Select 
                        value={formData.accreditationType} 
                        onValueChange={(val: AccreditationType) => setFormData({ ...formData, accreditationType: val })}
                      >
                        <SelectTrigger id="edit-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="programme">Programme</SelectItem>
                          <SelectItem value="institutional">Institutional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <DialogTitle className="text-lg">{displayProgrammeName}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {getAccreditationTypeLabel(accreditation.accreditationType)}
                    </span>
                    {(displayFaculty || displayDepartment) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 border-l pl-2">
                        {displayFaculty} {displayFaculty && displayDepartment && "•"} {displayDepartment}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <StatusBadge 
                      status={status} 
                      isSnoozed={accreditation.snoozedUntil ? new Date(accreditation.snoozedUntil) > new Date() : false} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs for Details, Documents, and Checklist */}
          {!isEditing && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="details" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Vault
                </TabsTrigger>
                <TabsTrigger value="checklist" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Internal QA
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6">
                {/* Workflow Milestone Tracker */}
                <div className="rounded-lg border bg-slate-50/50 p-4 pb-8">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-6">
                    <Clock className="h-4 w-4" />
                    GTEC Accreditation Lifecycle
                  </div>
                  <WorkflowTracker 
                    currentStatus={accreditation.workflowStatus} 
                    isAdmin={isAdmin}
                    onStatusChange={(newStatus) => {
                      setFormData(prev => ({ ...prev, workflowStatus: newStatus }));
                      // Trigger a save with the new status immediately for "permanent change"
                      setTimeout(() => handleSaveStatusOnly(newStatus), 0);
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      First Accreditation
                    </div>
                    <p className="mt-1 font-semibold">
                      {formatDisplayDate(accreditation.firstAccreditationDate || "")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Type of Programme Existing/New (EP/NP)
                    </div>
                    <p className="mt-1 font-semibold">
                      {accreditation.programmeCategory === 'NP' ? 'New Programme (NP)' : 'Existing Programme (EP)'}
                    </p>
                  </div>
                </div>

                {/* Dates Section */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Current Start Date
                    </div>
                    <p className="mt-1 font-semibold">
                      {formatDisplayDate(displayStartDate)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Expiry Date
                    </div>
                    <p className="mt-1 font-semibold">
                      {formatDisplayDate(displayExpiryDate)}
                    </p>
                  </div>
                </div>

                {/* Remarks Section */}
                <div className="rounded-lg border p-4 bg-slate-50/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <ClipboardList className="h-4 w-4" />
                    Administrative Comments
                  </div>
                  <p className="text-sm font-medium italic text-slate-600">
                    {accreditation.remarks || "No administrative comments recorded."}
                  </p>
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
                  {displayStartDate && (
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                        <span>{formatDisplayDate(displayStartDate)}</span>
                        <span>{formatDisplayDate(displayExpiryDate)}</span>
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

                {/* Professional Renewal Workflow Trigger */}
                {(status !== "active" || accreditation.workflowStatus === 'accredited') && isAdmin && (
                  <div className="mt-6 p-4 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      Accreditation Renewal Cycle
                    </h4>
                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                      Professionally initiate the next accreditation cycle. This resets the **Internal QA Readiness Checklist** 
                      and moves the programme to **Self-Assessment** for GTEC compliance verification.
                    </p>
                    <Button 
                      onClick={handleStartRenewal} 
                      className="w-full gap-2 shadow-sm" 
                      variant="default"
                      disabled={isSaving}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isSaving ? "Initiating..." : "Start Official Renewal Process"}
                    </Button>
                  </div>
                )}

                {/* Snooze Reminders Section */}
                {isAdmin && (status !== "active") && (
                   <div className="rounded-lg border p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <BellOff className="h-4 w-4 text-slate-500" />
                        Snooze Automated Reminders
                      </div>
                      {accreditation.snoozedUntil && new Date(accreditation.snoozedUntil) > new Date() && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded uppercase">
                          Active Snooze
                        </span>
                      )}
                    </div>
                    
                    {accreditation.snoozedUntil && new Date(accreditation.snoozedUntil) > new Date() ? (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Reminders are currently silenced until <strong>{formatDisplayDate(accreditation.snoozedUntil)}</strong>.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-8 gap-2"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, snoozedUntil: null }));
                            handleSave(null);
                          }}
                        >
                          <BellOff className="h-3.5 w-3.5" />
                          Un-snooze (Resume Reminders)
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Temporarily stop automated emails while you address the renewal.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => {
                              const date = new Date();
                              date.setDate(date.getDate() + 7);
                              const dateStr = date.toISOString().split('T')[0];
                              setFormData(prev => ({ ...prev, snoozedUntil: dateStr }));
                              handleSave(dateStr);
                            }}
                          >
                            Snooze 7 Days
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => {
                              const date = new Date();
                              date.setDate(date.getDate() + 30);
                              const dateStr = date.toISOString().split('T')[0];
                              setFormData(prev => ({ ...prev, snoozedUntil: dateStr }));
                              handleSave(dateStr);
                            }}
                          >
                            Snooze 30 Days
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents">
                <DocumentVault accreditationId={accreditation.id} isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="checklist">
                <ReadinessChecklist 
                  accreditationId={accreditation.id} 
                  isAdmin={isAdmin} 
                  onSync={() => {
                    queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
                  }}
                />
              </TabsContent>
            </Tabs>
          )}

          {isEditing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-workflow">Workflow Status</Label>
                  <Select 
                    value={formData.workflowStatus} 
                    onValueChange={(val: WorkflowStatus) => setFormData({ ...formData, workflowStatus: val })}
                  >
                    <SelectTrigger id="edit-workflow">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self_assessment">Self-Assessment</SelectItem>
                      <SelectItem value="application_submitted">Application Submitted</SelectItem>
                      <SelectItem value="vetting">GTEC Vetting</SelectItem>
                      <SelectItem value="visitation">GTEC Visitation</SelectItem>
                      <SelectItem value="accredited">Fully Accredited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-institution">Institution ID</Label>
                  <Input
                    id="edit-institution"
                    value={formData.institutionId}
                    onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                  />
                </div>
              </div>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Type of Programme Existing/New (EP/NP)</Label>
                  <Select 
                    value={formData.programmeCategory} 
                    onValueChange={(val: 'EP' | 'NP') => setFormData({ ...formData, programmeCategory: val })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EP">Existing Programme (EP)</SelectItem>
                      <SelectItem value="NP">New Programme (NP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-first-date">First Accreditation Date</Label>
                  <Input
                    id="edit-first-date"
                    type="date"
                    value={formData.firstAccreditationDate}
                    onChange={(e) => setFormData({ ...formData, firstAccreditationDate: e.target.value })}
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
              <div className="space-y-2">
                <Label htmlFor="edit-remarks">Administrative Comments</Label>
                <textarea
                  id="edit-remarks"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter administrative comments..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
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
                  <Button onClick={() => handleSave()} className="flex-1 gap-2 bg-primary" disabled={isSaving}>
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
                {(status === "warning" || status === "critical" || status === "expired") && displayEmail && (
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
