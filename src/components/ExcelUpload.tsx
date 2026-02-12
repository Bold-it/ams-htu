import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
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
        processFile(file);
      } else {
        setError("Please upload an Excel file (.xlsx or .xls)");
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Accreditation Data</DialogTitle>
            <DialogDescription>
              Upload an Excel file containing your programme accreditation data.
            </DialogDescription>
          </DialogHeader>

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
              disabled={isLoading}
            />
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? "Processing..." : "Select File"}
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-medium">Expected columns:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Programme Name (required)</li>
              <li>• Accreditation Expiry Date (required)</li>
              <li>• Accreditation Start Date (optional)</li>
              <li>• Responsible Email Address (optional)</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-border/50">
              <a
                href="/sample_accreditation_data.xlsx"
                download
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <FileSpreadsheet className="h-3 w-3" />
                Download sample template
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 
