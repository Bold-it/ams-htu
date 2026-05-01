import React from 'react';
import { WorkflowStatus, getWorkflowLabel } from '@/lib/accreditation-data';
import { CheckCircle2, Circle, Clock, Loader2, AlertCircle, PlayCircle, Info } from 'lucide-react';
import { cn } from "@/lib/utils";

interface WorkflowTrackerProps {
  currentStatus: WorkflowStatus;
  className?: string;
  onStatusChange?: (status: WorkflowStatus) => void;
  isAdmin?: boolean;
}

const statusOrder: WorkflowStatus[] = [
  'self_assessment',
  'application_submitted',
  'vetting',
  'visitation',
  'accredited'
];

const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({ 
  currentStatus, 
  className = "", 
  onStatusChange,
  isAdmin = false
}) => {
  const currentIndex = statusOrder.indexOf(currentStatus);

  const handleStepClick = (status: WorkflowStatus) => {
    if (isAdmin && onStatusChange) {
      onStatusChange(status);
    }
  };

  return (
    <div className={`w-full py-6 ${className}`}>
      <div className="flex items-center justify-between relative max-w-4xl mx-auto px-4">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        
        {/* Progress Line Active */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700 ease-in-out" 
          style={{ width: `${(currentIndex / (statusOrder.length - 1)) * 100}%` }}
        />

        {statusOrder.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const label = getWorkflowLabel(status);

          return (
            <div 
              key={status} 
              className={cn(
                "flex flex-col items-center relative z-10 w-20",
                isAdmin && "cursor-pointer group"
              )}
              onClick={() => handleStepClick(status)}
            >
              {/* Node container */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 shadow-sm",
                isCompleted ? 'bg-primary border-primary text-white' : 
                  isCurrent ? 'bg-white border-primary text-primary ring-4 ring-primary/10' : 
                  'bg-white border-slate-200 text-slate-300',
                isAdmin && !isCurrent && "group-hover:border-primary/40 group-hover:text-primary group-hover:scale-105"
              )}>
                {isCompleted ? (
                   <CheckCircle2 size={18} />
                ) : isCurrent ? (
                   <div className="relative flex items-center justify-center">
                     <Loader2 size={18} className="animate-spin" />
                   </div>
                ) : (
                   <Circle size={14} className="fill-current opacity-20" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "absolute top-10 whitespace-normal text-[9px] md:text-[11px] font-bold text-center leading-tight transition-all duration-300 uppercase tracking-tighter",
                isCurrent ? 'text-primary scale-110' : isCompleted ? 'text-slate-700' : 'text-slate-400',
                isAdmin && "group-hover:text-primary"
              )}>
                {label}
              </span>

              {/* Current Stage Indicator */}
              {isCurrent && (
                <div className="absolute -top-6 animate-bounce">
                  <div className="bg-primary text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase">Active</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-16 flex items-center justify-center gap-2">
        <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2 shadow-sm">
           <Info size={14} className="text-primary" />
           <span className="text-xs font-semibold text-slate-600">
             {isAdmin 
               ? `Workflow Control Enabled · Current Stage: ${getWorkflowLabel(currentStatus)}`
               : `Institutional Lifecycle Phase: ${getWorkflowLabel(currentStatus)}`}
           </span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTracker;
