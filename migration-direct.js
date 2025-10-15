import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vnmsyofypuhxjlzwnuhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXN5b2Z5cHVoeGpsendudWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU3NDE2MCwiZXhwIjoyMDczMTUwMTYwfQ.1lsAm0DXeWXtG_HBJfToot5FjmAVHm_50CnKpT_lAXk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Starting migration with service role...');

  try {
    // Check if notebooks table exists using direct SQL
    console.log('📋 Checking current database structure...');

    const { data: tablesCheck, error: tablesError } = await supabase.rpc('exec', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('notebooks', 'policy_documents');
      `
    });

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    console.log('✅ Database connection successful');

    // Check tables directly
    const { data: notebooksExists } = await supabase.rpc('exec', {
      sql: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notebooks');`
    });

    const { data: policyDocsExists } = await supabase.rpc('exec', {
      sql: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'policy_documents');`
    });

    console.log('📋 notebooks table exists:', notebooksExists?.[0]?.exists || false);
    console.log('📋 policy_documents table exists:', policyDocsExists?.[0]?.exists || false);

    if (policyDocsExists?.[0]?.exists) {
      console.log('✅ Migration already completed - policy_documents table exists');

      // Verify some basic structure
      const { data: columns } = await supabase.rpc('exec', {
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'policy_documents' AND table_schema = 'public';`
      });

      console.log('📋 policy_documents has', columns?.length || 0, 'columns');
      return;
    }

    if (!notebooksExists?.[0]?.exists) {
      console.log('❌ notebooks table does not exist. Cannot proceed with migration.');
      console.log('ℹ️  This might be a fresh database or migration may not be needed.');
      return;
    }

    console.log('🚀 Starting migration - notebooks table found, proceeding to rename...');

    // Read migration file and execute each statement
    const migrationSql = fs.readFileSync('./supabase/migrations/20250117000001_rename_notebooks_to_policy_documents.sql', 'utf8');

    // Split into statements, removing comments and empty lines
    const statements = migrationSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && stmt !== 'BEGIN' && stmt !== 'COMMIT')
      .filter(stmt => !stmt.includes('ALTER PUBLICATION')); // Skip publication commands

    console.log(`📝 Executing ${statements.length} migration statements...`);

    let successCount = 0;
    let warningCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      const preview = statement.replace(/\s+/g, ' ').substring(0, 80);
      console.log(`⏳ [${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          console.warn(`⚠️  Warning:`, error.message);
          warningCount++;
        } else {
          console.log(`✅ Statement ${i + 1} completed`);
          successCount++;
        }
      } catch (err) {
        console.warn(`⚠️  Error:`, err.message);
        warningCount++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Migration summary: ${successCount} successful, ${warningCount} warnings`);

    // Verify migration
    const { data: finalCheck } = await supabase.rpc('exec', {
      sql: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'policy_documents');`
    });

    if (finalCheck?.[0]?.exists) {
      console.log('🎉 Migration completed successfully!');
      console.log('✅ policy_documents table created');

      // Test a simple query
      try {
        const { data: testData, error: testError } = await supabase
          .from('policy_documents')
          .select('id')
          .limit(1);

        if (testError) {
          console.warn('⚠️  Warning: Cannot query policy_documents:', testError.message);
        } else {
          console.log('✅ policy_documents table is accessible via API');
        }
      } catch (err) {
        console.warn('⚠️  API access test failed:', err.message);
      }

    } else {
      console.log('❌ Migration verification failed - policy_documents table not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

runMigration();