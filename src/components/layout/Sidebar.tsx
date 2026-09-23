'use client';

import React from 'react';
import { 
  FolderKanban, 
  Clock, 
  Star, 
  FileText, 
  PenTool, 
  Trash2, 
  HardDrive, 
  LogOut, 
  LogIn, 
  Sparkles,
  X
} from 'lucide-react';
import { ActiveTab } from '@/types/database';
import { formatBytes } from '@/lib/utils';
import { NotesGoMark } from '@/components/brand/NotesGoLogo';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  storageUsed: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onSignOut,
  storageUsed,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const maxStorage = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercentage = Math.min(100, Math.round((storageUsed / maxStorage) * 100));

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'vault', label: 'My Vault', icon: FolderKanban },
    { id: 'recent', label: 'Recent Files', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'notes', label: 'Notes Hub', icon: FileText, badge: 'Notion' },
    { id: 'whiteboards', label: 'Whiteboards', icon: PenTool, badge: 'Canvas' },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const handleSelectTab = (id: ActiveTab) => {
    setActiveTab(id);
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-vault-surface border-r border-vault-border select-none">
      {/* Brand Header */}
      <div>
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-vault-border">
          <div className="flex items-center gap-3">
            <NotesGoMark size={36} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-logo font-extrabold text-lg tracking-tight text-vault-text">
                  Notes<span className="text-vault-primary">GO</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-vault-primary/15 text-vault-primary border border-vault-primary/30 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Digital Vault & Brain</p>
            </div>
          </div>

          {/* Close button for mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-vault-primary text-vault-bg font-semibold shadow-md shadow-vault-primary/20'
                    : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-vault-bg' : 'text-muted-foreground group-hover:text-vault-text'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive 
                      ? 'bg-vault-bg/20 text-vault-bg' 
                      : 'bg-vault-card text-vault-primary border border-vault-border'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage & User Footer */}
      <div>
        {/* PWA Mobile App Download Button */}
        <div className="px-3 mb-2.5">
          <PwaInstallButton variant="sidebar" />
        </div>

        {/* Storage Meter */}
        <div className="p-3.5 mx-3 mb-3 bg-vault-card/60 border border-vault-border rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-vault-text">
              <HardDrive className="w-3.5 h-3.5 text-vault-primary" />
              <span>Vault Storage</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {formatBytes(storageUsed)} / 5 GB
            </span>
          </div>
          <div className="w-full h-1.5 bg-vault-surface rounded-full overflow-hidden border border-vault-border/50">
            <div
              className="h-full bg-gradient-to-r from-vault-primary to-vault-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, storagePercentage)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {100 - storagePercentage}% free space remaining
          </p>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-vault-border bg-vault-surface">
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-vault-card border border-vault-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-vault-primary/20 text-vault-primary font-bold text-xs uppercase flex items-center justify-center shrink-0 border border-vault-primary/30">
                  {user.email ? user.email[0] : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-vault-text truncate">{user.email}</p>
                  <p className="text-[10px] text-vault-accent flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-vault-accent animate-pulse" />
                    Connected
                  </p>
                </div>
              </div>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg font-semibold text-xs rounded-xl shadow-md shadow-vault-primary/20 transition active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 h-screen shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-over overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onMobileClose} 
          />
          <div className="relative w-72 h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
