'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Code2, 
  Archive, 
  File, 
  Star, 
  MoreVertical, 
  Download, 
  Trash2, 
  Eye,
  ExternalLink
} from 'lucide-react';
import { FileItem } from '@/types/database';
import { formatBytes, getFileCategory } from '@/lib/utils';

interface FileGridProps {
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onToggleFavorite: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
}

export function FileGrid({
  files,
  onOpenFile,
  onDeleteFile,
  onToggleFavorite,
  onDownloadFile,
}: FileGridProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'pdf':
        return { icon: FileText, bg: 'bg-rose-500/15', text: 'text-rose-400', badge: 'PDF' };
      case 'image':
        return { icon: ImageIcon, bg: 'bg-purple-500/15', text: 'text-purple-300', badge: 'IMG' };
      case 'video':
        return { icon: Film, bg: 'bg-blue-500/15', text: 'text-blue-300', badge: 'VIDEO' };
      case 'audio':
        return { icon: Music, bg: 'bg-emerald-500/15', text: 'text-emerald-300', badge: 'AUDIO' };
      case 'code':
        return { icon: Code2, bg: 'bg-amber-500/15', text: 'text-amber-300', badge: 'CODE' };
      case 'archive':
        return { icon: Archive, bg: 'bg-yellow-500/15', text: 'text-yellow-300', badge: 'ZIP' };
      default:
        return { icon: File, bg: 'bg-vault-primary/15', text: 'text-vault-primary', badge: 'DOC' };
    }
  };

  if (files.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
          <File className="w-3.5 h-3.5 text-vault-primary" />
          <span>Files ({files.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {files.map((file) => {
          const category = getFileCategory(file.mime_type, file.name);
          const theme = getCategoryTheme(category);
          const Icon = theme.icon;
          const isMenuOpen = activeMenuId === file.id;

          return (
            <div
              key={file.id}
              onClick={() => onOpenFile(file)}
              className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-vault-surface hover:bg-vault-card border border-vault-border hover:border-vault-primary/40 hover:shadow-xl hover:shadow-vault-primary/5 transition-all duration-200 cursor-pointer select-none"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono ${theme.bg} ${theme.text}`}>
                    {theme.badge}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(file);
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      file.is_favorite 
                        ? 'text-amber-400' 
                        : 'opacity-100 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : file.id);
                      }}
                      className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-vault-text rounded-lg transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }} 
                        />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-vault-surface border border-vault-border rounded-xl shadow-xl z-40 py-1 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onOpenFile(file);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDownloadFile(file);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <div className="h-[1px] bg-vault-border my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDeleteFile(file.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Move to Trash</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="mb-2">
                <p 
                  title={file.name} 
                  className="text-xs font-semibold text-vault-text truncate group-hover:text-vault-primary transition-colors"
                >
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {formatBytes(file.size)}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-vault-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>{new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <span className="flex items-center gap-0.5 text-vault-primary group-hover:underline">
                  Open <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
