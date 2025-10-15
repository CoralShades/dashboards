-- ============================================================================
-- ROLLBACK SCRIPT: POLICY DOCUMENTS TO NOTEBOOKS MIGRATION
-- This script safely rolls back the notebooks to policy_documents migration
-- ============================================================================

-- CRITICAL: This should only be run if the migration needs to be rolled back
-- Test this script thoroughly on staging before production use

BEGIN;

-- Check if policy_documents table exists before attempting rollback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'policy_documents'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK ERROR: policy_documents table does not exist - nothing to rollback';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notebooks'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK ERROR: notebooks table already exists - rollback may cause conflicts';
  END IF;
END $$;

-- Step 1: Drop foreign key constraints (reversal of migration)
ALTER TABLE IF EXISTS public.sources
DROP CONSTRAINT IF EXISTS sources_policy_document_id_fkey;

ALTER TABLE IF EXISTS public.notes
DROP CONSTRAINT IF EXISTS notes_policy_document_id_fkey;

-- Step 2: Drop RLS policies from policy_documents
DROP POLICY IF EXISTS "Users can view their own policy documents" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can create their own policy documents" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can update their own policy documents" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can delete their own policy documents" ON public.policy_documents;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_policy_documents_user_id;
DROP INDEX IF EXISTS idx_policy_documents_updated_at;

-- Step 4: Rename table back to notebooks
ALTER TABLE IF EXISTS public.policy_documents RENAME TO notebooks;

-- Step 5: Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_updated_at ON public.notebooks(updated_at DESC);

-- Step 6: Recreate original RLS policies
CREATE POLICY "Users can view their own notebooks"
    ON public.notebooks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notebooks"
    ON public.notebooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
    ON public.notebooks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
    ON public.notebooks FOR DELETE
    USING (auth.uid() = user_id);

-- Step 7: Recreate foreign key constraints with original names
ALTER TABLE IF EXISTS public.sources
ADD CONSTRAINT sources_notebook_id_fkey
FOREIGN KEY (notebook_id) REFERENCES public.notebooks(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.notes
ADD CONSTRAINT notes_notebook_id_fkey
FOREIGN KEY (notebook_id) REFERENCES public.notebooks(id) ON DELETE CASCADE;

-- Step 8: Add back any audio-related columns that were removed (if needed)
-- Note: This assumes the original schema had these columns
ALTER TABLE public.notebooks
ADD COLUMN IF NOT EXISTS audio_overview_generation_status TEXT,
ADD COLUMN IF NOT EXISTS audio_overview_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url_expires_at TIMESTAMPTZ;

-- Final validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notebooks'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: notebooks table was not created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'policy_documents'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK FAILED: policy_documents table still exists';
  END IF;

  RAISE NOTICE 'ROLLBACK COMPLETED: Successfully rolled back to notebooks table structure';
END $$;

COMMIT;