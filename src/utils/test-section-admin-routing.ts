/**
 * Test utility to verify section_admin role routing
 * This file helps debug and test the section_admin role redirection issue
 */

import { supabase } from '../lib/supabase';

export interface TestUser {
  id: string;
  email: string;
  role: string;
  section_id?: string;
  section_name?: string;
}

/**
 * Check if there are any users with section_admin role in the database
 */
export async function checkSectionAdminUsers(): Promise<TestUser[]> {
  try {
    console.log('🔍 Checking for users with section_admin role...');
    
    const { data: users, error } = await supabase
      .from('users_with_full_info')
      .select('id, email, role, section_id, section_name')
      .eq('role', 'section_admin');
    
    if (error) {
      console.error('❌ Error fetching section admin users:', error);
      return [];
    }
    
    console.log(`✅ Found ${users?.length || 0} section admin users:`, users);
    return users || [];
  } catch (error) {
    console.error('❌ Exception while checking section admin users:', error);
    return [];
  }
}

/**
 * Test the role routing logic for a given user role
 */
export function testRoleRouting(userRole: string): string {
  console.log(`🧪 Testing role routing for role: "${userRole}"`);
  
  if (userRole === 'super-admin') {
    console.log('✅ Would redirect to SuperAdminDashboard');
    return 'SuperAdminDashboard';
  }
  
  if (userRole === 'section_admin') {
    console.log('✅ Would redirect to AdminDashboard (section admin)');
    return 'AdminDashboard';
  }
  
  if (userRole === 'admin') {
    console.log('✅ Would redirect to AdminDashboard (regular admin)');
    return 'AdminDashboard';
  }
  
  console.log('✅ Would redirect to HomePage (regular user)');
  return 'HomePage';
}

/**
 * Create a test section admin user (for development/testing only)
 */
export async function createTestSectionAdmin(email: string, password: string, sectionId: string): Promise<boolean> {
  try {
    console.log('🔧 Creating test section admin user...');
    
    // First, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'section_admin'
        }
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return false;
    }
    
    if (!authData.user) {
      console.error('❌ No user returned from auth signup');
      return false;
    }
    
    // Update the user's role in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'section_admin',
        section_id: sectionId
      })
      .eq('id', authData.user.id);
    
    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return false;
    }
    
    console.log('✅ Test section admin user created successfully');
    return true;
  } catch (error) {
    console.error('❌ Exception while creating test section admin:', error);
    return false;
  }
}

/**
 * Get current user's role from database
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('❌ Error fetching user role:', error);
      return null;
    }
    
    console.log(`✅ Current user role: ${userData?.role}`);
    return userData?.role || null;
  } catch (error) {
    console.error('❌ Exception while getting current user role:', error);
    return null;
  }
}

/**
 * Run all tests to verify section admin routing
 */
export async function runSectionAdminTests(): Promise<void> {
  console.log('🚀 Running section admin routing tests...');
  console.log('='.repeat(50));
  
  // Test 1: Check for existing section admin users
  await checkSectionAdminUsers();
  
  // Test 2: Test role routing logic
  console.log('\n📋 Testing role routing logic:');
  testRoleRouting('user');
  testRoleRouting('admin');
  testRoleRouting('section_admin');
  testRoleRouting('super-admin');
  
  // Test 3: Check current user's role
  console.log('\n👤 Checking current user role:');
  await getCurrentUserRole();
  
  console.log('\n✅ Section admin routing tests completed');
  console.log('='.repeat(50));
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testSectionAdminRouting = {
    checkSectionAdminUsers,
    testRoleRouting,
    createTestSectionAdmin,
    getCurrentUserRole,
    runSectionAdminTests
  };
}
