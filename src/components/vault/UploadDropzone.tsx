'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, File } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface UploadDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  userId: string;
  onUploadComplete: () => void;
}

interface UploadQueueItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function UploadDropzone({
  isOpen,
  onClose,
  currentFolderId,
  userId,
  onUploadComplete,
}: UploadDropzoneProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newItems: UploadQueueItem[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending',
      }));

      setQueue((prev) => [...prev, ...newItems]);
      setIsUploading(true);

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        const file = item.file;
        
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('vault')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase.from('files').insert({
            user_id: userId,
            folder_id: currentFolderId,
            name: file.name,
            storage_path: storagePath,
            mime_type: file.type || 'application/octet-stream',
            size: file.size,
          });

          if (dbError) throw dbError;

          setQueue((prev) =>
            prev.map((q) =>
              q.file === file ? { ...q, progress: 100, status: 'completed' } : q
            )
          );
        } catch (err: any) {
          console.error('Upload failed:', err);
          setQueue((prev) =>
            prev.map((q) =>
              q.file === file
                ? { ...q, status: 'error', error: err.message || 'Upload failed' }
                : q
            )
          );
        }
      }

      setIsUploading(false);
      onUploadComplete();
    },
    [userId, currentFolderId, supabase, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: queue.length > 0,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-5 sm:p-6 bg-vault-surface border border-vault-border rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-vault-primary" />
            <h3 className="font-heading font-semibold text-base text-vault-text">Upload to Vault</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            isDragActive
              ? 'border-vault-primary bg-vault-primary/10'
              : 'border-vault-border hover:border-vault-primary/50 hover:bg-vault-card/40'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 rounded-2xl bg-vault-primary/10 text-vault-primary flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <p className="text-sm font-semibold text-vault-text mb-1">
            Drag and drop files here, or tap to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDFs, Docs, Images, Videos, Audio, Code & Archives up to 500 MB
          </p>
        </div>

        {/* Upload Queue Progress List */}
        {queue.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Uploads ({queue.filter((q) => q.status === 'completed').length}/{queue.length})
            </h4>
            {queue.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-vault-card border border-vault-border text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                  <File className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-vault-text truncate">{item.file.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{formatBytes(item.file.size)}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-vault-primary" />
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-vault-accent" />
                  )}
                  {item.status === 'error' && (
                    <span className="flex items-center gap-1 text-destructive text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
          >
            {queue.length > 0 ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
