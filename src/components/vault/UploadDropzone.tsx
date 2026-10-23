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
  HelpCircle,
  ExternalLink,
  Link as LinkIcon,
  Check,
  FileText
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { uploadVaultFile, UploadProgress } from '@/lib/supabase/resumable-upload';
import { extractGoogleDriveFileId } from '@/lib/gdrive';

interface UploadDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  userId: string;
  onUploadComplete: () => void;
  initialMode?: 'upload' | 'gdrive';
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
  initialMode = 'upload',
}: UploadDropzoneProps) {
  // Tab Mode: 'upload' (Device chunks) vs 'gdrive' (Google Drive Link)
  const [activeTab, setActiveTab] = useState<'upload' | 'gdrive'>(initialMode);

  // Device Upload Queue State
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProTip, setShowProTip] = useState(false);

  // Google Drive Import State
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [gdriveTitle, setGdriveTitle] = useState('');
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveError, setGdriveError] = useState<string | null>(null);
  const [gdriveSuccess, setGdriveSuccess] = useState(false);

  const supabase = createClient();
  const queueRef = useRef<UploadQueueItem[]>([]);
  queueRef.current = queue;

  // Extracted Google Drive File ID for live feedback
  const detectedGdriveId = extractGoogleDriveFileId(gdriveUrl);

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

  // Handle Google Drive Link Submission
  const handleGdriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGdriveError(null);

    const fileId = extractGoogleDriveFileId(gdriveUrl);
    if (!fileId) {
      setGdriveError('Please enter a valid Google Drive share link or file ID.');
      return;
    }

    const title = gdriveTitle.trim() || 'Untitled Document';
    const finalName = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;

    setGdriveLoading(true);
    try {
      const { error: dbError } = await supabase.from('files').insert({
        user_id: userId,
        folder_id: currentFolderId,
        name: finalName,
        storage_path: `gdrive:${fileId}`,
        mime_type: 'application/pdf',
        size: 0,
      });

      if (dbError) throw dbError;

      setGdriveSuccess(true);
      onUploadComplete();
      setTimeout(() => {
        setGdriveUrl('');
        setGdriveTitle('');
        setGdriveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Failed to import Google Drive PDF:', err);
      setGdriveError(err?.message || 'Failed to save Google Drive PDF to vault.');
    } finally {
      setGdriveLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasLargeFile = queue.some((q) => q.file.size > 50 * 1024 * 1024);
  const completedCount = queue.filter((q) => q.status === 'completed').length;

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
              <h3 className="font-heading font-semibold text-base text-vault-text">Add to Vault</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Upload device files or import from Google Drive
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

        {/* Tab Switcher: Direct Upload vs Google Drive Import */}
        <div className="flex items-center bg-vault-card border border-vault-border rounded-2xl p-1 mb-3 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Device Upload (Chunked)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gdrive')}
            className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'gdrive'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text'
            }`}
          >
            {/* Google Drive Triangle Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.9 10.2 7.85 13.6z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832D"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z" fill="#2684FC"/>
              <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28H87.3c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#FFBA00"/>
            </svg>
            <span>Google Drive Import</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/20 text-current font-mono">
              Free 15GB
            </span>
          </button>
        </div>

        {/* TAB 1: DEVICE FILE UPLOADS (TUS Resumable) */}
        {activeTab === 'upload' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Large File Notice (when files > 50MB exist in queue) */}
            {hasLargeFile && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5 shrink-0">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-amber-300">Large File Detected (50MB+):</span>{' '}
                  Files are streamed in 6MB chunks.{' '}
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('gdrive')}
                    className="underline font-bold text-amber-300 hover:text-white ml-1 inline-flex items-center gap-0.5"
                  >
                    Or use Google Drive (up to 15GB free) &rarr;
                  </button>
                </div>
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
                PDFs, Videos, Audio, Images & Datasets. Auto-resumes network drops.
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
                            <button
                              type="button"
                              onClick={() => retryItem(item)}
                              title="Retry Upload"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-vault-surface hover:bg-vault-primary/10 text-vault-primary border border-vault-border text-[11px] transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="w-full bg-vault-surface rounded-full h-1.5 overflow-hidden border border-vault-border/40">
                          <div
                            className="bg-vault-primary h-full transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
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
          </div>
        )}

        {/* TAB 2: GOOGLE DRIVE IMPORT (Zero Quota, Huge Files 100MB-1GB+) */}
        {activeTab === 'gdrive' && (
          <form onSubmit={handleGdriveSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
            {/* Banner explaining Google Drive benefits */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-amber-300">
                  Import Any PDF from Google Drive (Up to 15GB Free)
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Great for 100MB+ textbooks & lecture notes. It will render natively as a PDF file card in your Vault without using your Supabase storage quota!
                </p>
              </div>
            </div>

            {/* Input 1: Google Drive Share Link */}
            <div>
              <label className="block text-xs font-semibold text-vault-text mb-1.5">
                Google Drive Share Link or File ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/1AbC...XyZ/view?usp=sharing"
                  value={gdriveUrl}
                  onChange={(e) => {
                    setGdriveUrl(e.target.value);
                    setGdriveError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-vault-card border border-vault-border rounded-xl text-xs sm:text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition placeholder:text-muted-foreground"
                />
                {detectedGdriveId && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Link Verified
                  </span>
                )}
              </div>
              {detectedGdriveId && (
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  Extracted File ID: <span className="text-vault-text font-semibold">{detectedGdriveId}</span>
                </p>
              )}
            </div>

            {/* Input 2: PDF Title */}
            <div>
              <label className="block text-xs font-semibold text-vault-text mb-1.5">
                Document Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Volume 2 Textbook"
                  value={gdriveTitle}
                  onChange={(e) => setGdriveTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-vault-card border border-vault-border rounded-xl text-xs sm:text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition placeholder:text-muted-foreground"
                />
                <FileText className="w-3.5 h-3.5 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3 rounded-2xl bg-vault-card/60 border border-vault-border text-[11px] text-muted-foreground space-y-1 font-mono">
              <span className="font-bold text-vault-text block font-heading text-xs">
                How to get the link:
              </span>
              <p>1. In Google Drive, right-click your PDF &rarr; <strong>Share</strong>.</p>
              <p>2. Under General access, select <strong>"Anyone with the link can view"</strong>.</p>
              <p>3. Click <strong>Copy link</strong> and paste it above.</p>
            </div>

            {/* Error Message */}
            {gdriveError && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gdriveError}</span>
              </div>
            )}

            {/* Success Message */}
            {gdriveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PDF imported into your Vault successfully!</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={gdriveLoading || !detectedGdriveId || !gdriveTitle.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                {gdriveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Import Google Drive PDF to Vault</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-vault-border flex items-center justify-between shrink-0">
          <p className="text-[11px] text-muted-foreground font-mono">
            {activeTab === 'gdrive'
              ? 'Stored in Google Drive • Displayed natively in NotesGO'
              : isUploading ? 'Streaming chunks to storage...' : 'Vault Storage Ready'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading || gdriveLoading}
              className="px-4 py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition disabled:opacity-50"
            >
              {completedCount > 0 || gdriveSuccess ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
