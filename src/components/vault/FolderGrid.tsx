'use client';

import React, { useState } from 'react';
import { 
  Folder as FolderIcon, 
  MoreVertical, 
  Trash2, 
  Star, 
  Edit3, 
  FolderOpen
} from 'lucide-react';
import { Folder } from '@/types/database';

interface FolderGridProps {
  folders: Folder[];
  currentFolderId: string | null;
  onOpenFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFavorite: (folder: Folder) => void;
  onRenameFolder: (folder: Folder) => void;
}

export function FolderGrid({
  folders,
  currentFolderId,
  onOpenFolder,
  onDeleteFolder,
  onToggleFavorite,
  onRenameFolder,
}: FolderGridProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (folders.length === 0) return null;

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
          <FolderOpen className="w-3.5 h-3.5 text-vault-primary" />
          <span>Folders ({folders.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {folders.map((folder) => {
          const isMenuOpen = activeMenuId === folder.id;

          return (
            <div
              key={folder.id}
              onDoubleClick={() => onOpenFolder(folder.id)}
              className="group relative flex items-center justify-between p-3 rounded-2xl bg-vault-surface hover:bg-vault-card border border-vault-border hover:border-vault-primary/40 hover:shadow-lg hover:shadow-vault-primary/5 transition-all duration-200 cursor-pointer select-none"
            >
              <div 
                className="flex items-center gap-2.5 min-w-0 flex-1"
                onClick={() => onOpenFolder(folder.id)}
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ 
                    backgroundColor: `${folder.color || '#2DD4BF'}20`, 
                    color: folder.color || '#2DD4BF' 
                  }}
                >
                  <FolderIcon className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-vault-text truncate group-hover:text-vault-primary transition-colors">
                    {folder.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Folder</p>
                </div>
              </div>

              {/* Action Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(isMenuOpen ? null : folder.id);
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
                          onToggleFavorite(folder);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
                      >
                        <Star className={`w-3.5 h-3.5 ${folder.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                        <span>{folder.is_favorite ? 'Unfavorite' : 'Favorite'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onRenameFolder(folder);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>
                      <div className="h-[1px] bg-vault-border my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onDeleteFolder(folder.id);
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
          );
        })}
      </div>
    </div>
  );
}
