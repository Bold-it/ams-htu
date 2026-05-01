import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AccreditationDocument } from '@/lib/accreditation-data';
import { 
  File, 
  FileText, 
  FileArchive, 
  Download, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertCircle,
  FileSearch,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';

interface DocumentVaultProps {
  accreditationId: string;
  isAdmin?: boolean;
}

const DocumentVault: React.FC<DocumentVaultProps> = ({ accreditationId, isAdmin = false }) => {
  const [documents, setDocuments] = useState<AccreditationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('gtec_certificate');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      const { data, error } = await api.getDocuments(accreditationId);
      if (error) {
        toast.error(`Failed to load documents: ${error}`);
      } else if (data) {
        setDocuments(data);
      }
      setLoading(false);
    };

    fetchDocuments();
  }, [accreditationId]);

  const refreshDocuments = async () => {
    setLoading(true);
    const { data, error } = await api.getDocuments(accreditationId);
    if (error) {
      toast.error(`Failed to load documents: ${error}`);
    } else if (data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const { error } = await api.uploadDocument(accreditationId, selectedFile, docType, notes);
    setUploading(false);

    if (error) {
      toast.error(`Upload failed: ${error}`);
    } else {
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      setNotes('');
      refreshDocuments();
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    const { error } = await api.deleteDocument(id);
    if (error) {
      toast.error(`Delete failed: ${error}`);
    } else {
      toast.success('Document deleted');
      refreshDocuments();
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" />;
    if (mimeType.includes('image')) return <FileSearch className="text-blue-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="text-yellow-600" />;
    return <File className="text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus size={16} /> Upload New Document
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>File Selection</Label>
              <Input type="file" onChange={handleFileChange} />
            </div>
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gtec_certificate">GTEC Certificate</SelectItem>
                  <SelectItem value="self_assessment">Self-Assessment Report</SelectItem>
                  <SelectItem value="visitation_report">Visitation Report</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input 
              placeholder="Add details about this version..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button 
            className="w-full gap-2" 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {uploading ? 'Uploading...' : 'Save Document to Vault'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2">
          Stored Documents ({documents.length})
        </h4>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="animate-spin" />
            <span>Retrieving vault records...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 border-2 border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center gap-2">
            <AlertCircle size={32} />
            <span>No documents found in the vault for this programme.</span>
          </div>
        ) : (
          <div className="grid gap-2">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-slate-100 rounded">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate max-w-[200px] sm:max-w-md" title={doc.fileName}>
                      {doc.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{doc.documentType.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{formatSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={api.getDocumentUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                      <Download size={16} className="text-primary" />
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(doc.id, doc.fileName)}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVault;
