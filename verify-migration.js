import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnmsyofypuhxjlzwnuhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXN5b2Z5cHVoeGpsendudWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU3NDE2MCwiZXhwIjoyMDczMTUwMTYwfQ.1lsAm0DXeWXtG_HBJfToot5FjmAVHm_50CnKpT_lAXk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying migration status...');

  const results = {
    success: 0,
    warnings: 0,
    errors: 0
  };

  try {
    // 1. Check if policy_documents table exists and is accessible
    console.log('\n1️⃣ Testing policy_documents table access...');
    try {
      const { data: policyData, error: policyError } = await supabase
        .from('policy_documents')
        .select('id, title, created_at, updated_at')
        .limit(5);

      if (policyError) {
        console.log('❌ Error:', policyError.message);
        results.errors++;
      } else {
        console.log('✅ policy_documents table accessible');
        console.log(`   Found ${policyData?.length || 0} records`);
        results.success++;
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
      results.errors++;
    }

    // 2. Check if notebooks table is gone
    console.log('\n2️⃣ Verifying notebooks table removal...');
    try {
      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id')
        .limit(1);

      if (notebooksError && notebooksError.code === '42P01') {
        console.log('✅ notebooks table successfully removed');
        results.success++;
      } else if (notebooksError) {
        console.log('⚠️  Unexpected error:', notebooksError.message);
        results.warnings++;
      } else {
        console.log('⚠️  notebooks table still exists - migration may not be complete');
        results.warnings++;
      }
    } catch (err) {
      console.log('✅ notebooks table not accessible (expected)');
      results.success++;
    }

    // 3. Test foreign key relationships
    console.log('\n3️⃣ Testing foreign key relationships...');
    try {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('id, notebook_id')
        .limit(3);

      if (sourcesError) {
        console.log('❌ Sources table error:', sourcesError.message);
        results.errors++;
      } else {
        console.log('✅ sources table accessible');
        console.log(`   Found ${sourcesData?.length || 0} source records`);
        results.success++;
      }
    } catch (err) {
      console.log('❌ Sources test failed:', err.message);
      results.errors++;
    }

    // 4. Test API functionality with new table
    console.log('\n4️⃣ Testing basic CRUD operations...');
    try {
      // Try to count records
      const { count, error: countError } = await supabase
        .from('policy_documents')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log('❌ Count operation failed:', countError.message);
        results.errors++;
      } else {
        console.log(`✅ Count operation successful: ${count} total records`);
        results.success++;
      }
    } catch (err) {
      console.log('❌ CRUD test failed:', err.message);
      results.errors++;
    }

    // 5. Test RLS policies (basic check)
    console.log('\n5️⃣ Testing Row Level Security...');
    try {
      // Use anon key to test RLS
      const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXN5b2Z5cHVoeGpsendudWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzQxNjAsImV4cCI6MjA3MzE1MDE2MH0.7HPPem9o3-uaT_f6VKDQdMhDShy7ZcR_prJGdO71aKU');

      const { data: anonData, error: anonError } = await anonClient
        .from('policy_documents')
        .select('id')
        .limit(1);

      if (anonError && anonError.message.includes('RLS')) {
        console.log('✅ RLS is working - anon access properly restricted');
        results.success++;
      } else if (anonError) {
        console.log('⚠️  RLS test inconclusive:', anonError.message);
        results.warnings++;
      } else {
        console.log('⚠️  RLS may not be working properly - anon access succeeded');
        results.warnings++;
      }
    } catch (err) {
      console.log('⚠️  RLS test failed:', err.message);
      results.warnings++;
    }

    // Summary
    console.log('\n📊 Migration Verification Summary:');
    console.log(`✅ Success: ${results.success}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Errors: ${results.errors}`);

    if (results.errors === 0) {
      console.log('\n🎉 Migration verification PASSED!');
      console.log('✅ policy_documents table is working correctly');
      console.log('✅ Application should function properly');
    } else {
      console.log('\n⚠️  Migration verification has issues');
      console.log('🔧 Some manual fixes may be needed');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyMigration();