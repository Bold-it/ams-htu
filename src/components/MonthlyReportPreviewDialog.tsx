import { useState, useEffect } from "react";
import { FileText, Send, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthContext";

export function MonthlyReportPreviewDialog() {
    const { role } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [reportHtml, setReportHtml] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const isSuperAdmin = role === 'super_admin';
    const recipientLabel = isSuperAdmin ? "provc@htu.edu.gh" : "your institutional email";
    const buttonLabel = isSuperAdmin ? "Send to Pro-VC" : "Send to My Email";

    const fetchPreview = async () => {
        setIsLoading(true);
        const { data, error } = await api.getMonthlyReportPreview();
        setIsLoading(false);
        if (error) {
            toast.error("Failed to load report preview: " + error);
        } else {
            setReportHtml(data?.html || "");
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPreview();
        }
    }, [isOpen]);

    const handleSend = async () => {
        setIsSending(true);
        const { data, error } = await api.sendMonthlyReport();
        setIsSending(false);
        if (error) {
            toast.error("Failed to send report: " + error);
        } else {
            toast.success(data?.message || "Report sent successfully");
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Monthly Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        <DialogTitle>Monthly Report Preview</DialogTitle>
                    </div>
                    <DialogDescription>
                        This report will be sent to <strong>{recipientLabel}</strong>. Please review the content below before sending.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-4 border rounded-md bg-white">
                    <ScrollArea className="h-[400px] w-full p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground animate-pulse">Generating preview...</p>
                            </div>
                        ) : (
                            <div
                                className="report-preview-content"
                                dangerouslySetInnerHTML={{ __html: reportHtml }}
                            />
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={isSending || isLoading} className="gap-2">
                        <Send className="h-4 w-4" />
                        {isSending ? "Sending..." : buttonLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
