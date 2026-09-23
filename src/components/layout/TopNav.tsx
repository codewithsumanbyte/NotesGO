'use client';

import React from 'react';
import { 
  Search, 
  FolderPlus, 
  UploadCloud, 
  FilePlus2, 
  PenTool, 
  LayoutGrid, 
  List, 
  RotateCw,
  Menu
} from 'lucide-react';
import { ViewMode } from '@/types/database';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';

interface TopNavProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onNewNote: () => void;
  onNewWhiteboard: () => void;
  onRefresh: () => void;
  loading: boolean;
  onOpenMobileMenu?: () => void;
}

export function TopNav({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onNewFolder,
  onUpload,
  onNewNote,
  onNewWhiteboard,
  onRefresh,
  loading,
  onOpenMobileMenu,
}: TopNavProps) {
  return (
    <header className="h-16 px-3 sm:px-6 flex items-center justify-between border-b border-vault-border bg-vault-surface/80 backdrop-blur-xl shrink-0 z-20">
      {/* Mobile Hamburger & Search Input */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl border border-vault-border transition"
            title="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files, folders, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-1.5 sm:py-2 bg-vault-card/70 border border-vault-border rounded-xl text-xs sm:text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-primary/40 focus:border-vault-primary transition placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground bg-vault-surface border border-vault-border rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4">
        {/* PWA Mobile Install Button */}
        <PwaInstallButton variant="topbar" />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Refresh Vault"
          className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card border border-vault-border rounded-xl transition"
        >
          <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin text-vault-primary' : ''}`} />
        </button>

        {/* View Toggle */}
        <div className="hidden sm:flex items-center p-1 bg-vault-card border border-vault-border rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-vault-surface text-vault-primary shadow-sm'
                : 'text-muted-foreground hover:text-vault-text'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List View"
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'list'
                ? 'bg-vault-surface text-vault-primary shadow-sm'
                : 'text-muted-foreground hover:text-vault-text'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-vault-border mx-0.5 hidden sm:block" />

        {/* Create Note */}
        <button
          onClick={onNewNote}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-amber-400" />
          <span>New Note</span>
        </button>

        {/* Create Whiteboard */}
        <button
          onClick={onNewWhiteboard}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
        >
          <PenTool className="w-3.5 h-3.5 text-vault-accent" />
          <span>New Canvas</span>
        </button>

        {/* Create Folder */}
        <button
          onClick={onNewFolder}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
          title="New Folder"
        >
          <FolderPlus className="w-3.5 h-3.5 text-vault-primary" />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-lg shadow-vault-primary/20 transition active:scale-95 shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          <span className="hidden xs:inline">Upload</span>
        </button>
      </div>
    </header>
  );
}
