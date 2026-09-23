'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  X, 
  Download, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Copy, 
  Check, 
  Loader2, 
  FileText,
  Pen
} from 'lucide-react';
import { FileItem } from '@/types/database';
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils';

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (fileId: string) => void;
  onOpenPdfEditor?: (file: FileItem) => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDelete,
  onOpenPdfEditor,
}: FilePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!file || !isOpen) {
      setFileUrl(null);
      setTextContent(null);
      setZoom(1);
      setRotation(0);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function loadFile() {
      try {
        const { data, error } = await supabase.storage
          .from('vault')
          .createSignedUrl(file!.storage_path, 3600);

        if (error) throw error;
        if (!isMounted) return;

        const urlWithTimestamp = `${data.signedUrl}&t=${Date.now()}`;
        setFileUrl(urlWithTimestamp);

        const category = getFileCategory(file!.mime_type, file!.name);
        if (category === 'code' || category === 'text') {
          const res = await fetch(data.signedUrl);
          const text = await res.text();
          if (isMounted) setTextContent(text);
        }
      } catch (err) {
        console.error('Failed to load file preview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [file, isOpen, supabase]);

  if (!isOpen || !file) return null;

  const category = getFileCategory(file.mime_type, file.name);

  const handleCopyCode = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-5xl h-full sm:h-[90vh] flex flex-col bg-vault-surface border border-vault-border sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-vault-border bg-vault-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-xl bg-vault-primary/10 text-vault-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 font-mono border border-vault-primary/20">
              {file.name.split('.').pop() || 'FILE'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-vault-text truncate">{file.name}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {formatBytes(file.size)} • {formatDate(file.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* PDF Editor Studio Shortcut */}
            {category === 'pdf' && onOpenPdfEditor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPdfEditor(file);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition mr-1"
              >
                <Pen className="w-3.5 h-3.5" />
                <span>Open in PDF Studio</span>
              </button>
            )}

            {/* Image zoom controls */}
            {category === 'image' && (
              <div className="flex items-center gap-0.5 mr-1 px-1.5 py-0.5 bg-vault-card rounded-xl border border-vault-border">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:text-vault-text text-muted-foreground transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:text-vault-text text-muted-foreground transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:text-vault-text text-muted-foreground transition"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Code copy control */}
            {(category === 'code' || category === 'text') && textContent && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-medium rounded-xl border border-vault-border transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-vault-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {fileUrl && (
              <a
                href={fileUrl}
                download={file.name}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => {
                onDelete(file.id);
                onClose();
              }}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition"
              title="Delete File"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 bg-vault-bg overflow-auto flex items-center justify-center p-3 sm:p-4 relative">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-vault-primary" />
              <p className="text-xs font-mono">Generating secure preview...</p>
            </div>
          ) : !fileUrl ? (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-vault-primary" />
              <p className="text-sm font-semibold text-vault-text">Unable to preview file</p>
              <p className="text-xs">Storage signed link could not be generated.</p>
            </div>
          ) : category === 'image' ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={fileUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg shadow-lg"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          ) : category === 'video' ? (
            <div className="w-full max-w-4xl max-h-full flex items-center justify-center">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="max-h-[75vh] w-full rounded-2xl shadow-2xl bg-black"
              />
            </div>
          ) : category === 'audio' ? (
            <div className="w-full max-w-md p-6 bg-vault-card border border-vault-border rounded-3xl shadow-xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-vault-primary/10 text-vault-primary flex items-center justify-center mx-auto mb-4 border border-vault-primary/20">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-vault-text mb-4 truncate">{file.name}</h4>
              <audio src={fileUrl} controls autoPlay className="w-full" />
            </div>
          ) : category === 'pdf' ? (
            <div className="w-full h-full flex flex-col">
              {onOpenPdfEditor && (
                <div className="p-3 bg-vault-surface border-b border-vault-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Want to highlight, draw freehand, or type notes on this PDF?
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPdfEditor(file);
                    }}
                    className="px-3 py-1 bg-vault-primary text-vault-bg text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Pen className="w-3 h-3" />
                    <span>Open in PDF Studio</span>
                  </button>
                </div>
              )}
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1`}
                className="w-full flex-1 rounded-b-xl border-none bg-white"
                title={file.name}
              />
            </div>
          ) : (category === 'code' || category === 'text') && textContent !== null ? (
            <div className="w-full h-full bg-[#050D0A] text-slate-100 rounded-2xl p-4 overflow-auto font-mono text-xs leading-relaxed border border-vault-border">
              <pre>
                <code>{textContent}</code>
              </pre>
            </div>
          ) : (
            <div className="text-center p-8 bg-vault-card border border-vault-border rounded-3xl max-w-sm">
              <FileText className="w-12 h-12 mx-auto mb-3 text-vault-primary" />
              <p className="text-sm font-semibold text-vault-text mb-1 truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mb-4">
                No direct inline preview available for this format.
              </p>
              <a
                href={fileUrl}
                download={file.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
