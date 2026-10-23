'use client';

import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  Share2, 
  Info, 
  HelpCircle, 
  Maximize2,
  FileText,
  RotateCcw,
  Pen
} from 'lucide-react';
import { FileItem } from '@/types/database';
import { 
  getGoogleDrivePreviewUrl, 
  getGoogleDriveDownloadUrl, 
  getGoogleDriveViewUrl, 
  getGoogleDriveId 
} from '@/lib/gdrive';

interface GoogleDrivePdfViewerProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInStudio?: (file: FileItem) => void;
}

export function GoogleDrivePdfViewer({
  file,
  isOpen,
  onClose,
  onOpenInStudio,
}: GoogleDrivePdfViewerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen || !file) return null;

  const previewUrl = getGoogleDrivePreviewUrl(file.storage_path);
  const downloadUrl = getGoogleDriveDownloadUrl(file.storage_path);
  const viewUrl = getGoogleDriveViewUrl(file.storage_path);
  const fileId = getGoogleDriveId(file.storage_path);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vault-bg w-screen h-screen overflow-hidden animate-in fade-in duration-200 select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-3 sm:px-6 flex items-center justify-between border-b border-vault-border bg-vault-surface shrink-0 gap-2 z-20">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition shrink-0"
            title="Back to Vault"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Google Drive Logo Badge */}
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.9 10.2 7.85 13.6z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832D"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z" fill="#2684FC"/>
              <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28H87.3c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#FFBA00"/>
            </svg>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                Google Drive PDF
              </span>
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">&bull; Zero Storage Used</span>
            </div>
            <h2 className="font-heading font-semibold text-xs sm:text-sm text-vault-text truncate max-w-[180px] sm:max-w-md">
              {file.name}
            </h2>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Annotate with Pen, Highlighter, Eraser Tools */}
          {onOpenInStudio && (
            <button
              onClick={() => onOpenInStudio(file)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition active:scale-95 shrink-0"
              title="Open Pen, Highlighter & Eraser Tools"
            >
              <Pen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Annotate & Draw</span>
            </button>
          )}

          {/* Reload Frame */}
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl border border-vault-border transition"
            title="Reload PDF Stream"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Help / Permissions info */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl border border-vault-border transition"
            title="Sharing Permissions Info"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Sharing Help</span>
          </button>

          {/* Download Original */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl border border-vault-border transition"
            title="Download PDF directly from Google Drive"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Open in Google Drive */}
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 bg-vault-card hover:bg-vault-surface text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
            title="Open in new Google Drive tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open in Drive</span>
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
            title="Close Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sharing Permissions Tip Banner */}
      {showHelp && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between gap-3 z-20 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-relaxed">
              <strong>Need permission?</strong> If the document asks you to sign in or request access, ensure the file in Google Drive has General access set to <strong>"Anyone with the link can view"</strong>.
            </span>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="text-amber-400 hover:text-amber-300 font-semibold text-xs shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Embedded Google Drive PDF Viewer Container */}
      <div className="flex-1 w-full h-full relative bg-vault-bg overflow-hidden flex flex-col">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            src={previewUrl}
            title={file.name}
            className="w-full h-full border-0 block"
            allow="autoplay; fullscreen"
            loading="lazy"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold text-vault-text mb-1">Could not load Google Drive preview</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              The Google Drive link might be invalid or restricted.
            </p>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-vault-primary text-vault-bg text-xs font-bold rounded-xl shadow transition"
            >
              Open Directly in Google Drive
            </a>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <footer className="h-6 px-4 sm:px-6 bg-vault-surface/90 border-t border-vault-border flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-semibold">Google Drive Native Stream</span>
          <span className="hidden sm:inline">&bull; File ID: {fileId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>High-Res Vector Rendering</span>
          <span>Zero Server Storage Used</span>
        </div>
      </footer>
    </div>
  );
}
