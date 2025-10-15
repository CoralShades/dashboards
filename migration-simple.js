import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vnmsyofypuhxjlzwnuhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXN5b2Z5cHVoeGpsendudWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU3NDE2MCwiZXhwIjoyMDczMTUwMTYwfQ.1lsAm0DXeWXtG_HBJfToot5FjmAVHm_50CnKpT_lAXk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Starting migration with service role...');

  try {
    // Try to check if we can access notebooks table directly
    console.log('📋 Checking if notebooks table exists...');

    try {
      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id')
        .limit(1);

      if (notebooksError && notebooksError.code === '42P01') {
        console.log('❌ notebooks table does not exist');
      } else if (notebooksError) {
        console.log('⚠️  Error accessing notebooks:', notebooksError.message);
      } else {
        console.log('✅ notebooks table exists with', notebooksData?.length || 0, 'records');
      }
    } catch (err) {
      console.log('❌ Cannot access notebooks table:', err.message);
    }

    // Try to check if policy_documents table exists
    console.log('📋 Checking if policy_documents table exists...');

    try {
      const { data: policyData, error: policyError } = await supabase
        .from('policy_documents')
        .select('id')
        .limit(1);

      if (policyError && policyError.code === '42P01') {
        console.log('❌ policy_documents table does not exist - migration needed');
      } else if (policyError) {
        console.log('⚠️  Error accessing policy_documents:', policyError.message);
      } else {
        console.log('✅ policy_documents table already exists with', policyData?.length || 0, 'records');
        console.log('🎉 Migration appears to be already completed!');
        return;
      }
    } catch (err) {
      console.log('❌ Cannot access policy_documents table - likely needs migration');
    }

    console.log('\n📄 Migration SQL content:');
    const migrationSql = fs.readFileSync('./supabase/migrations/20250117000001_rename_notebooks_to_policy_documents.sql', 'utf8');

    // Show first few lines of the migration
    const lines = migrationSql.split('\n').slice(0, 10);
    lines.forEach((line, i) => {
      console.log(`${i + 1}: ${line}`);
    });

    console.log('\n⚠️  Since the Supabase JavaScript client cannot execute DDL statements,');
    console.log('🔗 Please copy the migration script content and run it manually in:');
    console.log('   https://supabase.com/dashboard/project/vnmsyofypuhxjlzwnuhh/sql');
    console.log('\n📋 Steps to complete migration:');
    console.log('1. Copy the content from: supabase/migrations/20250117000001_rename_notebooks_to_policy_documents.sql');
    console.log('2. Paste it into the Supabase SQL Editor');
    console.log('3. Remove or comment out these lines that cause issues in web editor:');
    console.log('   - ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.notebooks;');
    console.log('   - ALTER PUBLICATION supabase_realtime ADD TABLE public.policy_documents;');
    console.log('4. Run the modified script');
    console.log('5. Run this verification script again to confirm success');

  } catch (error) {
    console.error('❌ Migration check failed:', error.message);
  }
}

runMigration();