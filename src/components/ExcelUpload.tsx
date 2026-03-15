import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { processAccreditationData, Accreditation } from "@/lib/accreditation-data";

interface ExcelUploadProps {
  onDataLoaded: (data: Accreditation[]) => void;
}

export function ExcelUpload({ onDataLoaded }: ExcelUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("The Excel file appears to be empty.");
        }

        const accreditations = processAccreditationData(jsonData);

        if (accreditations.length === 0) {
          throw new Error(
            "No valid accreditation data found. Please check your column names."
          );
        }

        onDataLoaded(accreditations);
        setIsOpen(false);
        setPendingFile(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
      } finally {
        setIsLoading(false);
      }
    },
    [onDataLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        setPendingFile(file);
        setError(null);
      } else {
        setError("Please upload an Excel file (.xlsx or .xls)");
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setPendingFile(file);
        setError(null);
      }
    },
    []
  );

  const handleConfirm = () => {
    if (pendingFile) {
      processFile(pendingFile);
    }
  };

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPendingFile(null);
      setError(null);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-accent hover:bg-accent/90"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload Excel File</span>
        <span className="sm:hidden">Upload</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Accreditation Data</DialogTitle>
            <DialogDescription>
              {pendingFile
                ? "Confim that you want to upload this file. This will update your system records."
                : "Upload an Excel file containing your programme accreditation data."}
            </DialogDescription>
          </DialogHeader>

          {!pendingFile ? (
            <div
              className={`upload-zone ${isDragging ? "upload-zone-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mb-3 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">
                Drag and drop your Excel file here
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Button variant="outline" size="sm">
                Select File
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-primary/30 p-6 text-center bg-primary/5">
              <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-primary" />
              <p className="text-sm font-semibold text-primary">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{(pendingFile.size / 1024).toFixed(1)} KB</p>

              <div className="flex gap-2 mt-6 justify-center">
                <Button variant="outline" size="sm" onClick={() => setPendingFile(null)} disabled={isLoading}>
                  Change File
                </Button>
                <Button size="sm" onClick={handleConfirm} disabled={isLoading} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {isLoading ? "Processing..." : "Confirm Upload"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected columns:</p>
              <a
                href="/sample_accreditation_data.xlsx"
                download
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                <Download className="h-3 w-3" />
                Download Sample Template
              </a>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li>• Programme Name (required)</li>
              <li>• Faculty / School (optional)</li>
              <li>• Department (optional)</li>
              <li>• Accreditation Expiry Date (required)</li>
              <li>• Accreditation Start Date (optional)</li>
              <li>• Responsible Email Address (optional)</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

