'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { LandingPage } from '@/components/landing/LandingPage';
import { FolderGrid } from '@/components/vault/FolderGrid';
import { FileGrid } from '@/components/vault/FileGrid';
import { FileList } from '@/components/vault/FileList';
import { UploadDropzone } from '@/components/vault/UploadDropzone';
import { FilePreviewModal } from '@/components/vault/FilePreviewModal';
import { NewFolderModal } from '@/components/vault/NewFolderModal';
import { EditFolderModal } from '@/components/vault/EditFolderModal';
import { NoteEditorModal } from '@/components/notes/NoteEditorModal';
import { WhiteboardModal } from '@/components/whiteboard/WhiteboardModal';
import { PdfEditorStudio } from '@/components/pdf/PdfEditorStudio';
import { AuthModal } from '@/components/auth/AuthModal';
import { 
  Folder, 
  FileItem, 
  NoteItem, 
  WhiteboardItem, 
  ViewMode, 
  ActiveTab 
} from '@/types/database';
import { 
  ChevronRight, 
  FolderRoot, 
  UploadCloud, 
  FileText, 
  PenTool, 
  Sparkles,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { formatDate, getFileCategory } from '@/lib/utils';
import { stripMarkdown } from '@/components/notes/MarkdownRenderer';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('vault');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [whiteboards, setWhiteboards] = useState<WhiteboardItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Studio states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [activePdfFile, setActivePdfFile] = useState<FileItem | null>(null);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [activeWhiteboard, setActiveWhiteboard] = useState<WhiteboardItem | null>(null);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  const supabase = createClient();

  // 1. Initial auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // 2. Fetch Vault Data
  const loadVaultData = useCallback(async () => {
    if (!user && !demoMode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'trash') {
        const [delFoldersRes, delFilesRes] = await Promise.all([
          supabase.from('folders').select('*').not('deleted_at', 'is', null).order('updated_at', { ascending: false }),
          supabase.from('files').select('*').not('deleted_at', 'is', null).order('updated_at', { ascending: false }),
        ]);
        setFolders(delFoldersRes.data || []);
        setFiles(delFilesRes.data || []);
      } else {
        let foldersQuery = supabase
          .from('folders')
          .select('*')
          .is('deleted_at', null)
          .order('name', { ascending: true });

        let filesQuery = supabase
          .from('files')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        let notesQuery = supabase
          .from('notes')
          .select('*')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        let whiteboardsQuery = supabase
          .from('whiteboards')
          .select('*')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        if (activeTab === 'vault') {
          if (currentFolderId) {
            foldersQuery = foldersQuery.eq('parent_id', currentFolderId);
            filesQuery = filesQuery.eq('folder_id', currentFolderId);
          } else {
            foldersQuery = foldersQuery.is('parent_id', null);
            filesQuery = filesQuery.is('folder_id', null);
          }
        } else if (activeTab === 'favorites') {
          foldersQuery = foldersQuery.eq('is_favorite', true);
          filesQuery = filesQuery.eq('is_favorite', true);
          notesQuery = notesQuery.eq('is_favorite', true);
          whiteboardsQuery = whiteboardsQuery.eq('is_favorite', true);
        }

        const [foldersRes, filesRes, notesRes, whiteboardsRes] = await Promise.all([
          foldersQuery,
          filesQuery,
          notesQuery,
          whiteboardsQuery,
        ]);

        const rawFolders: Folder[] = foldersRes.data || [];
        const enrichedFolders = rawFolders.map((f: Folder) => {
          try {
            const cached = localStorage.getItem(`notesgo_folder_meta_${f.id}`);
            if (cached) {
              const meta = JSON.parse(cached);
              return {
                ...f,
                name: f.name || meta.name,
                color: f.color || meta.color,
                icon: f.icon || meta.icon,
              };
            }
          } catch {}
          return f;
        });

        setFolders(enrichedFolders);
        setFiles(filesRes.data || []);
        setNotes(notesRes.data || []);
        setWhiteboards(whiteboardsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, demoMode, activeTab, currentFolderId, supabase]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  // Navigate into Folder
  const handleOpenFolder = async (folderId: string) => {
    const target = folders.find((f) => f.id === folderId);
    if (target) {
      setBreadcrumbs((prev) => [...prev, { id: target.id, name: target.name }]);
      setCurrentFolderId(target.id);
    }
  };

  // Breadcrumb navigation click
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    } else {
      const selected = breadcrumbs[index];
      setCurrentFolderId(selected.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  // Open file handler (PDFs open in dedicated full-screen PDF Editor Studio!)
  const handleOpenFile = (file: FileItem) => {
    const category = getFileCategory(file.mime_type, file.name);
    if (category === 'pdf') {
      setActivePdfFile(file);
    } else {
      setPreviewFile(file);
    }
  };

  // Soft-delete file (move to trash)
  const handleDeleteFile = async (fileId: string) => {
    if (activeTab === 'trash') {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        await supabase.storage.from('vault').remove([file.storage_path]);
        await supabase.from('files').delete().eq('id', fileId);
      }
    } else {
      await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);
    }
    loadVaultData();
  };

  // Soft-delete folder
  const handleDeleteFolder = async (folderId: string) => {
    await supabase
      .from('folders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', folderId);
    loadVaultData();
  };

  // Edit / Update folder properties (name, color, icon)
  const handleUpdateFolder = async (folderId: string, updates: { name: string; color: string; icon: string }) => {
    // 1. Cache metadata locally so custom icon/color persists immediately
    try {
      localStorage.setItem(`notesgo_folder_meta_${folderId}`, JSON.stringify(updates));
    } catch {}

    // 2. Persist to Supabase
    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: updates.name.trim(),
          color: updates.color,
          icon: updates.icon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', folderId);

      if (error) {
        // Fallback update without icon column if schema doesn't have icon column yet
        console.warn('Folder update note:', error.message);
        await supabase
          .from('folders')
          .update({
            name: updates.name.trim(),
            color: updates.color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', folderId);
      }
    } catch (err) {
      console.error('Failed to update folder in database:', err);
    }

    // 3. Update local state immediately
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, ...updates, updated_at: new Date().toISOString() } : f))
    );
    loadVaultData();
  };

  // Toggle favorite
  const handleToggleFavoriteFile = async (file: FileItem) => {
    await supabase
      .from('files')
      .update({ is_favorite: !file.is_favorite })
      .eq('id', file.id);
    loadVaultData();
  };

  const handleToggleFavoriteFolder = async (folder: Folder) => {
    await supabase
      .from('folders')
      .update({ is_favorite: !folder.is_favorite })
      .eq('id', folder.id);
    loadVaultData();
  };

  // Direct download file (with cache-busting so newest baked edits are always fetched)
  const handleDownloadFile = async (file: FileItem) => {
    const { data } = await supabase.storage.from('vault').createSignedUrl(file.storage_path, 60);
    if (data?.signedUrl) {
      const downloadUrl = `${data.signedUrl}&t=${Date.now()}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name;
      a.click();
    }
  };

  // Delete note from vault/notes tab
  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Delete whiteboard from canvas hub
  const handleDeleteWhiteboard = async (wbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this whiteboard canvas?')) return;
    try {
      const { error } = await supabase.from('whiteboards').delete().eq('id', wbId);
      if (error) throw error;
      setWhiteboards((prev) => prev.filter((w) => w.id !== wbId));
    } catch (err) {
      console.error('Failed to delete whiteboard:', err);
    }
  };

  // Calculate total storage used
  const totalStorage = files.reduce((acc, curr) => acc + (curr.size || 0), 0);

  // Filter items by search
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredWhiteboards = whiteboards.filter((w) =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If user is not logged in and not in demo mode, show the Landing Page!
  if (!user && !demoMode) {
    return (
      <>
        <LandingPage
          onOpenAuth={() => setIsAuthOpen(true)}
          onExploreDemo={() => setDemoMode(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            setIsAuthOpen(false);
            loadVaultData();
          }}
        />
      </>
    );
  }

  // Dashboard View (Logged in or Demo mode)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vault-bg text-vault-text selection:bg-vault-primary/25 selection:text-vault-primary">
      {/* Sidebar (with mobile drawer support) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCurrentFolderId(null);
          setBreadcrumbs([]);
        }}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={async () => {
          await supabase.auth.signOut();
          setUser(null);
          setDemoMode(false);
        }}
        storageUsed={totalStorage}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navigation */}
        <TopNav
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onNewFolder={() => {
            if (!user) setIsAuthOpen(true);
            else setIsNewFolderOpen(true);
          }}
          onUpload={() => {
            if (!user) setIsAuthOpen(true);
            else setIsUploadOpen(true);
          }}
          onNewNote={() => {
            if (!user) setIsAuthOpen(true);
            else {
              setActiveNote(null);
              setIsNoteEditorOpen(true);
            }
          }}
          onNewWhiteboard={() => {
            if (!user) setIsAuthOpen(true);
            else {
              setActiveWhiteboard(null);
              setIsWhiteboardOpen(true);
            }
          }}
          onRefresh={loadVaultData}
          loading={loading}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Demo Mode Notice Banner */}
        {demoMode && !user && (
          <div className="px-4 py-2 bg-vault-card border-b border-vault-border flex items-center justify-between text-xs">
            <span className="text-vault-primary flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Previewing Workspace Demo</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemoMode(false)}
                className="text-muted-foreground hover:text-vault-text text-xs flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Landing
              </button>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-2.5 py-1 bg-vault-primary text-vault-bg font-bold rounded-lg text-xs"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Breadcrumbs & Section Header */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-vault-border bg-vault-surface/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-vault-text transition"
            >
              <FolderRoot className="w-3.5 h-3.5 text-vault-primary" />
              <span>
                {activeTab === 'vault' ? 'My Vault' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </span>
            </button>

            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-vault-text transition ${
                    idx === breadcrumbs.length - 1
                      ? 'font-bold text-vault-text'
                      : 'text-muted-foreground'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground font-mono">
            {filteredFiles.length} files • {filteredFolders.length} folders
          </div>
        </div>

        {/* Main Vault Workspace View (with bottom padding for mobile bar) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
          {activeTab === 'notes' ? (
            /* Notes Hub View */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-base text-vault-text flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Notion Notes ({filteredNotes.length})</span>
                </h2>
                <button
                  onClick={() => {
                    setActiveNote(null);
                    setIsNoteEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-vault-primary text-vault-bg text-xs font-bold rounded-xl shadow-md"
                >
                  + New Note
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNote(note);
                      setIsNoteEditorOpen(true);
                    }}
                    className="group relative p-4 rounded-2xl bg-vault-surface border border-vault-border hover:border-vault-primary/40 hover:shadow-lg transition cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDate(note.updated_at)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          title="Delete Note"
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-vault-text truncate mb-1">
                      {note.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {stripMarkdown(typeof note.content === 'string' ? note.content : (note.content?.text || '')) || 'Empty note...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'whiteboards' ? (
            /* Whiteboards Hub View */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-base text-vault-text flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-vault-accent" />
                  <span>Whiteboard Canvases ({filteredWhiteboards.length})</span>
                </h2>
                <button
                  onClick={() => {
                    setActiveWhiteboard(null);
                    setIsWhiteboardOpen(true);
                  }}
                  className="px-3 py-1.5 bg-vault-primary text-vault-bg text-xs font-bold rounded-xl shadow-md"
                >
                  + New Canvas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredWhiteboards.map((wb) => (
                  <div
                    key={wb.id}
                    onClick={() => {
                      setActiveWhiteboard(wb);
                      setIsWhiteboardOpen(true);
                    }}
                    className="group relative p-3 rounded-2xl bg-vault-surface border border-vault-border hover:border-vault-primary/40 hover:shadow-lg transition cursor-pointer select-none"
                  >
                    <div className="h-28 bg-vault-bg rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-vault-border/50 relative">
                      {wb.canvas_data?.image ? (
                        <img src={wb.canvas_data.image} alt={wb.title} className="h-full w-full object-contain" />
                      ) : (
                        <PenTool className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-xs text-vault-text truncate">{wb.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground font-mono">{formatDate(wb.updated_at)}</p>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWhiteboard(wb.id, e)}
                        title="Delete Canvas"
                        className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Vault Explorer View */
            <div>
              <FolderGrid
                folders={filteredFolders}
                currentFolderId={currentFolderId}
                onOpenFolder={handleOpenFolder}
                onDeleteFolder={handleDeleteFolder}
                onToggleFavorite={handleToggleFavoriteFolder}
                onEditFolder={(f) => {
                  setEditingFolder(f);
                  setIsEditFolderOpen(true);
                }}
              />

              {viewMode === 'grid' ? (
                <FileGrid
                  files={filteredFiles}
                  onOpenFile={handleOpenFile}
                  onDeleteFile={handleDeleteFile}
                  onToggleFavorite={handleToggleFavoriteFile}
                  onDownloadFile={handleDownloadFile}
                />
              ) : (
                <FileList
                  files={filteredFiles}
                  onOpenFile={handleOpenFile}
                  onDeleteFile={handleDeleteFile}
                  onToggleFavorite={handleToggleFavoriteFile}
                  onDownloadFile={handleDownloadFile}
                />
              )}

              {/* Empty state */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && !loading && (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-vault-surface text-vault-primary flex items-center justify-center mx-auto mb-3 border border-vault-border">
                    <UploadCloud className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-vault-text mb-1">
                    {activeTab === 'trash' ? 'Trash is empty' : 'This folder is empty'}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                    {activeTab === 'trash'
                      ? 'No deleted files or folders in your trash bin.'
                      : 'Upload documents, code, images or create notes to organize this folder.'}
                  </p>
                  {activeTab !== 'trash' && (
                    <button
                      onClick={() => {
                        if (!user) setIsAuthOpen(true);
                        else setIsUploadOpen(true);
                      }}
                      className="px-4 py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition"
                    >
                      Upload First File
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setCurrentFolderId(null);
            setBreadcrumbs([]);
          }}
          onUpload={() => {
            if (!user) setIsAuthOpen(true);
            else setIsUploadOpen(true);
          }}
          onNewNote={() => {
            if (!user) setIsAuthOpen(true);
            else {
              setActiveNote(null);
              setIsNoteEditorOpen(true);
            }
          }}
        />
      </div>

      {/* Modals & Dialogs */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          loadVaultData();
        }}
      />

      {/* Dedicated Full-Screen PDF Editor Studio */}
      {activePdfFile && (
        <PdfEditorStudio
          file={activePdfFile}
          isOpen={!!activePdfFile}
          onClose={() => {
            setActivePdfFile(null);
            loadVaultData();
          }}
          userId={user?.id || 'demo_user'}
          onFileUpdated={(updated) => {
            setActivePdfFile(updated);
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          }}
        />
      )}

      {user && (
        <>
          <UploadDropzone
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            currentFolderId={currentFolderId}
            userId={user.id}
            onUploadComplete={loadVaultData}
          />

          <NewFolderModal
            isOpen={isNewFolderOpen}
            onClose={() => setIsNewFolderOpen(false)}
            currentFolderId={currentFolderId}
            userId={user?.id || 'demo-user-id'}
            onSuccess={loadVaultData}
          />

          <EditFolderModal
            isOpen={isEditFolderOpen}
            folder={editingFolder}
            onClose={() => {
              setIsEditFolderOpen(false);
              setEditingFolder(null);
            }}
            onSave={handleUpdateFolder}
            onDelete={handleDeleteFolder}
          />

          <NoteEditorModal
            note={activeNote}
            isOpen={isNoteEditorOpen}
            onClose={() => {
              setIsNoteEditorOpen(false);
              setActiveNote(null);
            }}
            onSaveComplete={loadVaultData}
            userId={user.id}
            currentFolderId={currentFolderId}
          />

          <WhiteboardModal
            whiteboard={activeWhiteboard}
            isOpen={isWhiteboardOpen}
            onClose={() => {
              setIsWhiteboardOpen(false);
              setActiveWhiteboard(null);
            }}
            onSaveComplete={loadVaultData}
            userId={user.id}
            currentFolderId={currentFolderId}
          />

          <FilePreviewModal
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
            onDelete={handleDeleteFile}
            onOpenPdfEditor={(file) => setActivePdfFile(file)}
          />
        </>
      )}
    </div>
  );
}
