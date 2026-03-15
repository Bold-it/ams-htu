import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  current: number;
  total: number;
  isComplete: boolean;
  className?: string;
}

export function UploadProgress({ current, total, isComplete, className }: UploadProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card className={cn("fixed bottom-6 right-6 w-80 shadow-2xl border-primary/20 animate-in slide-in-from-bottom-4 duration-300 z-50 overflow-hidden", className)}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-status-active animate-in zoom-in duration-300" />
            ) : (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            )}
            <span className="text-sm font-semibold">
              {isComplete ? "Upload Complete" : "Uploading Records..."}
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {current} / {total}
          </span>
        </div>

        <Progress value={percentage} className="h-2" />

        <p className="text-[10px] text-muted-foreground italic text-center">
          {isComplete
            ? "Successfully imported all records to the database."
            : `Processing ${percentage}% complete...`}
        </p>
      </div>
      {isComplete && (
        <div className="h-1 bg-status-active w-full animate-in fade-in duration-500" />
      )}
    </Card>
  );
}
