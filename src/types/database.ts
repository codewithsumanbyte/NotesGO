export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  icon: string;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  file_count?: number;
  subfolder_count?: number;
}

export interface FileItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  thumbnail: string | null;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  url?: string;
  tags?: Tag[];
}

export interface NoteItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: any;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  canvas_data: any;
  thumbnail: string | null;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export type ViewMode = 'grid' | 'list';
export type ActiveTab = 'vault' | 'recent' | 'favorites' | 'notes' | 'whiteboards' | 'trash';
