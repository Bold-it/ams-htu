import { useParams, useNavigate } from "react-router-dom";
import { useAccreditations } from "@/hooks/useAccreditations";
import { 
  Accreditation, 
  AccreditationStatus, 
  getStatusLabel, 
  formatDisplayDate 
} from "@/lib/accreditation-data";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  FileText, 
  BellOff, 
  Search,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { useState, useMemo } from "react";
import { AccreditationDetailModal } from "@/components/AccreditationDetailModal";
import { useQueryClient } from "@tanstack/react-query";
import { accreditationKeys } from "@/hooks/useAccreditations";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthContext";
import { Input } from "@/components/ui/input";

const QuickLook = () => {
  const { status: statusParam } = useParams<{ status: string }>();
  const navigate = useNavigate();
  const { role, department: userDept } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccreditation, setSelectedAccreditation] = useState<Accreditation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: rawAccreditations = [], isLoading } = useAccreditations();

  const accreditations = useMemo(() => {
    let filtered = rawAccreditations;
    
    // Role-based filtering
    if (role !== 'super_admin' && role !== 'admin' && userDept) {
      const normalizedUserDept = userDept.trim().toLowerCase();
      filtered = filtered.filter(a => 
        a.department && a.department.trim().toLowerCase() === normalizedUserDept
      );
    }

    // Status-based filtering
    if (statusParam && statusParam !== 'default') {
      if (statusParam === 'snoozed') {
        filtered = filtered.filter(a => a.snoozedUntil && new Date(a.snoozedUntil) > new Date());
      } else {
        filtered = filtered.filter(a => a.status === statusParam);
      }
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.programmeName.toLowerCase().includes(query) || 
        a.department.toLowerCase().includes(query) ||
        a.faculty.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [rawAccreditations, role, userDept, statusParam, searchQuery]);

  const categoryTitle = useMemo(() => {
    if (!statusParam || statusParam === 'default') return "All Registered Programmes";
    if (statusParam === 'snoozed') return "Snoozed Reminders";
    return getStatusLabel(statusParam as AccreditationStatus) + " Status";
  }, [statusParam]);

  const handleRowClick = (accreditation: Accreditation) => {
    setSelectedAccreditation(accreditation);
    setDetailModalOpen(true);
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

  const handleSendReminder = (accreditation: Accreditation) => {
    // This would typically involve opening the reminder modal, 
    // but for the sake of the QuickLook page, we'll keep it simple 
    // or just rely on the DetailModal for these actions.
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs / Back */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")} 
            className="gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{categoryTitle}</h1>
            </div>
            <p className="text-muted-foreground ml-11">
              Found {accreditations.length} programmes matching this category
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search programmes..." 
                className="pl-9 w-64 bg-white border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : accreditations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {accreditations.map(acc => (
              <div 
                key={acc.id}
                onClick={() => handleRowClick(acc)}
                className="flex flex-col p-5 rounded-xl bg-white border border-slate-200 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors`} />
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {acc.programmeName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {acc.department}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold uppercase">Expiry Date</span>
                      <span className="font-bold text-slate-700">{formatDisplayDate(acc.expiryDate)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {acc.snoozedUntil && new Date(acc.snoozedUntil) > new Date() && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            <BellOff className="h-3 w-3" />
                            SNOOZED
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">View Details</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No results found</h3>
            <p className="text-muted-foreground">Adjust your filters or search query and try again.</p>
            <Button variant="link" onClick={() => { setSearchQuery(""); navigate("/"); }} className="mt-2">
              Return to dashboard
            </Button>
          </div>
        )}
      </main>

      <AccreditationDetailModal
        accreditation={selectedAccreditation}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onSendReminder={handleSendReminder}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default QuickLook;
