'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FolderPlus, X, Loader2 } from 'lucide-react';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  userId: string;
  onSuccess: () => void;
}

const FOLDER_COLORS = [
  '#2DD4BF', // Mint Primary
  '#4ADE80', // Emerald Accent
  '#38BDF8', // Cyan
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#A855F7', // Purple
  '#64748B', // Slate
];

export function NewFolderModal({
  isOpen,
  onClose,
  currentFolderId,
  userId,
  onSuccess,
}: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('folders').insert({
        user_id: userId,
        parent_id: currentFolderId,
        name: name.trim(),
        color: selectedColor,
      });

      if (error) throw error;

      setName('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 bg-vault-surface border border-vault-border rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-vault-primary/10 text-vault-primary border border-vault-primary/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-semibold text-base text-vault-text">New Folder</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-vault-text hover:bg-vault-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Study, Research, Personal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-vault-card border border-vault-border rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-primary/40 focus:border-vault-primary transition placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Color Accent
            </label>
            <div className="flex items-center gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    selectedColor === color ? 'scale-125 border-vault-text' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-vault-text rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md shadow-vault-primary/20 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Folder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
