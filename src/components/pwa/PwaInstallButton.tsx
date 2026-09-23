'use client';

import React from 'react';
import { Smartphone, Download, Sparkles } from 'lucide-react';
import { usePwa } from './PwaProvider';

interface PwaInstallButtonProps {
  variant?: 'sidebar' | 'topbar' | 'hero' | 'floating';
  className?: string;
}

export function PwaInstallButton({ variant = 'sidebar', className = '' }: PwaInstallButtonProps) {
  const { isInstalled, openInstallModal } = usePwa();

  if (isInstalled) return null;

  if (variant === 'sidebar') {
    return (
      <button
        onClick={openInstallModal}
        className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-vault-primary/15 to-vault-accent/10 border border-vault-primary/30 hover:border-vault-primary/60 transition group text-left ${className}`}
        title="Install NotesGO App on Mobile"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-vault-primary/20 text-vault-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-vault-text flex items-center gap-1">
              <span>Install Mobile App</span>
              <Sparkles className="w-2.5 h-2.5 text-vault-primary" />
            </p>
            <p className="text-[10px] text-muted-foreground">Add to Home Screen</p>
          </div>
        </div>
        <Download className="w-4 h-4 text-vault-primary opacity-70 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
      </button>
    );
  }

  if (variant === 'topbar') {
    return (
      <button
        onClick={openInstallModal}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-vault-primary/10 hover:bg-vault-primary/20 text-vault-primary border border-vault-primary/30 rounded-xl text-xs font-bold transition active:scale-95 ${className}`}
        title="Download / Install Mobile App"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  if (variant === 'hero') {
    return (
      <button
        onClick={openInstallModal}
        className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-vault-surface hover:bg-vault-card border border-vault-border hover:border-vault-primary/40 text-vault-text text-sm font-semibold transition active:scale-95 shadow-lg ${className}`}
      >
        <Smartphone className="w-4 h-4 text-vault-primary" />
        <span>Install Mobile PWA</span>
      </button>
    );
  }

  return (
    <button
      onClick={openInstallModal}
      className={`fixed bottom-20 left-4 z-40 md:hidden flex items-center gap-2 px-3 py-2 bg-vault-card border border-vault-primary/40 text-vault-text rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-bold animate-bounce ${className}`}
    >
      <Smartphone className="w-4 h-4 text-vault-primary" />
      <span>Install App</span>
    </button>
  );
}
