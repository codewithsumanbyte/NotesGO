'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DownloadCloud, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';
import { NotesGoMark } from '@/components/brand/NotesGoLogo';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  openInstallModal: () => void;
  triggerInstallPrompt: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIos: false,
  openInstallModal: () => {},
  triggerInstallPrompt: async () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      // Check iOS user agent
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua);
      setIsIos(isIosDevice);

      // 3. Listen for Android / Chrome beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setIsModalOpen(false);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const triggerInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsModalOpen(false);
    } else {
      setIsModalOpen(true);
    }
  };

  const openInstallModal = () => {
    if (deferredPrompt) {
      triggerInstallPrompt();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: !!deferredPrompt || isIos,
        isInstalled,
        isIos,
        openInstallModal,
        triggerInstallPrompt,
      }}
    >
      {children}

      {/* PWA Mobile Install Modal Guide */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div className="relative w-full sm:max-w-md bg-vault-surface border border-vault-border rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-vault-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <NotesGoMark size={44} />
              <div>
                <h3 className="font-logo font-extrabold text-base text-vault-text flex items-center gap-1.5">
                  <span>Install NotesGO App</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase bg-vault-primary/15 text-vault-primary rounded border border-vault-primary/30">
                    PWA
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Fast native experience on your mobile phone
                </p>
              </div>
            </div>

            {/* Benefits Pills */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
              <div className="p-3 bg-vault-card border border-vault-border rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-vault-accent shrink-0" />
                <span className="text-[11px] text-vault-text font-medium">Full-Screen Studio</span>
              </div>
              <div className="p-3 bg-vault-card border border-vault-border rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-vault-accent shrink-0" />
                <span className="text-[11px] text-vault-text font-medium">1-Tap Home Screen</span>
              </div>
            </div>

            {/* iOS Safari Instructions */}
            {isIos ? (
              <div className="bg-vault-card/70 border border-vault-border rounded-2xl p-4 mb-5 text-xs space-y-3">
                <p className="font-bold text-vault-primary text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>How to Install on iPhone / iPad:</span>
                </p>
                <div className="flex items-center gap-3 text-vault-text">
                  <span className="w-6 h-6 rounded-full bg-vault-surface border border-vault-border flex items-center justify-center font-bold font-mono text-xs text-vault-primary shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong className="text-vault-accent">Share button</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-vault-primary" /> in Safari's bottom toolbar.
                  </span>
                </div>
                <div className="flex items-center gap-3 text-vault-text">
                  <span className="w-6 h-6 rounded-full bg-vault-surface border border-vault-border flex items-center justify-center font-bold font-mono text-xs text-vault-primary shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="text-vault-accent">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-vault-primary" />.
                  </span>
                </div>
                <div className="flex items-center gap-3 text-vault-text">
                  <span className="w-6 h-6 rounded-full bg-vault-surface border border-vault-border flex items-center justify-center font-bold font-mono text-xs text-vault-primary shrink-0">
                    3
                  </span>
                  <span>Tap <strong>Add</strong> in the top right. Enjoy NotesGO on your mobile home screen!</span>
                </div>
              </div>
            ) : deferredPrompt ? (
              <div className="mb-5">
                <button
                  onClick={triggerInstallPrompt}
                  className="w-full py-3.5 bg-gradient-to-r from-vault-primary to-vault-accent hover:opacity-90 text-vault-bg font-bold text-sm rounded-2xl shadow-xl shadow-vault-primary/20 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <DownloadCloud className="w-4 h-4 stroke-[2.5]" />
                  <span>Download & Install Now</span>
                </button>
              </div>
            ) : (
              <div className="bg-vault-card border border-vault-border rounded-2xl p-4 mb-5 text-xs text-muted-foreground">
                <p className="font-bold text-vault-text mb-1">Install from Browser Menu:</p>
                <p>Open your browser settings menu (⋮ or ...) and select <strong className="text-vault-primary">"Install App"</strong> or <strong className="text-vault-primary">"Add to Home screen"</strong>.</p>
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-vault-card hover:bg-vault-card/80 text-muted-foreground hover:text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
            >
              Continue in Browser
            </button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
