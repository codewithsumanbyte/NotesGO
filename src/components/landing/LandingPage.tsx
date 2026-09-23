'use client';

import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  FolderKanban, 
  FileText, 
  PenTool, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Heart, 
  CheckCircle2, 
  Sun, 
  Github, 
  Twitter, 
  Linkedin, 
  Youtube,
  HardDrive,
  Laptop,
  Smartphone,
  Tablet,
  Folder,
  ChevronRight,
  ExternalLink,
  Lock,
  Layers,
  File
} from 'lucide-react';
import { NotesGoLogo, NotesGoMark } from '@/components/brand/NotesGoLogo';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';

interface LandingPageProps {
  onOpenAuth: () => void;
  onExploreDemo: () => void;
}

export function LandingPage({ onOpenAuth, onExploreDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-vault-bg text-vault-text selection:bg-vault-primary/25 selection:text-vault-primary overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-vault-primary/10 via-vault-accent/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-[800px] -left-64 w-[500px] h-[500px] bg-vault-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-[1800px] -right-64 w-[500px] h-[500px] bg-vault-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-vault-border/80 bg-vault-bg/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
          {/* Brand Logo */}
          <NotesGoLogo size={38} textClassName="text-2xl" />

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#home" className="text-vault-text hover:text-vault-primary transition">Home</a>
            <a href="#features" className="hover:text-vault-text transition">Features</a>
            <a href="#showcase" className="hover:text-vault-text transition">Screenshots</a>
            <a href="#pricing" className="hover:text-vault-text transition">Pricing</a>
            <a href="#faq" className="hover:text-vault-text transition">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onExploreDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl border border-vault-border transition"
            >
              Live Demo
            </button>
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-vault-primary/20 transition active:scale-95"
            >
              <span>Get Started Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vault-card border border-vault-border text-xs font-semibold text-vault-primary mb-8 shadow-sm">
            <span className="text-vault-accent">🌿</span>
            <span>Your Personal File Vault</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="font-hero font-bold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-vault-text leading-[1.1] mb-6">
            Organize Your Files. <br />
            Access Anywhere. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vault-primary via-emerald-400 to-vault-accent">
              Always Yours.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            NotesGO is your personal cloud storage and productivity space. Store, organize, read, edit and annotate your files, notes and documents — anytime, anywhere — on any device.
          </p>

          {/* 3 Benefit Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-10 text-left">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-vault-card/70 border border-vault-border">
              <div className="w-8 h-8 rounded-xl bg-vault-primary/10 text-vault-primary flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 fill-vault-primary/20" />
              </div>
              <div>
                <p className="text-xs font-bold text-vault-text">100% Free</p>
                <p className="text-[11px] text-muted-foreground">for personal use</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-vault-card/70 border border-vault-border">
              <div className="w-8 h-8 rounded-xl bg-vault-accent/10 text-vault-accent flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-vault-text">Secure & Private</p>
                <p className="text-[11px] text-muted-foreground">your data, your control</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-vault-card/70 border border-vault-border">
              <div className="w-8 h-8 rounded-xl bg-vault-primary/10 text-vault-primary flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-vault-text">Access Anywhere</p>
                <p className="text-[11px] text-muted-foreground">laptop, phone, tablet</p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg font-bold text-sm rounded-2xl shadow-xl shadow-vault-primary/25 transition active:scale-95"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={onExploreDemo}
              className="flex items-center gap-2 px-5 py-3.5 bg-vault-card hover:bg-vault-card/80 text-vault-text font-semibold text-sm rounded-2xl border border-vault-border shadow-sm transition active:scale-95"
            >
              <Play className="w-4 h-4 text-vault-primary fill-vault-primary" />
              <span>Explore Workspace</span>
            </button>
            <PwaInstallButton variant="hero" />
          </div>
        </div>

        {/* Hero Interactive Mockup Showcase */}
        <div className="mt-16 sm:mt-20 relative max-w-5xl mx-auto">
          {/* Main Desktop Window Frame */}
          <div className="rounded-3xl border border-vault-border bg-vault-surface/90 shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Window Titlebar */}
            <div className="h-11 px-4 border-b border-vault-border bg-vault-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">app.notesgo.com/vault</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Lock className="w-3 h-3 text-vault-accent" />
                <span>SSL Encrypted</span>
              </div>
            </div>

            {/* Window Content Body */}
            <div className="p-4 sm:p-6 bg-vault-bg/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-semibold text-xl text-vault-text">My Vault</h3>
                  <p className="text-xs text-muted-foreground">All files, documents, and notes</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-vault-card border border-vault-border text-xs text-muted-foreground">
                    Filter: All Types
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-vault-primary text-vault-bg font-bold text-xs">
                    + Upload
                  </div>
                </div>
              </div>

              {/* Mock Folders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { name: 'Study', items: '12 items', color: '#3b82f6' },
                  { name: 'Projects', items: '8 items', color: '#10b981' },
                  { name: 'Personal', items: '16 items', color: '#f59e0b' },
                  { name: 'Certificates', items: '6 items', color: '#8b5cf6' },
                ].map((f) => (
                  <div key={f.name} className="flex items-center gap-3 p-3 rounded-2xl bg-vault-card border border-vault-border">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${f.color}20`, color: f.color }}>
                      <Folder className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-vault-text">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{f.items}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock Files */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Research Paper.pdf', size: '2.4 MB', type: 'PDF', bg: 'bg-rose-500/15', text: 'text-rose-400' },
                  { name: 'Project Plan.docx', size: '1.3 MB', type: 'DOC', bg: 'bg-blue-500/15', text: 'text-blue-400' },
                  { name: 'Budget_2026.xlsx', size: '4.8 MB', type: 'XLS', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
                  { name: 'Landscape.jpg', size: '4.2 MB', type: 'IMG', bg: 'bg-purple-500/15', text: 'text-purple-400' },
                ].map((item) => (
                  <div key={item.name} className="p-3 rounded-2xl bg-vault-card border border-vault-border flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${item.bg} ${item.text}`}>
                        {item.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{item.size}</span>
                    </div>
                    <p className="text-xs font-semibold text-vault-text truncate">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-vault-border/60">
        <div className="text-left mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-vault-primary mb-2">
            EVERYTHING YOU NEED
          </p>
          <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-vault-text mb-3">
            Powerful Features for Your Digital Life
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl">
            More than just storage — NotesGO helps you stay organized, productive, and in total control of your files, notes, and ideas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: FolderKanban,
              title: 'File Management',
              desc: 'Upload, organize and manage all your files in one place. Create folders, tags and more.',
              badge: 'Storage',
            },
            {
              icon: FileText,
              title: 'PDF Reader & Annotation',
              desc: 'Read, highlight, draw, add notes and save changes — all inside the app.',
              badge: 'PDF',
            },
            {
              icon: Layers,
              title: 'Rich Notes & Docs',
              desc: 'Write, edit and format notes with Markdown, code blocks, tables and more.',
              badge: 'Notion',
            },
            {
              icon: PenTool,
              title: 'Infinite Canvas',
              desc: 'Brainstorm, plan and create with a powerful whiteboard canvas.',
              badge: 'Whiteboard',
            },
            {
              icon: Search,
              title: 'Smart Search',
              desc: 'Find anything instantly — by name, content, tags or file type.',
              badge: 'Instant',
            },
            {
              icon: RefreshCw,
              title: 'Cross-Device Sync',
              desc: 'Access your files anytime, anywhere. Your changes sync automatically across all devices.',
              badge: 'Sync',
            },
            {
              icon: ShieldCheck,
              title: 'Secure & Private',
              desc: 'Your data is encrypted and protected with Supabase Auth and Row Level Security.',
              badge: 'RLS',
            },
            {
              icon: Heart,
              title: '100% Free',
              desc: 'Powerful features. No hidden charges. Completely free for personal use.',
              badge: 'Forever',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-5 rounded-3xl bg-vault-surface border border-vault-border hover:border-vault-primary/40 hover:shadow-xl hover:shadow-vault-primary/5 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-vault-card text-vault-primary flex items-center justify-center border border-vault-border group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-vault-card text-muted-foreground border border-vault-border">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-base text-vault-text mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Showcase Section: Modern Interface */}
      <section id="showcase" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-vault-border/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-vault-primary">
              WORKS BEAUTIFULLY
            </p>
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-vault-text leading-tight">
              A Clean, Modern Interface Designed for Focus
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Simple, intuitive and powerful. NotesGO gives you a beautiful, distraction-free workspace to manage your digital life.
            </p>

            <ul className="space-y-3">
              {[
                'Dark & light mode tailored to focus',
                'Responsive across desktop, tablets & phones',
                'Smooth micro-animations & instant feedback',
                'Customizable folder colors & hierarchy',
                'Keyboard shortcuts for power users (⌘K)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-xs font-medium text-vault-text">
                  <CheckCircle2 className="w-4 h-4 text-vault-accent shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={onExploreDemo}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-vault-card hover:bg-vault-card/80 text-vault-primary font-bold text-xs rounded-xl border border-vault-border transition active:scale-95"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="p-4 sm:p-6 rounded-3xl bg-vault-surface border border-vault-border shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-vault-border">
                <span className="font-semibold text-xs text-vault-text">AI Notes & Machine Learning</span>
                <span className="text-[10px] text-vault-accent font-mono">Autosaved</span>
              </div>
              <div className="space-y-3 font-mono text-xs leading-relaxed text-slate-300">
                <p className="text-vault-primary font-bold"># Machine Learning Foundations</p>
                <p className="text-slate-400">NotesGO provides native markdown syntax, code execution blocks, and PDF highlights directly linked into notes.</p>
                <div className="p-3 rounded-xl bg-vault-card border border-vault-border text-xs text-emerald-300">
                  <code>const vault = new NotesGO({'{'} sync: true, encrypted: true {'}'});</code>
                </div>
                <p className="text-slate-400">- High performance client-side vector search</p>
                <p className="text-slate-400">- Real-time multi-device cloud replication</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-vault-card via-vault-surface to-vault-card border border-vault-border shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-vault-primary mb-2">
                JOIN THOUSANDS OF USERS
              </p>
              <h2 className="font-heading font-semibold text-2xl sm:text-4xl text-vault-text mb-4">
                Your Files Deserve a Better Home
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-md">
                Stop searching. Start living. NotesGO keeps your important files safe, organized and always within reach.
              </p>
              <button
                onClick={onOpenAuth}
                className="px-6 py-3 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg font-bold text-xs sm:text-sm rounded-xl shadow-xl shadow-vault-primary/25 transition active:scale-95"
              >
                Get Started Free →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 sm:p-4 rounded-2xl bg-vault-surface/60 border border-vault-border">
                <FolderKanban className="w-5 h-5 text-vault-primary mx-auto mb-2" />
                <p className="text-xs font-bold text-vault-text">Organize</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Everything in one place</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-vault-surface/60 border border-vault-border">
                <Smartphone className="w-5 h-5 text-vault-accent mx-auto mb-2" />
                <p className="text-xs font-bold text-vault-text">Access</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Any device, anywhere</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-vault-surface/60 border border-vault-border">
                <Sparkles className="w-5 h-5 text-vault-primary mx-auto mb-2" />
                <p className="text-xs font-bold text-vault-text">Productive</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Focus on what matters</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-vault-border/80 bg-vault-surface/40 py-10 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <NotesGoLogo size={32} textClassName="text-base" />
          </div>

          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a href="#home" className="hover:text-vault-text transition">Home</a>
            <a href="#features" className="hover:text-vault-text transition">Features</a>
            <a href="#pricing" className="hover:text-vault-text transition">Pricing</a>
            <a href="#faq" className="hover:text-vault-text transition">FAQ</a>
            <a href="#" className="hover:text-vault-text transition">Privacy Policy</a>
            <a href="#" className="hover:text-vault-text transition">Terms of Service</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="#" className="p-1.5 hover:text-vault-text text-muted-foreground transition"><Github className="w-4 h-4" /></a>
            <a href="#" className="p-1.5 hover:text-vault-text text-muted-foreground transition"><Twitter className="w-4 h-4" /></a>
            <a href="#" className="p-1.5 hover:text-vault-text text-muted-foreground transition"><Linkedin className="w-4 h-4" /></a>
            <a href="#" className="p-1.5 hover:text-vault-text text-muted-foreground transition"><Youtube className="w-4 h-4" /></a>
          </div>
        </div>
        <p className="text-center mt-6 text-[10px] text-muted-foreground/60">
          © 2026 NotesGO. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
