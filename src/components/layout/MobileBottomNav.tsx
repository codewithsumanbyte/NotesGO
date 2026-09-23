'use client';

import React from 'react';
import { 
  FolderKanban, 
  FileText, 
  PenTool, 
  Star, 
  PlusCircle,
  Clock
} from 'lucide-react';
import { ActiveTab } from '@/types/database';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onUpload: () => void;
  onNewNote: () => void;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  onUpload,
  onNewNote,
}: MobileBottomNavProps) {
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'vault', label: 'Vault', icon: FolderKanban },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'whiteboards', label: 'Canvas', icon: PenTool },
    { id: 'favorites', label: 'Starred', icon: Star },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-vault-surface/90 backdrop-blur-xl border-t border-vault-border px-2 py-1.5 flex items-center justify-around select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-vault-primary font-bold' : 'text-muted-foreground hover:text-vault-text'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* Quick Upload FAB button */}
      <button
        onClick={onUpload}
        className="flex flex-col items-center justify-center flex-1 py-1 text-vault-accent hover:text-vault-primary transition active:scale-95"
        title="Upload File"
      >
        <PlusCircle className="w-5 h-5 mb-0.5 stroke-[2.5]" />
        <span className="text-[10px] font-bold">Upload</span>
      </button>
    </nav>
  );
}
