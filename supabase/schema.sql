-- ==============================================================================
-- NotesGO - Database Schema & Security Setup
-- Run this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    is_favorite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for folder hierarchies and trash
CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON public.folders(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_deleted ON public.folders(user_id, deleted_at);

-- 3. Create Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    thumbnail TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for files retrieval
CREATE INDEX IF NOT EXISTS idx_files_user_folder ON public.files(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON public.files(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_files_favorite ON public.files(user_id, is_favorite);

-- 4. Create Notes Table (Notion-style rich notes)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content JSONB DEFAULT '{}'::jsonb,
    is_favorite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id, folder_id);

-- 5. Create Whiteboards Table (tldraw infinite canvas snapshots)
CREATE TABLE IF NOT EXISTS public.whiteboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Whiteboard',
    canvas_data JSONB DEFAULT '{}'::jsonb,
    thumbnail TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiteboards_user ON public.whiteboards(user_id, folder_id);

-- 6. Create Tags System
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.file_tags (
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;

-- 8. Policies for Folders
CREATE POLICY "Users can view own folders" ON public.folders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Policies for Files
CREATE POLICY "Users can view own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Policies for Notes
CREATE POLICY "Users can view own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- 11. Policies for Whiteboards
CREATE POLICY "Users can view own whiteboards" ON public.whiteboards
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whiteboards" ON public.whiteboards
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whiteboards" ON public.whiteboards
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whiteboards" ON public.whiteboards
    FOR DELETE USING (auth.uid() = user_id);

-- 12. Policies for Tags
CREATE POLICY "Users can view own tags" ON public.tags
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage file_tags" ON public.file_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = file_tags.file_id AND files.user_id = auth.uid()
        )
    );

-- 13. Create Storage Bucket for Vault Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: users can only access their own user_id directory
CREATE POLICY "Users can upload their own vault files" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view/download their own vault files" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own vault files" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own vault files" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 14. Create PDF Annotations Table (Vector inking, highlights, sticky notes)
CREATE TABLE IF NOT EXISTS public.pdf_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    annotations_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_pdf_annotations_file ON public.pdf_annotations(file_id);
ALTER TABLE public.pdf_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pdf annotations" ON public.pdf_annotations
    FOR ALL USING (auth.uid() = user_id);

