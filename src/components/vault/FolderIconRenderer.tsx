'use client';

import React from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  FolderHeart,
  FolderArchive,
  GraduationCap,
  BookOpen,
  Briefcase,
  Code2,
  Terminal,
  Cpu,
  Database,
  Music,
  Camera,
  Video,
  Image as ImageIcon,
  Heart,
  Star,
  Sparkles,
  Zap,
  Coffee,
  Bookmark,
  FileText,
  Flame,
  Compass,
  Archive,
  Palette,
  Atom,
  Layers,
  LucideIcon
} from 'lucide-react';

export interface FolderIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const FOLDER_ICONS: FolderIconOption[] = [
  { id: 'folder', label: 'Folder', icon: FolderIcon },
  { id: 'folderOpen', label: 'Open', icon: FolderOpen },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'book', label: 'Books', icon: BookOpen },
  { id: 'briefcase', label: 'Work', icon: Briefcase },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'cpu', label: 'AI/Tech', icon: Cpu },
  { id: 'atom', label: 'Science', icon: Atom },
  { id: 'database', label: 'Data', icon: Database },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'image', label: 'Artwork', icon: ImageIcon },
  { id: 'palette', label: 'Design', icon: Palette },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'sparkles', label: 'Ideas', icon: Sparkles },
  { id: 'zap', label: 'Projects', icon: Zap },
  { id: 'coffee', label: 'Life', icon: Coffee },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { id: 'fileText', label: 'Docs', icon: FileText },
  { id: 'flame', label: 'Goals', icon: Flame },
  { id: 'compass', label: 'Explore', icon: Compass },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export const POPULAR_FOLDER_EMOJIS = [
  '📚', '💻', '🔬', '🎨', '🚀', '🎯', '💡', '📝', 
  '⚡', '⭐', '🔥', '🎵', '💼', '🏆', '🧠', '🌿', 
  '📊', '🔐', '📌', '🎓', '🧪', '🥑', '☕', '🏛️'
];

export const FOLDER_PALETTE = [
  { name: 'Mint', value: '#2DD4BF' },
  { name: 'Emerald', value: '#4ADE80' },
  { name: 'Sky', value: '#38BDF8' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Slate', value: '#64748B' },
];

interface FolderIconRendererProps {
  icon?: string | null;
  className?: string;
}

export function FolderIconRenderer({ icon, className = 'w-5 h-5' }: FolderIconRendererProps) {
  if (!icon || icon === 'folder') {
    return <FolderIcon className={`${className} fill-current`} />;
  }

  // Check if it's one of the registered Lucide icon keys
  const match = FOLDER_ICONS.find((i) => i.id.toLowerCase() === icon.toLowerCase());
  if (match) {
    const IconComp = match.icon;
    return <IconComp className={className} />;
  }

  // Otherwise, it's a personal emoji or custom character
  return (
    <span className="text-base sm:text-lg leading-none select-none flex items-center justify-center pointer-events-none">
      {icon}
    </span>
  );
}
