import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AccreditationCheckpoint, WorkflowStatus, getWorkflowLabel } from '@/lib/accreditation-data';
import { 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertCircle,
  ClipboardCheck,
  RotateCcw,
  CheckCircle2,
  Info,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface ReadinessChecklistProps {
  accreditationId: string;
  isAdmin?: boolean;
  onSync?: () => void;
}

const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({ accreditationId, isAdmin = false, onSync }) => {
  const [checkpoints, setCheckpoints] = useState<AccreditationCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      setLoading(true);
      const { data, error } = await api.getCheckpoints(accreditationId);
      if (error) {
        toast.error(`Failed to load checkpoints: ${error}`);
      } else if (data) {
        setCheckpoints(data);
      }
      setLoading(false);
    };

    fetchCheckpoints();
  }, [accreditationId]);

  const refreshCheckpoints = async () => {
    setLoading(true);
    const { data, error } = await api.getCheckpoints(accreditationId);
    if (error) {
      toast.error(`Failed to load checkpoints: ${error}`);
    } else if (data) {
      setCheckpoints(data);
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (!isAdmin) return;

    try {
      const { error } = await api.updateCheckpoint(id, !currentStatus);
      if (error) {
        toast.error(`Update failed: ${error}`);
      } else {
        // Toggle locally
        setCheckpoints(prev => prev.map(cp => 
          cp.id === id ? { ...cp, isCompleted: !currentStatus, updatedAt: new Date().toISOString() } : cp
        ));

        // Trigger sync in parent if a milestone was cleared
        if (!currentStatus && onSync) {
           onSync();
           toast.success("Milestone cleared & GTEC Track Updated");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred during sync");
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    const { error } = await api.initializeCheckpoints(accreditationId);
    setInitializing(false);

    if (error) {
      toast.error(`Initialization failed: ${error}`);
    } else {
      toast.success('Internal QA checklist initialized with stage mapping');
      refreshCheckpoints();
      if (onSync) onSync();
    }
  };

  const completedCount = checkpoints.filter(cp => cp.isCompleted).length;
  const totalCount = checkpoints.length;
  const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isFullyReady = totalCount > 0 && completedCount === totalCount;

  // Grouping logic
  const stages: WorkflowStatus[] = ['self_assessment', 'application_submitted', 'vetting', 'visitation', 'accredited'];
  const groupedCheckpoints = checkpoints.reduce((acc, cp) => {
    const stage = cp.workflowStage || 'self_assessment';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(cp);
    return acc;
  }, {} as Record<string, AccreditationCheckpoint[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <ClipboardCheck size={18} className="text-primary" />
          Internal Readiness Checklist
        </h4>
        {totalCount > 0 && (
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-full">
            {completedCount}/{totalCount} Tasks Done
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Overall Readiness</span>
            <span>{Math.round(completionPercent)}%</span>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="animate-spin" />
          <span>Syncing QA milestones...</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="py-12 border-2 border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center gap-4">
          <Info size={32} className="opacity-50" />
          <div className="space-y-1">
            <p className="font-medium text-slate-900">No QA Checklist Found</p>
            <p className="text-sm text-slate-500">Initialize the checklist to start tracking GTEC milestones.</p>
          </div>
          <Button onClick={handleInitialize} disabled={initializing} className="gap-2">
            {initializing ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
            Initialize Stage-Synced Tasks
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {stages.map((stage) => {
            const stageTasks = groupedCheckpoints[stage];
            if (!stageTasks || stageTasks.length === 0) return null;

            const stageCompleted = stageTasks.filter(t => t.isCompleted).length;
            const isStageDone = stageCompleted === stageTasks.length;

            return (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isStageDone ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                   <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                     {getWorkflowLabel(stage)}
                   </h5>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stageCompleted}/{stageTasks.length}
                  </span>
                </div>

                <div className="grid gap-2">
                  {stageTasks.map((cp) => (
                    <div 
                      key={cp.id}
                      onClick={() => handleToggle(cp.id, cp.isCompleted)}
                      className={`flex items-start gap-3 p-3 border rounded-lg transition-all ${
                        cp.isCompleted ? 'bg-green-50/30 border-green-100 opacity-80' : 'hover:bg-slate-50 border-slate-200'
                      } ${isAdmin ? 'cursor-pointer' : ''}`}
                    >
                      {cp.isCompleted ? (
                        <CheckSquare className="text-green-600 mt-0.5 shrink-0" size={18} />
                      ) : (
                        <Square className="text-slate-300 mt-0.5 shrink-0" size={18} />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-sm ${cp.isCompleted ? 'text-green-800 line-through' : 'text-slate-900 font-medium'}`}>
                          {cp.checkpointName}
                        </p>
                        {cp.isCompleted && cp.updatedAt && (
                          <p className="text-[9px] text-green-600/70 mt-0.5">
                            Verified on {new Date(cp.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {isFullyReady && (
            <div className="bg-green-600 text-white rounded-lg p-4 flex items-center gap-3 animate-in fade-in zoom-in duration-300 shadow-lg shadow-green-200">
              <CheckCircle2 size={24} className="flex-shrink-0" />
              <div>
                <p className="font-bold">Ready for GTEC Submission</p>
                <p className="text-xs opacity-90 text-green-50">All internal quality assurance milestones have been cleared and verified.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadinessChecklist;
