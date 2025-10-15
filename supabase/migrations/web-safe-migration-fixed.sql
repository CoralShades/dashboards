-- ============================================================================
-- RENAME NOTEBOOKS TO POLICY DOCUMENTS MIGRATION (Web Editor Safe - Fixed Dependencies)
-- This script renames the notebooks table to policy_documents and updates all references
-- Fixed dependency order to avoid function drop errors
-- ============================================================================

-- Step 1: Drop dependent policies first before dropping functions
DROP POLICY IF EXISTS "Users can view chat histories from their notebooks" ON public.n8n_chat_histories;
DROP POLICY IF EXISTS "Users can create chat histories in their notebooks" ON public.n8n_chat_histories;
DROP POLICY IF EXISTS "Users can delete chat histories from their notebooks" ON public.n8n_chat_histories;

-- Drop document policies that depend on is_notebook_owner_for_document
DROP POLICY IF EXISTS "Users can view documents from their notebooks" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents in their notebooks" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their notebooks" ON public.documents;
DROP POLICY IF EXISTS "Users can delete documents from their notebooks" ON public.documents;

-- Step 2: Now safely drop the old functions
DROP FUNCTION IF EXISTS public.is_notebook_owner(uuid);
DROP FUNCTION IF EXISTS public.is_notebook_owner_for_document(jsonb);

-- Step 3: Rename the main table
ALTER TABLE IF EXISTS public.notebooks RENAME TO policy_documents;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_notebooks_user_id;
DROP INDEX IF EXISTS idx_notebooks_updated_at;
CREATE INDEX IF NOT EXISTS idx_policy_documents_user_id ON public.policy_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_updated_at ON public.policy_documents(updated_at DESC);

-- Step 5: Update foreign key references in sources table
ALTER TABLE IF EXISTS public.sources
DROP CONSTRAINT IF EXISTS sources_notebook_id_fkey;

ALTER TABLE IF EXISTS public.sources
ADD CONSTRAINT sources_policy_document_id_fkey
FOREIGN KEY (notebook_id) REFERENCES public.policy_documents(id) ON DELETE CASCADE;

-- Step 6: Update foreign key references in notes table
ALTER TABLE IF EXISTS public.notes
DROP CONSTRAINT IF EXISTS notes_notebook_id_fkey;

ALTER TABLE IF EXISTS public.notes
ADD CONSTRAINT notes_policy_document_id_fkey
FOREIGN KEY (notebook_id) REFERENCES public.policy_documents(id) ON DELETE CASCADE;

-- Step 7: Update RLS policies for the renamed table
DROP POLICY IF EXISTS "Users can view their own notebooks" ON public.policy_documents;
CREATE POLICY "Users can view their own policy documents"
    ON public.policy_documents FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notebooks" ON public.policy_documents;
CREATE POLICY "Users can create their own policy documents"
    ON public.policy_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notebooks" ON public.policy_documents;
CREATE POLICY "Users can update their own policy documents"
    ON public.policy_documents FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notebooks" ON public.policy_documents;
CREATE POLICY "Users can delete their own policy documents"
    ON public.policy_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Step 8: Update policies for sources table
DROP POLICY IF EXISTS "Users can view sources from their notebooks" ON public.sources;
CREATE POLICY "Users can view sources from their policy documents"
    ON public.sources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = sources.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create sources in their notebooks" ON public.sources;
CREATE POLICY "Users can create sources in their policy documents"
    ON public.sources FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = sources.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update sources in their notebooks" ON public.sources;
CREATE POLICY "Users can update sources in their policy documents"
    ON public.sources FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = sources.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete sources from their notebooks" ON public.sources;
CREATE POLICY "Users can delete sources from their policy documents"
    ON public.sources FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = sources.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

-- Step 9: Update policies for notes table
DROP POLICY IF EXISTS "Users can view notes from their notebooks" ON public.notes;
CREATE POLICY "Users can view notes from their policy documents"
    ON public.notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = notes.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create notes in their notebooks" ON public.notes;
CREATE POLICY "Users can create notes in their policy documents"
    ON public.notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = notes.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update notes in their notebooks" ON public.notes;
CREATE POLICY "Users can update notes in their policy documents"
    ON public.notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = notes.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete notes from their notebooks" ON public.notes;
CREATE POLICY "Users can delete notes in their policy documents"
    ON public.notes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.policy_documents
            WHERE policy_documents.id = notes.notebook_id
            AND policy_documents.user_id = auth.uid()
        )
    );

-- Step 10: Create new functions
CREATE OR REPLACE FUNCTION public.is_policy_document_owner(policy_document_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.policy_documents
        WHERE id = policy_document_id_param
        AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_policy_document_owner_for_document(doc_metadata jsonb)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.policy_documents
        WHERE id = (doc_metadata->>'notebook_id')::uuid
        AND user_id = auth.uid()
    );
$$;

-- Step 11: Create new policies using the new functions
CREATE POLICY "Users can view documents from their policy documents"
    ON public.documents FOR SELECT
    USING (public.is_policy_document_owner_for_document(metadata));

CREATE POLICY "Users can create documents in their policy documents"
    ON public.documents FOR INSERT
    WITH CHECK (public.is_policy_document_owner_for_document(metadata));

CREATE POLICY "Users can update documents in their policy documents"
    ON public.documents FOR UPDATE
    USING (public.is_policy_document_owner_for_document(metadata));

CREATE POLICY "Users can delete documents from their policy documents"
    ON public.documents FOR DELETE
    USING (public.is_policy_document_owner_for_document(metadata));

-- Step 12: Create new chat history policies
CREATE POLICY "Users can view chat histories from their policy documents"
    ON public.n8n_chat_histories FOR SELECT
    USING (public.is_policy_document_owner(session_id::uuid));

CREATE POLICY "Users can create chat histories in their policy documents"
    ON public.n8n_chat_histories FOR INSERT
    WITH CHECK (public.is_policy_document_owner(session_id::uuid));

CREATE POLICY "Users can delete chat histories from their policy documents"
    ON public.n8n_chat_histories FOR DELETE
    USING (public.is_policy_document_owner(session_id::uuid));

-- Step 13: Update triggers
DROP TRIGGER IF EXISTS update_notebooks_updated_at ON public.policy_documents;
CREATE TRIGGER update_policy_documents_updated_at
    BEFORE UPDATE ON public.policy_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 14: Remove audio-related columns that are no longer needed
ALTER TABLE public.policy_documents
DROP COLUMN IF EXISTS audio_overview_generation_status,
DROP COLUMN IF EXISTS audio_overview_url,
DROP COLUMN IF EXISTS audio_url_expires_at;

-- Migration completed successfully!
-- NOTE: Realtime publication updates removed - these cause syntax errors in web editor