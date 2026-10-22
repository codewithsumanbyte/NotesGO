'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase/client';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  File, 
  Info, 
  RotateCcw,
  Zap,
  HelpCircle
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { uploadVaultFile, UploadProgress } from '@/lib/supabase/resumable-upload';

interface UploadDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  userId: string;
  onUploadComplete: () => void;
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'canceled';
  error?: string;
  abortFn?: () => void;
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
  const [showProTip, setShowProTip] = useState(false);

  const supabase = createClient();
  const queueRef = useRef<UploadQueueItem[]>([]);
  queueRef.current = queue;

  const processQueueItem = async (item: UploadQueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', error: undefined } : q))
    );

    try {
      await uploadVaultFile({
        supabase,
        file: item.file,
        userId,
        currentFolderId,
        onProgress: (p: UploadProgress) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    progress: p.percentage,
                    bytesUploaded: p.bytesUploaded,
                    bytesTotal: p.bytesTotal,
                    speed: p.speed,
                  }
                : q
            )
          );
        },
        onAbortRef: (abortFn) => {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, abortFn } : q))
          );
        },
      });

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                progress: 100,
                bytesUploaded: item.file.size,
                status: 'completed',
                abortFn: undefined,
              }
            : q
        )
      );
      onUploadComplete();
    } catch (err: any) {
      console.error(`Upload error for ${item.file.name}:`, err);
      const isCanceled = err?.message?.includes('canceled');
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: isCanceled ? 'canceled' : 'error',
                error: err?.message || 'Upload failed',
                abortFn: undefined,
              }
            : q
        )
      );
    }
  };

  const startUploadPipeline = async (itemsToUpload: UploadQueueItem[]) => {
    setIsUploading(true);
    for (const item of itemsToUpload) {
      await processQueueItem(item);
    }
    setIsUploading(false);
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newItems: UploadQueueItem[] = acceptedFiles.map((file) => ({
        id: `${file.name}_${file.size}_${Date.now()}_${Math.random()}`,
        file,
        progress: 0,
        bytesUploaded: 0,
        bytesTotal: file.size,
        status: 'pending',
      }));

      setQueue((prev) => [...prev, ...newItems]);
      await startUploadPipeline(newItems);
    },
    [userId, currentFolderId, supabase, onUploadComplete]
  );

  const retryItem = async (item: UploadQueueItem) => {
    await processQueueItem(item);
  };

  const handleCancelItem = (item: UploadQueueItem) => {
    if (item.abortFn) {
      item.abortFn();
    } else {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'canceled' } : q))
      );
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: queue.some((q) => q.status === 'uploading'),
  });

  if (!isOpen) return null;

  const hasLargeFile = queue.some((q) => q.file.size > 50 * 1024 * 1024);
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const hasError = queue.some((q) => q.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl p-5 sm:p-6 bg-vault-surface border border-vault-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-vault-primary/10 text-vault-primary flex items-center justify-center border border-vault-primary/20">
              <UploadCloud className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-vault-text">Upload to Vault</h3>
              <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <Zap className="w-3 h-3 text-vault-primary" />
                Resumable 6MB Chunked Engine (TUS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Large File Notice (when files > 50MB exist in queue) */}
        {hasLargeFile && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5 shrink-0">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-300">Large File Detected (50MB+):</span>{' '}
              Files are streamed in reliable 6MB chunks so uploads don't freeze or timeout.{' '}
              <button 
                type="button" 
                onClick={() => setShowProTip(!showProTip)}
                className="underline font-semibold hover:text-amber-100 ml-1 inline-flex items-center gap-0.5"
              >
                Free vs Pro Limits info <HelpCircle className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Detailed Supabase Limit Info Popup/Card */}
        {showProTip && (
          <div className="mb-3 p-3.5 rounded-2xl bg-vault-card border border-vault-border text-xs text-vault-text/90 shrink-0 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-vault-primary">Supabase Storage Plan Limits:</span>
              <button 
                onClick={() => setShowProTip(false)}
                className="text-muted-foreground hover:text-vault-text text-[11px]"
              >
                Close
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              • <strong>Free Tier:</strong> Supabase has a hard global maximum of <strong>50 MB per file</strong>. Files over 50 MB will be rejected by Supabase backend with HTTP 413.<br/>
              • <strong>Pro Tier:</strong> Allows configuring file limits up to <strong>500 GB</strong> per file, enabling seamless 100MB+ uploads.<br/>
              • If on Free tier and uploading a 100MB+ file, please compress/split the file or upgrade your Supabase project in the Supabase Dashboard.
            </p>
          </div>
        )}

        {/* Dropzone Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition shrink-0 ${
            isDragActive
              ? 'border-vault-primary bg-vault-primary/10'
              : 'border-vault-border hover:border-vault-primary/50 hover:bg-vault-card/40'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-11 h-11 rounded-2xl bg-vault-primary/10 text-vault-primary flex items-center justify-center mb-2.5 border border-vault-primary/20">
            <UploadCloud className="w-5 h-5 stroke-[2.2]" />
          </div>
          <p className="text-sm font-semibold text-vault-text mb-1">
            Drag and drop files here, or tap to browse
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            PDFs, Videos, Audio, Images, Code & Datasets. Resumable chunked upload with auto-retry.
          </p>
        </div>

        {/* Upload Queue Progress List */}
        {queue.length > 0 && (
          <div className="mt-3.5 space-y-2.5 overflow-y-auto flex-1 pr-1">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Upload Queue ({completedCount}/{queue.length})
              </h4>
              {isUploading && (
                <span className="text-[10px] text-vault-primary font-mono flex items-center gap-1 font-semibold animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading Chunks...
                </span>
              )}
            </div>

            {queue.map((item) => {
              const isLarge = item.file.size > 50 * 1024 * 1024;
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-vault-card border border-vault-border text-xs space-y-2 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-vault-surface border border-vault-border flex items-center justify-center shrink-0">
                        <File className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-vault-text truncate text-xs">{item.file.name}</p>
                          {isLarge && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-vault-primary/10 text-vault-primary text-[9px] font-mono border border-vault-primary/20">
                              Chunked TUS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span>{formatBytes(item.file.size)}</span>
                          {item.status === 'uploading' && (
                            <>
                              <span>•</span>
                              <span className="text-vault-primary font-semibold">
                                {formatBytes(item.bytesUploaded)} ({item.progress}%)
                              </span>
                              {item.speed && (
                                <>
                                  <span>•</span>
                                  <span className="text-muted-foreground">{item.speed}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === 'uploading' && (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin text-vault-primary" />
                          <button
                            type="button"
                            onClick={() => handleCancelItem(item)}
                            title="Cancel upload"
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {item.status === 'completed' && (
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Uploaded</span>
                        </div>
                      )}
                      {item.status === 'canceled' && (
                        <span className="text-muted-foreground text-[11px] font-mono">Canceled</span>
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => retryItem(item)}
                            title="Retry Upload"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-vault-surface hover:bg-vault-primary/10 text-vault-primary border border-vault-border text-[11px] transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar (Visible while uploading) */}
                  {item.status === 'uploading' && (
                    <div className="w-full bg-vault-surface rounded-full h-1.5 overflow-hidden border border-vault-border/40">
                      <div
                        className="bg-vault-primary h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message with action tips */}
                  {item.status === 'error' && item.error && (
                    <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive flex items-start gap-1.5 leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span>{item.error}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-vault-border flex items-center justify-between shrink-0">
          <p className="text-[11px] text-muted-foreground font-mono">
            {isUploading ? 'Streaming chunks to storage...' : 'Vault Storage Ready'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition disabled:opacity-50"
            >
              {completedCount > 0 ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
