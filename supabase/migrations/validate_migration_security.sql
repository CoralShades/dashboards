-- ============================================================================
-- MIGRATION SECURITY VALIDATION SCRIPT
-- Validates that the notebooks to policy_documents migration maintains security
-- ============================================================================

-- Check that all RLS policies are properly applied
DO $$
BEGIN
  -- Validate that policy_documents table exists and has RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'policy_documents'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: policy_documents table does not exist';
  END IF;

  -- Check RLS is enabled on policy_documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'policy_documents'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Row Level Security not enabled on policy_documents';
  END IF;

  -- Validate all required RLS policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_documents'
    AND policyname = 'Users can view their own policy documents'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing SELECT policy on policy_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_documents'
    AND policyname = 'Users can create their own policy documents'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing INSERT policy on policy_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_documents'
    AND policyname = 'Users can update their own policy documents'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing UPDATE policy on policy_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policy_documents'
    AND policyname = 'Users can delete their own policy documents'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing DELETE policy on policy_documents';
  END IF;

  -- Validate foreign key constraints are intact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'sources'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'notebook_id'
    AND tc.constraint_name = 'sources_policy_document_id_fkey'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing foreign key constraint from sources to policy_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'notes'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'notebook_id'
    AND tc.constraint_name = 'notes_policy_document_id_fkey'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Missing foreign key constraint from notes to policy_documents';
  END IF;

  -- Validate that old notebooks table no longer exists (to prevent data leakage)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notebooks'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'SECURITY ERROR: Old notebooks table still exists - potential data leakage';
  END IF;

  RAISE NOTICE 'SECURITY VALIDATION PASSED: All migration security checks completed successfully';
END $$;