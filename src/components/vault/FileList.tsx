'use client';

import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Code2, 
  Archive, 
  File, 
  Star, 
  Download, 
  Trash2, 
  Eye
} from 'lucide-react';
import { FileItem } from '@/types/database';
import { formatBytes, getFileCategory } from '@/lib/utils';

interface FileListProps {
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onToggleFavorite: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
}

export function FileList({
  files,
  onOpenFile,
  onDeleteFile,
  onToggleFavorite,
  onDownloadFile,
}: FileListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pdf': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-purple-300" />;
      case 'video': return <Film className="w-4 h-4 text-blue-300" />;
      case 'audio': return <Music className="w-4 h-4 text-emerald-300" />;
      case 'code': return <Code2 className="w-4 h-4 text-amber-300" />;
      case 'archive': return <Archive className="w-4 h-4 text-yellow-300" />;
      default: return <File className="w-4 h-4 text-vault-primary" />;
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="w-full bg-vault-surface border border-vault-border rounded-2xl overflow-hidden select-none">
      <div className="grid grid-cols-12 px-4 py-2.5 bg-vault-card/60 border-b border-vault-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
        <div className="col-span-7 sm:col-span-6 flex items-center gap-2">Name</div>
        <div className="hidden sm:block col-span-2">Type</div>
        <div className="col-span-3 sm:col-span-2">Size</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      <div className="divide-y divide-vault-border/50">
        {files.map((file) => {
          const category = getFileCategory(file.mime_type, file.name);

          return (
            <div
              key={file.id}
              onClick={() => onOpenFile(file)}
              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-vault-card/70 text-xs transition cursor-pointer group"
            >
              <div className="col-span-7 sm:col-span-6 flex items-center gap-3 min-w-0 pr-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(file);
                  }}
                  className="text-muted-foreground hover:text-amber-400 transition shrink-0"
                >
                  <Star className={`w-3.5 h-3.5 ${file.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                </button>
                <div className="shrink-0">{getCategoryIcon(category)}</div>
                <span className="font-medium text-vault-text truncate group-hover:text-vault-primary transition-colors">
                  {file.name}
                </span>
              </div>

              <div className="hidden sm:block col-span-2 uppercase font-mono text-[10px] text-muted-foreground">
                {category}
              </div>

              <div className="col-span-3 sm:col-span-2 text-muted-foreground font-mono text-[11px]">
                {formatBytes(file.size)}
              </div>

              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFile(file);
                  }}
                  title="Preview"
                  className="p-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-lg transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadFile(file);
                  }}
                  title="Download"
                  className="p-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.id);
                  }}
                  title="Delete"
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
