import React, { useState, useRef } from 'react';
import client from '../api/client';
import { Upload, FileSpreadsheet, Loader2, X, AlertCircle, Check } from 'lucide-react';
import ColumnMapper from './ColumnMapper';

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

type Step = 'upload' | 'mapping' | 'processing' | 'done';

const FileUpload: React.FC<Props> = ({ onComplete, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed file data from backend
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Processing results
  const [result, setResult] = useState<{ added: number; failed: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await client.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFileId(data.fileId);
      setColumns(data.columns);
      setRows(data.preview);
      setTotalRows(data.totalRows);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleMapping = async (columnMapping: Record<string, string>, allRows: any[]) => {
    if (!fileId) return;

    setStep('processing');
    setError(null);

    try {
      const { data } = await client.post(`/files/${fileId}/process`, {
        columnMapping,
        rows: allRows,
      });

      setResult({ added: data.added, failed: data.failed });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Processing failed');
      setStep('mapping');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Import Inventory</h2>
              <p className="text-xs text-muted-foreground">
                {step === 'upload' && 'Upload an Excel or CSV file'}
                {step === 'mapping' && `${fileName} — ${totalRows} rows found`}
                {step === 'processing' && 'Processing...'}
                {step === 'done' && 'Import complete!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border/50 rounded-3xl p-12 text-center hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploading ? (
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-bold mb-2">
                {uploading ? 'Parsing file...' : 'Drop Excel/CSV here or click to browse'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx, .xls, .csv — up to 10MB
              </p>
              {error && (
                <div className="mt-4 text-red-400 text-sm flex items-center justify-center gap-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <ColumnMapper
              columns={columns}
              previewRows={rows}
              totalRows={totalRows}
              onConfirm={handleMapping}
              error={error}
            />
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
              <h3 className="text-xl font-bold mb-2">Processing {totalRows} items...</h3>
              <p className="text-muted-foreground">Generating embeddings and storing in database. This may take a moment.</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Import Complete!</h3>
              <p className="text-muted-foreground mb-6">
                <span className="text-green-400 font-bold">{result.added}</span> items added
                {result.failed > 0 && (
                  <>, <span className="text-red-400 font-bold">{result.failed}</span> failed</>
                )}
              </p>
              <button
                onClick={() => { onComplete(); onClose(); }}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
