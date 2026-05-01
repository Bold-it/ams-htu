import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Clock,
  X,
  BellOff,
  Download,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ComplianceChart } from "@/components/ComplianceChart";
import { ExpiryTimeline } from "@/components/ExpiryTimeline";
import { AccreditationTable } from "@/components/AccreditationTable";
import { FacultyComplianceChart } from "@/components/FacultyComplianceChart";
import { AccreditationDetailModal } from "@/components/AccreditationDetailModal";
import { ExcelUpload } from "@/components/ExcelUpload";
import { AddAccreditationDialog } from "@/components/AddAccreditationDialog";
import { MonthlyReportPreviewDialog } from "@/components/MonthlyReportPreviewDialog";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { BulkEmailActions } from "@/components/BulkEmailActions";
import { UploadProgress } from "@/components/UploadProgress";
import { generateAccreditationReport, generateFullLegacyReport } from "@/lib/ReportGenerator";
import {
  Accreditation,
  AccreditationStatus,
  calculateMetrics,
  getStatusLabel,
} from "@/lib/accreditation-data";
import { useAccreditations } from "@/hooks/useAccreditations";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { accreditationKeys } from "@/hooks/useAccreditations";
import htuLogo from "@/assets/htu-logo.jpg";

import { useAuth } from "@/components/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const { role, department: userDept, logout } = useAuth();
  const isAdmin = role === "admin" || role === "super_admin";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAccreditation, setSelectedAccreditation] =
    useState<Accreditation | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<Accreditation[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalToUpload, setTotalToUpload] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [legacyFilter, setLegacyFilter] = useState<"all" | "incomplete">("all");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rawAccreditations = [], isLoading, isError } = useAccreditations();

  const accreditations = useMemo(() => {
    let filtered = rawAccreditations;

    // 1. Apply Role-based scoping first
    if (role !== 'super_admin' && !(role === 'admin' && (!userDept || userDept.trim().toLowerCase() === 'general'))) {
      if (userDept && userDept.trim()) {
        const normalizedUserDept = userDept.trim().toLowerCase();
        filtered = filtered.filter(a => 
          a.department && a.department.trim().toLowerCase() === normalizedUserDept
        );
      }
    }

    // Filters now handled within the table component

    // 3. Legacy Completeness Filter
    if (legacyFilter === "incomplete") {
      filtered = filtered.filter(a => !a.remarks || !a.firstAccreditationDate);
    }

    return filtered;
  }, [rawAccreditations, role, userDept, legacyFilter]);

  const metrics = useMemo(
    () => calculateMetrics(accreditations),
    [accreditations]
  );

  // Handle Excel upload → insert into DB
  // Handle Excel upload → insert into DB
  const handleDataLoaded = async (data: Accreditation[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setTotalToUpload(data.length);
    setUploadComplete(false);

    let successCount = 0;
    let failCount = 0;
    
    // Use parallel processing for faster uploads
    await Promise.all(data.map(async (a) => {
      const { error } = await api.addAccreditation({
        programme_name: a.programmeName,
        accreditation_type: a.accreditationType,
        faculty: a.faculty,
        department: a.department,
        start_date: a.startDate || '',
        expiry_date: a.expiryDate,
        email: a.email || '',
        workflow_status: a.workflowStatus,
        institution_id: a.institutionId || 'HTU',
        remarks: a.remarks || '',
        programme_category: a.programmeCategory || 'EP',
        first_accreditation_date: a.firstAccreditationDate || '',
      });
      
      if (!error) {
        successCount++;
        setUploadProgress(prev => prev + 1);
      } else {
        failCount++;
        console.error(`Failed to import "${a.programmeName}":`, error);
      }
    }));

    if (successCount > 0) {
      setUploadComplete(true);
      if (failCount > 0) {
        toast.warning(`Imported ${successCount} programmes, but ${failCount} failed. Check console for details.`);
      } else {
        toast.success(`Successfully imported ${successCount} programmes.`);
      }
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
      
      // Auto-hide progress after a delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadComplete(false);
      }, 5000);
    } else {
      setIsUploading(false);
      toast.error("Failed to import accreditations");
    }
  };

  const handleRowClick = (accreditation: Accreditation) => {
    setSelectedAccreditation(accreditation);
    setDetailModalOpen(true);
  };

  const handleSendReminder = (accreditation: Accreditation) => {
    setEmailRecipients([accreditation]);
    setEmailModalOpen(true);
  };

  const handleSendToWarning = () => {
    setEmailRecipients(accreditations.filter((a) => a.status === "warning" && a.email));
    setEmailModalOpen(true);
  };

  const handleSendToCritical = () => {
    setEmailRecipients(accreditations.filter((a) => (a.status === "critical" || a.status === "expired") && a.email));
    setEmailModalOpen(true);
  };

  const handleSendToSelected = () => {
    setEmailRecipients(accreditations.filter((a) => selectedIds.has(a.id) && a.email && a.status !== "active"));
    setEmailModalOpen(true);
  };

  const handleDelete = async (accreditation: Accreditation) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${accreditation.programmeName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    const { error } = await api.deleteAccreditation(accreditation.id);

    if (error) {
      toast.error(`Failed to delete accreditation: ${error}`);
    } else {
      toast.success(`Deleted "${accreditation.programmeName}"`);
      setDetailModalOpen(false);
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
    }
  };

  const handleExportExcel = async () => {
    toast.info("Preparing Excel export…");
    const { data, error } = await api.exportAccreditations();
    if (error || !data) {
      toast.error(`Export failed: ${error}`);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "HTU_Accreditations_Registry.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Registry exported successfully!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Top Actions Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border shadow-sm">
               <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
              <p className="text-slate-500 text-xs font-medium">Real-time Accreditation Overview</p>
            </div>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLegacyFilter(legacyFilter === "all" ? "incomplete" : "all")}
              className={`h-8 gap-2 text-[10px] font-bold uppercase tracking-wider ${
                legacyFilter === "incomplete" 
                ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200" 
                : "bg-white/50 border-slate-200"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {legacyFilter === "incomplete" ? "Showing Incomplete" : "Incomplete Legacy Info"}
            </Button>

            {isAdmin && (
              <>
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Registry</span>
                </Button>
                <Button
                  onClick={() => generateFullLegacyReport(accreditations)}
                  variant="default"
                  className="gap-2 bg-slate-900 hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Full Report</span>
                </Button>
                <MonthlyReportPreviewDialog />
                <ExcelUpload onDataLoaded={handleDataLoaded} />
                <AddAccreditationDialog />
              </>
            )}
          </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="mb-6 rounded-xl border bg-card p-12 text-center">
            <p className="text-slate-600 font-medium">Synchronizing records...</p>
          </div>
        )}
        {isError && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-6 text-center">
            <p className="text-destructive font-semibold">Connection Error: Failed to synchronize accreditations.</p>
          </div>
        )}

        {/* Alert Banner */}
        {accreditations.length > 0 && (
          <div className="mb-8">
            <AlertBanner metrics={metrics} />
          </div>
        )}

        {/* Empty State Hero */}
        {accreditations.length === 0 && !isLoading && (
          <div className="mb-10 rounded-xl border bg-card p-10 md:p-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 mb-8">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Secure. Compliant. Always Ready.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-500 text-lg">
              Your monitoring dashboard is currently empty. Start by digitizing your accreditation records 
              to enable automated tracking and proactive renewal warnings.
            </p>
              
              <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
                <AddAccreditationDialog />
                <div className="flex items-center gap-4">
                  <span className="h-[1px] w-8 bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Integrate</span>
                  <span className="h-[1px] w-8 bg-slate-200" />
                </div>
                <ExcelUpload onDataLoaded={handleDataLoaded} />
              </div>
              
              <div className="mt-20 grid gap-6 md:grid-cols-3 text-left">
                <div className="rounded-xl border bg-card p-6">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">GTEC Standards</h4>
                  <p className="text-sm text-slate-500">End-to-end tracking for all 5 accreditation stages.</p>
                </div>
                <div className="rounded-xl border bg-card p-6">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-4">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">Renewal Alerts</h4>
                  <p className="text-sm text-slate-500">Automated notifications sent 15 months before expiry.</p>
                </div>
                <div className="rounded-xl border bg-card p-6">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 text-white flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">Registry Export</h4>
                  <p className="text-sm text-slate-500">Instant PDF and Excel generation for university council.</p>
                </div>
              </div>
            </div>
        )}

        {/* Metric Cards */}
        {accreditations.length > 0 && (
          <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <MetricCard 
              title="Total" 
              value={metrics.total} 
              subtitle="All Programmes" 
              icon={FileSpreadsheet}
              onClick={() => navigate('/quick-look/default')}
            />
            <MetricCard 
              title="Active" 
              value={metrics.active} 
              subtitle="Fully Compliant" 
              icon={CheckCircle2} 
              variant="active" 
              onClick={() => navigate('/quick-look/active')}
            />
            <MetricCard 
              title="Upcoming" 
              value={metrics.upcoming} 
              subtitle="Prep Phase" 
              icon={Clock} 
              variant="upcoming" 
              onClick={() => navigate('/quick-look/upcoming')}
            />
            <MetricCard 
              title="Warning" 
              value={metrics.warning} 
              subtitle="Plan Renewal" 
              icon={AlertTriangle} 
              variant="warning" 
              onClick={() => navigate('/quick-look/warning')}
            />
            <MetricCard 
              title="Critical" 
              value={metrics.critical} 
              subtitle="Renew Now" 
              icon={AlertCircle} 
              variant="critical" 
              onClick={() => navigate('/quick-look/critical')}
            />
            <MetricCard 
              title="Expired" 
              value={metrics.expired} 
              subtitle="Action Taken" 
              icon={AlertCircle} 
              variant="expired" 
              onClick={() => navigate('/quick-look/expired')}
            />
            <MetricCard 
              title="Snoozed" 
              value={metrics.snoozed} 
              subtitle="Muted Alerts" 
              icon={BellOff}
              onClick={() => navigate('/quick-look/snoozed')}
            />
            <MetricCard 
              title="Pending GTEC" 
              value={metrics.not_yet_accredited} 
              subtitle="Awaiting Decision" 
              icon={ClipboardList}
              onClick={() => navigate('/quick-look/not_yet_accredited')}
            />
          </div>
        )}

        {/* Charts Row */}
        {accreditations.length > 0 && (
          <div className="animate-stagger-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="mb-8 grid gap-8 lg:grid-cols-2">
              <div className="glass-card rounded-[2rem] p-1">
                <ComplianceChart metrics={metrics} />
              </div>
              <div className="glass-card rounded-[2rem] p-1">
                <FacultyComplianceChart accreditations={accreditations} />
              </div>
            </div>

            <div className="mb-8 glass-card rounded-[2rem] p-1">
              <ExpiryTimeline accreditations={accreditations} onSelect={handleRowClick} />
            </div>
          </div>
        )}

        {/* Bulk Actions Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-stagger-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
             <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Programme Registry</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filters have been moved to table headers */}

            {isAdmin && (
              <BulkEmailActions
                accreditations={accreditations}
                selectedIds={selectedIds}
                onSendToWarning={handleSendToWarning}
                onSendToCritical={handleSendToCritical}
                onSendToSelected={handleSendToSelected}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card rounded-[2rem] overflow-hidden animate-stagger-fade-in" style={{ animationDelay: '0.6s' }}>
          <AccreditationTable
            accreditations={accreditations}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={handleRowClick}
            onSendReminder={handleSendReminder}
            isAdmin={isAdmin}
          />
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 pt-8 pb-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
               <img src={htuLogo} alt="HTU Logo" className="h-10 w-10 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
            </div>
            <p className="font-bold text-slate-400 text-xs uppercase tracking-[0.4em]">HTU Accreditation Portal v1.0</p>
            <p className="mt-2 text-[10px] text-slate-400 uppercase">OFFICE OF THE PRO-VICE CHANCELLOR · Ho Technical University</p>
          </div>
        </footer>
      </main>

      {/* Modals & Overlays */}
      <AccreditationDetailModal
        accreditation={selectedAccreditation}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onSendReminder={handleSendReminder}
        onDelete={handleDelete}
      />
      <EmailPreviewModal
        accreditations={emailRecipients}
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
      />

      {isUploading && (
        <UploadProgress 
          current={uploadProgress} 
          total={totalToUpload} 
          isComplete={uploadComplete} 
        />
      )}
    </div>
  );
};

export default Index;
