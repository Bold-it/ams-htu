import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ComplianceChart } from "@/components/ComplianceChart";
import { ExpiryTimeline } from "@/components/ExpiryTimeline";
import { AccreditationTable } from "@/components/AccreditationTable";
import { AccreditationDetailModal } from "@/components/AccreditationDetailModal";
import { ExcelUpload } from "@/components/ExcelUpload";
import { AddAccreditationDialog } from "@/components/AddAccreditationDialog";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { BulkEmailActions } from "@/components/BulkEmailActions";
import {
  Accreditation,
  calculateMetrics,
} from "@/lib/accreditation-data";
import { useAccreditations } from "@/hooks/useAccreditations";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { accreditationKeys } from "@/hooks/useAccreditations";

const Index = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAccreditation, setSelectedAccreditation] =
    useState<Accreditation | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<Accreditation[]>([]);
  const queryClient = useQueryClient();

  const { data: accreditations = [], isLoading, isError } = useAccreditations();

  const metrics = useMemo(
    () => calculateMetrics(accreditations),
    [accreditations]
  );

  // Handle Excel upload → insert into DB
  // Handle Excel upload → insert into DB
  const handleDataLoaded = async (data: Accreditation[]) => {
    let successCount = 0;
    for (const a of data) {
      const { error } = await api.addAccreditation({
        programme_name: a.programmeName,
        start_date: a.startDate || '',
        expiry_date: a.expiryDate,
        email: a.email || '',
      });
      if (!error) successCount++;
    }
    if (successCount > 0) {
      toast.success(`Imported ${successCount} accreditations`);
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
    } else {
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
            <ExcelUpload onDataLoaded={handleDataLoaded} />
            <AddAccreditationDialog />
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
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Programmes" value={metrics.total} subtitle="Registered accreditations" icon={FileSpreadsheet} />
          <MetricCard title="Active (>12mo)" value={metrics.active} subtitle="Fully compliant" icon={CheckCircle2} variant="active" />
          <MetricCard title="Warning (≤12mo)" value={metrics.warning} subtitle="Plan for renewal" icon={AlertTriangle} variant="warning" />
          <MetricCard title="Critical / Expired" value={metrics.critical + metrics.expired} subtitle={`${metrics.critical} critical, ${metrics.expired} expired`} icon={AlertCircle} variant="critical" />
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <ComplianceChart metrics={metrics} />
          <ExpiryTimeline accreditations={accreditations} onSelect={handleRowClick} />
        </div>

        {/* Bulk Actions */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold">All Programmes</h3>
          <BulkEmailActions
            accreditations={accreditations}
            selectedIds={selectedIds}
            onSendToWarning={handleSendToWarning}
            onSendToCritical={handleSendToCritical}
            onSendToSelected={handleSendToSelected}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>

        {/* Data Table */}
        <AccreditationTable
          accreditations={accreditations}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick}
          onSendReminder={handleSendReminder}
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
    </div>
  );
};

export default Index;
