import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
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
import { generateAccreditationReport } from "@/lib/ReportGenerator";
import {
  Accreditation,
  calculateMetrics,
} from "@/lib/accreditation-data";
import { useAccreditations } from "@/hooks/useAccreditations";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { accreditationKeys } from "@/hooks/useAccreditations";

import { useAuth } from "@/components/AuthContext";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { role, logout } = useAuth();
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
  const queryClient = useQueryClient();

  const { data: accreditations = [], isLoading, isError } = useAccreditations();

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
    for (const a of data) {
      const { error } = await api.addAccreditation({
        programme_name: a.programmeName,
        faculty: a.faculty,
        department: a.department,
        start_date: a.startDate || '',
        expiry_date: a.expiryDate,
        email: a.email || '',
      });
      if (!error) {
        successCount++;
        setUploadProgress(prev => prev + 1);
      }
    }

    if (successCount > 0) {
      setUploadComplete(true);
      toast.success(`Imported ${successCount} accreditations`);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Top Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Dashboard Overview</h2>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  onClick={() => generateAccreditationReport(accreditations, metrics)}
                  className="gap-2 bg-slate-800 hover:bg-slate-900"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Export PDF Report</span>
                </Button>
                <MonthlyReportPreviewDialog />
                <ExcelUpload onDataLoaded={handleDataLoaded} />
                <AddAccreditationDialog />
              </>
            )}
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="mb-6 rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-muted-foreground">Loading accreditations...</p>
          </div>
        )}
        {isError && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-center">
            <p className="text-destructive">Failed to load accreditations.</p>
          </div>
        )}

        {/* Alert Banner */}
        <div className="mb-6">
          <AlertBanner metrics={metrics} />
        </div>

        {/* Metric Cards */}
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard title="Total Programmes" value={metrics.total} subtitle="Registered accreditations" icon={FileSpreadsheet} />
          <MetricCard title="Active (>12mo)" value={metrics.active} subtitle="Fully compliant" icon={CheckCircle2} variant="active" />
          <MetricCard title="Warning (≤12mo)" value={metrics.warning} subtitle="Plan for renewal" icon={AlertTriangle} variant="warning" />
          <MetricCard title="Critical (≤3mo)" value={metrics.critical} subtitle="Renew immediately" icon={AlertCircle} variant="critical" />
          <MetricCard title="Expired" value={metrics.expired} subtitle="Action required" icon={AlertCircle} variant="expired" />
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <ComplianceChart metrics={metrics} />
          <FacultyComplianceChart accreditations={accreditations} />
        </div>

        <div className="mb-6">
          <ExpiryTimeline accreditations={accreditations} onSelect={handleRowClick} />
        </div>

        {/* Bulk Actions */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold">All Programmes</h3>
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

        {/* Data Table */}
        <AccreditationTable
          accreditations={accreditations}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick}
          onSendReminder={handleSendReminder}
          isAdmin={isAdmin}
        />

        {/* Footer */}
        <footer className="mt-8 border-t pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">Accreditation Monitoring System v1.0</p>
            <p className="mt-1">Quality Assurance Unit · Ho Technical University</p>
          </div>
        </footer>
      </main>

      {/* Modals */}
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
