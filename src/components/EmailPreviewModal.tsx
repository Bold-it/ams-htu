import { useState } from "react";
import { Mail, AlertTriangle, Send, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accreditation, generateEmailContent } from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";
import { useSendReminder, useSendBulkReminders } from "@/hooks/useAccreditations";

interface EmailPreviewModalProps {
  accreditations: Accreditation[];
  isOpen: boolean;
  onClose: () => void;
}

export function EmailPreviewModal({ accreditations, isOpen, onClose }: EmailPreviewModalProps) {
  const [isSending, setIsSending] = useState(false);
  const sendReminderMutation = useSendReminder();
  const sendBulkMutation = useSendBulkReminders();

  if (accreditations.length === 0) return null;

  const isSingle = accreditations.length === 1;
  const first = accreditations[0];
  const { subject, body } = generateEmailContent(first, first.status === "critical" || first.status === "expired");

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (isSingle) {
        await sendReminderMutation.mutateAsync(first.id);
      } else {
        const hasWarning = accreditations.some((a) => a.status === "warning");
        const hasCritical = accreditations.some((a) => a.status === "critical" || a.status === "expired");
        const status = hasWarning && hasCritical ? "all" : hasWarning ? "warning" : "critical";
        await sendBulkMutation.mutateAsync(status);
      }
      onClose();
    } catch {
      // handled in hooks
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email Preview
          </DialogTitle>
          <DialogDescription>
            Review before sending to {isSingle ? first.programmeName : `${accreditations.length} programmes`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isSingle && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">Recipients ({accreditations.length})</p>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {accreditations.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={acc.status} size="sm" showIcon={false} />
                        <span className="truncate">{acc.programmeName}</span>
                      </div>
                      <span className="text-muted-foreground">{acc.email}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="rounded-lg border">
            <div className="border-b bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">To:</span>
                <span className="text-muted-foreground">{isSingle ? first.email : `${accreditations.length} recipients`}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">Subject:</span>
                <span>{subject}</span>
              </div>
            </div>
            <ScrollArea className="max-h-64">
              <div className="whitespace-pre-wrap p-4 text-sm">{body}</div>
            </ScrollArea>
          </div>

          {!isSingle && (
            <div className="flex items-start gap-2 rounded-lg bg-status-warning-bg p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" />
              <p className="text-muted-foreground">Each recipient will receive a personalized email.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2 bg-accent hover:bg-accent/90">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSending ? "Sending..." : `Send Email${isSingle ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
