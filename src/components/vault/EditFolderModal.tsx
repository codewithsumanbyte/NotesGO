'use client';

import React, { useState, useEffect } from 'react';
import { Folder } from '@/types/database';
import { 
  X, 
  Palette, 
  Smile, 
  Loader2, 
  Check, 
  Trash2, 
  Sparkles,
  Edit2
} from 'lucide-react';
import { 
  FOLDER_ICONS, 
  POPULAR_FOLDER_EMOJIS, 
  FOLDER_PALETTE, 
  FolderIconRenderer 
} from './FolderIconRenderer';

interface EditFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onSave: (folderId: string, updates: { name: string; color: string; icon: string }) => Promise<void>;
  onDelete?: (folderId: string) => void;
}

export function EditFolderModal({
  isOpen,
  folder,
  onClose,
  onSave,
  onDelete,
}: EditFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#2DD4BF');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [iconMode, setIconMode] = useState<'preset' | 'emoji'>('preset');
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state whenever the target folder changes
  useEffect(() => {
    if (folder) {
      setName(folder.name || '');
      setSelectedColor(folder.color || '#2DD4BF');
      const icon = folder.icon || 'folder';
      setSelectedIcon(icon);

      // Check if icon is an emoji or preset
      const isPreset = FOLDER_ICONS.some((i) => i.id.toLowerCase() === icon.toLowerCase());
      if (isPreset) {
        setIconMode('preset');
        setCustomEmojiInput('');
      } else {
        setIconMode('emoji');
        setCustomEmojiInput(icon);
      }
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const finalIcon = iconMode === 'emoji' && customEmojiInput.trim() 
        ? customEmojiInput.trim() 
        : selectedIcon || 'folder';

      await onSave(folder.id, {
        name: name.trim(),
        color: selectedColor,
        icon: finalIcon,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeDisplayIcon = iconMode === 'emoji' && customEmojiInput.trim() 
    ? customEmojiInput.trim() 
    : selectedIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-vault-surface border border-vault-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-vault-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary border border-vault-primary/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-vault-text">Edit Folder</h3>
              <p className="text-[11px] text-muted-foreground font-mono">Customize appearance, color & icon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Live Preview Card */}
          <div>
            <span className="block text-[11px] font-mono text-muted-foreground mb-1.5">Live Preview</span>
            <div className="p-3.5 rounded-2xl bg-vault-card border border-vault-border flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-200"
                style={{ 
                  backgroundColor: `${selectedColor}25`, 
                  color: selectedColor 
                }}
              >
                <FolderIconRenderer icon={activeDisplayIcon} className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-vault-text truncate">
                  {name.trim() || 'Untitled Folder'}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Customized Folder
                </p>
              </div>
            </div>
          </div>

          {/* Folder Name */}
          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1.5">
              Folder Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Machine Learning, Physics, Work"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-vault-card border border-vault-border rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-primary/40 focus:border-vault-primary transition"
              />
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Color Accent Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-vault-text">
                Folder Color Accent
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">{selectedColor}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {FOLDER_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform relative flex items-center justify-center ${
                    selectedColor.toLowerCase() === c.value.toLowerCase()
                      ? 'scale-110 border-white shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {selectedColor.toLowerCase() === c.value.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />
                  )}
                </button>
              ))}

              {/* Custom Hex Color Input */}
              <label 
                className="w-7 h-7 rounded-full border border-vault-border flex items-center justify-center cursor-pointer hover:border-vault-primary transition overflow-hidden relative"
                title="Choose Custom Color"
              >
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <Palette className="w-3.5 h-3.5 text-muted-foreground hover:text-vault-primary" />
              </label>
            </div>
          </div>

          {/* Folder Icon Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-vault-text">
                Folder Icon & Personal Emoji
              </label>

              {/* Toggle Mode: Presets vs Personal Emoji */}
              <div className="flex items-center bg-vault-card border border-vault-border rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIconMode('preset')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    iconMode === 'preset'
                      ? 'bg-vault-primary text-vault-bg font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-vault-text'
                  }`}
                >
                  Icons
                </button>
                <button
                  type="button"
                  onClick={() => setIconMode('emoji')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                    iconMode === 'emoji'
                      ? 'bg-vault-primary text-vault-bg font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-vault-text'
                  }`}
                >
                  <Smile className="w-3 h-3" />
                  <span>Personal Emoji</span>
                </button>
              </div>
            </div>

            {/* A. Preset Lucide Icons Grid */}
            {iconMode === 'preset' ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-vault-border rounded-2xl bg-vault-card/50">
                {FOLDER_ICONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedIcon(item.id)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
                        isSelected
                          ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                          : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] truncate max-w-full font-mono">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* B. Personal Emoji & Custom Character Input */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-vault-card border border-vault-border flex items-center justify-center text-xl shrink-0">
                    {customEmojiInput.trim() || '📁'}
                  </div>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Type or paste any emoji (e.g. 📚, 🚀, 💡)"
                    value={customEmojiInput}
                    onChange={(e) => setCustomEmojiInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-vault-card border border-vault-border rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-primary/40 focus:border-vault-primary transition"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-mono text-muted-foreground mb-1.5">
                    Popular Quick-Select Emojis:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {POPULAR_FOLDER_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCustomEmojiInput(emoji)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border transition active:scale-95 ${
                          customEmojiInput === emoji
                            ? 'bg-vault-primary/20 border-vault-primary text-base shadow-sm'
                            : 'bg-vault-card border-vault-border hover:border-vault-primary/40 hover:bg-vault-surface'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-vault-border/60 flex items-center justify-between">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete folder "${folder.name}"?`)) {
                    onDelete(folder.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                title="Delete Folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-vault-text rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md shadow-vault-primary/20 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
