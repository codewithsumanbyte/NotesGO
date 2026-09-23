'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  X, 
  Save, 
  CheckCircle2, 
  Loader2, 
  Bold, 
  Italic, 
  Strikethrough,
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code, 
  Quote,
  Trash2,
  Columns,
  Eye,
  Edit3,
  Minus,
  Sparkles,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { NoteItem } from '@/types/database';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NoteEditorModalProps {
  note: NoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  userId: string;
  currentFolderId: string | null;
}

const EMOJI_OPTIONS = ['📝', '💡', '📚', '🎯', '🚀', '🧠', '🔬', '💻', '⚡', '📌', '📖', '✨'];

export function NoteEditorModal({
  note,
  isOpen,
  onClose,
  onSaveComplete,
  userId,
  currentFolderId,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState(note?.title || 'Untitled Note');
  const [content, setContent] = useState(
    typeof note?.content === 'string' ? note.content : (note?.content?.text || '')
  );
  const [selectedEmoji, setSelectedEmoji] = useState('📝');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Synchronous ID tracking to permanently solve the 3-file duplicate bug
  const currentNoteIdRef = useRef<string | null>(note?.id || null);
  const isSavingRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createClient();

  // Reset or load note whenever modal opens or note prop changes
  useEffect(() => {
    if (isOpen) {
      currentNoteIdRef.current = note?.id || null;
      setTitle(note?.title || 'Untitled Note');
      setContent(typeof note?.content === 'string' ? note.content : (note?.content?.text || ''));
      setLastSaved(note ? new Date(note.updated_at) : null);
      setShowDeleteConfirm(false);
      setShowEmojiPicker(false);
      
      // Auto-detect emoji from existing title if present
      if (note?.title) {
        const firstChars = note.title.slice(0, 2);
        const matched = EMOJI_OPTIONS.find((e) => note.title.startsWith(e));
        if (matched) {
          setSelectedEmoji(matched);
        }
      }
    }
  }, [note, isOpen]);

  // Core single-save logic with concurrency lock
  const saveNote = useCallback(async (manual = false) => {
    if (!userId || isSavingRef.current) return;
    
    // Check if empty new note
    if (!currentNoteIdRef.current && !content.trim() && (!title || title === 'Untitled Note')) {
      if (manual) onClose();
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const cleanTitle = title.trim() || 'Untitled Note';
      const noteId = currentNoteIdRef.current;

      if (noteId) {
        // ALWAYS update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: cleanTitle,
            content: { text: content },
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId);

        if (error) throw error;
      } else {
        // Brand new note: insert ONCE and capture ID immediately
        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            folder_id: currentFolderId,
            title: cleanTitle,
            content: { text: content },
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          currentNoteIdRef.current = data.id;
        }
      }

      setLastSaved(new Date());
      if (manual) {
        onSaveComplete();
        onClose();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [userId, title, content, currentFolderId, supabase, onSaveComplete, onClose]);

  // Debounced auto-save with debounce timer cleanup
  useEffect(() => {
    if (!isOpen || !userId) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveNote(false);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, isOpen, userId, saveNote]);

  // Manual save handler that clears pending auto-save immediately
  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    await saveNote(true);
  };

  // Delete note
  const handleDeleteNote = async () => {
    const idToDelete = currentNoteIdRef.current;
    if (!idToDelete) {
      onClose();
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('notes').delete().eq('id', idToDelete);
      if (error) throw error;
      onSaveComplete();
      onClose();
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Smart markdown formatting with auto-placeholder & selection retention
  const applyFormat = (formatType: 'bold' | 'italic' | 'strike' | 'h1' | 'h2' | 'bullet' | 'number' | 'checklist' | 'code' | 'quote' | 'hr') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (formatType) {
      case 'bold':
        if (selected) {
          replacement = `**${selected}**`;
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          replacement = '**bold text**';
          newCursorStart = start + 2;
          newCursorEnd = start + 11;
        }
        break;

      case 'italic':
        if (selected) {
          replacement = `*${selected}*`;
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          replacement = '*italic text*';
          newCursorStart = start + 1;
          newCursorEnd = start + 12;
        }
        break;

      case 'strike':
        if (selected) {
          replacement = `~~${selected}~~`;
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          replacement = '~~strikethrough~~';
          newCursorStart = start + 2;
          newCursorEnd = start + 15;
        }
        break;

      case 'h1': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `# ${currentLine.replace(/^#+\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'h2': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `## ${currentLine.replace(/^#+\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'bullet': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `- ${currentLine.replace(/^[-*]\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'number': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `1. ${currentLine.replace(/^\d+\.\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'checklist': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `- [ ] ${currentLine.replace(/^[-*]\s+\[[ xX]\]\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'quote': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, end);
        const newLine = `> ${currentLine.replace(/^>\s*/, '')}`;
        const newText = text.substring(0, lineStart) + newLine + text.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
        }, 30);
        return;
      }

      case 'code':
        if (selected.includes('\n')) {
          replacement = `\`\`\`javascript\n${selected || '// your code here'}\n\`\`\``;
          newCursorStart = start + 3;
          newCursorEnd = start + 13;
        } else if (selected) {
          replacement = `\`${selected}\``;
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          replacement = '`code snippet`';
          newCursorStart = start + 1;
          newCursorEnd = start + 13;
        }
        break;

      case 'hr':
        replacement = '\n---\n';
        newCursorStart = start + replacement.length;
        newCursorEnd = start + replacement.length;
        break;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 30);
  };

  // Keyboard shortcut listener for Ctrl+B, Ctrl+I, Ctrl+S
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat('italic');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleManualSave();
      }
    }
  };

  // Interactive checklist toggle from Preview mode
  const handleToggleTask = (lineIndex: number) => {
    const lines = content.split('\n');
    if (lines[lineIndex]) {
      const line = lines[lineIndex];
      if (line.match(/^[-*]\s+\[ \]/)) {
        lines[lineIndex] = line.replace(/^[-*]\s+\[ \]/, '- [x]');
      } else if (line.match(/^[-*]\s+\[[xX]\]/)) {
        lines[lineIndex] = line.replace(/^[-*]\s+\[[xX]\]/, '- [ ]');
      }
      setContent(lines.join('\n'));
    }
  };

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-5xl h-full sm:h-[90vh] flex flex-col bg-vault-surface border border-vault-border sm:rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Editor Top Bar */}
        <div className="h-14 px-3 sm:px-6 flex items-center justify-between border-b border-vault-border bg-vault-surface shrink-0 gap-2">
          {/* Left: Badge & Auto-save Status */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 rounded-xl bg-vault-card hover:bg-vault-border/50 border border-vault-border flex items-center justify-center text-base transition"
                title="Change Note Icon"
              >
                {selectedEmoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-10 left-0 z-50 p-2 bg-vault-card border border-vault-border rounded-2xl shadow-xl flex gap-1 flex-wrap w-44 animate-in fade-in zoom-in-95 duration-150">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-vault-surface flex items-center justify-center text-lg transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden xs:flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vault-primary font-mono flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Notion Note
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                {isSaving ? (
                  <span className="flex items-center gap-1 text-vault-primary animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1 text-vault-accent">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Saved
                  </span>
                ) : (
                  <span>Draft</span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Mode Tabs */}
          <div className="flex items-center bg-vault-card/70 p-0.5 rounded-xl border border-vault-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode('write')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'write' ? 'bg-vault-surface text-vault-primary shadow-sm' : 'text-muted-foreground hover:text-vault-text'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'split' ? 'bg-vault-surface text-vault-primary shadow-sm' : 'text-muted-foreground hover:text-vault-text'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'preview' ? 'bg-vault-surface text-vault-primary shadow-sm' : 'text-muted-foreground hover:text-vault-text'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Delete Button */}
            {currentNoteIdRef.current && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Note"
                className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Save & Close Button */}
            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">Save & Close</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Bar */}
        {showDeleteConfirm && (
          <div className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to delete this note? This action cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 bg-vault-card hover:bg-vault-surface rounded-lg text-vault-text transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNote}
                disabled={isDeleting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Formatting Toolbar */}
        <div className="px-3 sm:px-6 py-1.5 border-b border-vault-border bg-vault-card/40 flex items-center gap-1 flex-wrap text-muted-foreground text-xs overflow-x-auto">
          {/* Bold & Italic with distinct highlights */}
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition flex items-center gap-1 font-bold text-vault-primary"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition flex items-center gap-1 italic text-vault-accent"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('strike')}
            title="Strikethrough"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-vault-border mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => applyFormat('h1')}
            title="Heading 1"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition font-semibold"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('h2')}
            title="Heading 2"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition font-semibold"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-vault-border mx-1" />

          {/* Lists & Checklists */}
          <button
            type="button"
            onClick={() => applyFormat('checklist')}
            title="Task Checklist"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition text-vault-accent"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('bullet')}
            title="Bullet List"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('number')}
            title="Numbered List"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-vault-border mx-1" />

          {/* Quotes & Code */}
          <button
            type="button"
            onClick={() => applyFormat('quote')}
            title="Quote Callout"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('code')}
            title="Code Block"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition font-mono"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('hr')}
            title="Divider Line"
            className="p-1.5 hover:text-vault-text hover:bg-vault-card rounded-lg transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Note Body Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-vault-bg">
          {/* Note Title Input */}
          <div className="px-4 sm:px-8 pt-4 pb-2 border-b border-vault-border/30 bg-vault-bg shrink-0">
            <input
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full font-heading font-bold text-xl sm:text-2xl bg-transparent border-none outline-none text-vault-text placeholder:text-muted-foreground/30 focus:ring-0"
            />
          </div>

          {/* View Modes Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Write Panel */}
            {(viewMode === 'write' || viewMode === 'split') && (
              <div className={`flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto ${viewMode === 'split' ? 'border-r border-vault-border' : ''}`}>
                <textarea
                  ref={textareaRef}
                  placeholder="Type your notes here... Use formatting buttons or Ctrl+B for Bold, Ctrl+I for Italic, - [ ] for tasks, # for headings..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-vault-text/90 font-mono leading-relaxed placeholder:text-muted-foreground/25 min-h-[300px]"
                />
              </div>
            )}

            {/* Live Preview Panel */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-vault-bg/95">
                <div className="max-w-2xl mx-auto">
                  <MarkdownRenderer content={content} onToggleTask={handleToggleTask} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-8 px-4 sm:px-6 bg-vault-card/60 border-t border-vault-border flex items-center justify-between text-[11px] text-muted-foreground font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-vault-primary">
              <Sparkles className="w-3 h-3" />
              Notion Style
            </span>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <span className="hidden sm:inline">Ctrl+B Bold &bull; Ctrl+I Italic</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTimeMin} min read
            </span>
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>
        </div>
      </div>
    </div>
  );
}
