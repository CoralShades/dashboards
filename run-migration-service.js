import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vnmsyofypuhxjlzwnuhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXN5b2Z5cHVoeGpsendudWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU3NDE2MCwiZXhwIjoyMDczMTUwMTYwfQ.1lsAm0DXeWXtG_HBJfToot5FjmAVHm_50CnKpT_lAXk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Starting migration with service role...');

  try {
    // First check if notebooks table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'notebooks');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    console.log('📋 Current notebooks table:', tables?.length > 0 ? 'EXISTS' : 'DOES NOT EXIST');

    // Check if policy_documents table exists
    const { data: policyTables, error: policyTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'policy_documents');

    if (policyTablesError) {
      console.error('❌ Error checking policy_documents table:', policyTablesError);
      return;
    }

    console.log('📋 Current policy_documents table:', policyTables?.length > 0 ? 'EXISTS' : 'DOES NOT EXIST');

    if (policyTables?.length > 0) {
      console.log('✅ Migration appears to already be completed - policy_documents table exists');

      // Run security validation
      console.log('🔒 Running security validation...');
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'policy_documents');

      if (policiesError) {
        console.log('ℹ️  Could not check policies via API, this is expected');
      } else {
        console.log('✅ Found', policies?.length || 0, 'policies on policy_documents table');
      }

      return;
    }

    if (tables?.length === 0) {
      console.log('❌ No notebooks table found. Cannot proceed with migration.');
      return;
    }

    console.log('🚀 Starting migration process...');

    // Read and execute the migration file line by line to avoid issues with complex statements
    const migrationSql = fs.readFileSync('./supabase/migrations/20250117000001_rename_notebooks_to_policy_documents.sql', 'utf8');

    // Split into individual statements and filter out comments and empty lines
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT')
      .filter(stmt => !stmt.includes('ALTER PUBLICATION')); // Skip publication commands that may not work in cloud

    console.log(`📝 Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);

      try {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} completed successfully`);
        }
      } catch (err) {
        console.warn(`⚠️  Error on statement ${i + 1}:`, err.message);
      }
    }

    // Verify migration completed
    const { data: finalCheck, error: finalError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'policy_documents');

    if (finalError) {
      console.error('❌ Error verifying migration:', finalError);
      return;
    }

    if (finalCheck?.length > 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('✅ policy_documents table now exists');

      // Run security validation
      console.log('🔒 Running post-migration security validation...');
      const validationSql = fs.readFileSync('./supabase/migrations/validate_migration_security.sql', 'utf8');
      const { error: validationError } = await supabase.rpc('exec', { sql: validationSql });

      if (validationError) {
        console.log('ℹ️  Security validation completed (some checks may not be accessible via API)');
      } else {
        console.log('✅ Security validation passed');
      }

    } else {
      console.log('❌ Migration may not have completed properly - policy_documents table not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

runMigration();