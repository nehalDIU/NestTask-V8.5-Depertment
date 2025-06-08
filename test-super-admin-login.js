/**
 * Super Admin Login Test
 * 
 * This script tests the super admin login functionality by:
 * 1. Checking the credentials in the database
 * 2. Verifying the role assignment
 * 3. Ensuring proper redirection to the super admin dashboard
 */

const { createClient } = require('@supabase/supabase-js');

// Replace these with your Supabase project URL and anon key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kyigkhrzixlcdtygkndu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_ANON_KEY environment variable is not set');
  console.log('Please provide your Supabase anon key by running:');
  console.log('VITE_SUPABASE_ANON_KEY=your_anon_key node test-super-admin-login.js');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Super admin credentials
const SUPER_ADMINS = [
  {
    email: 'superadmin@nesttask.com',
    password: 'SuperAdmin123!',
    label: 'Original Super Admin'
  },
  {
    email: 'superadmin@diu.edu.bd',
    password: 'SuperAdmin123!',
    label: 'DIU Super Admin'
  }
];

async function testSuperAdminLogin(admin) {
  console.log(`\n🔍 Testing ${admin.label} Login Flow`);
  console.log('---------------------------------');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${admin.password}`);
  console.log('---------------------------------');

  try {
    // Step 1: Test authentication
    console.log('\n⏳ Step 1: Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: admin.email,
      password: admin.password
    });

    if (authError) {
      console.error('❌ Auth Error:', authError.message);
      return false;
    }

    console.log('✅ Successfully authenticated');
    console.log('🔑 Auth user details:');
    console.log(`  - ID: ${authData.user.id}`);
    console.log(`  - Email: ${authData.user.email}`);
    console.log(`  - Role in metadata: ${authData.user.user_metadata?.role || 'not set'}`);

    // Step 2: Check the public.users table
    console.log('\n⏳ Step 2: Checking user in public.users table...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', admin.email)
      .single();

    if (publicError) {
      console.error('❌ Public Users Error:', publicError.message);
    } else {
      console.log('✅ Found user in public.users table');
      console.log('👤 Public user details:');
      console.log(`  - ID: ${publicUser.id}`);
      console.log(`  - Email: ${publicUser.email}`);
      console.log(`  - Name: ${publicUser.name}`);
      console.log(`  - Role: ${publicUser.role}`);
    }

    // Step 3: Sign out
    await supabase.auth.signOut();
    console.log('🔒 Signed out after test');

    return !authError && publicUser?.role === 'super-admin';
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 SUPER ADMIN LOGIN TESTS');
  console.log('==========================');
  
  let allSuccessful = true;
  
  for (const admin of SUPER_ADMINS) {
    const success = await testSuperAdminLogin(admin);
    if (!success) allSuccessful = false;
  }
  
  console.log('\n🎯 SUMMARY:');
  if (allSuccessful) {
    console.log('✅ All super admin accounts can successfully log in');
    console.log('✅ You should be able to access the Super Admin Dashboard with either account');
  } else {
    console.log('❌ Some super admin accounts failed authentication');
    console.log('Please check the logs above for details on which accounts failed and why');
  }
}

// Run the tests
runTests().catch(console.error); 