require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('Checking database for users and their section assignments...');
  
  try {
    // Get total users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, section_id, department_id, batch_id');
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    console.log(`Total users in database: ${users.length}`);
    console.log(`Users with section assignments: ${users.filter(u => u.section_id).length}`);
    
    // Get departments, batches, and sections for names
    const { data: departments } = await supabase.from('departments').select('id, name');
    const { data: batches } = await supabase.from('batches').select('id, name, department_id');
    const { data: sections } = await supabase.from('sections').select('id, name, batch_id');
    
    // Create lookup maps
    const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
    const batchMap = new Map(batches?.map(b => [b.id, b.name]) || []);
    const sectionMap = new Map(sections?.map(s => [s.id, s.name]) || []);
    
    // Check for Computer Science and Engineering (CSE), Batch 50, Section A
    const cseDept = departments?.find(d => d.name.includes('Computer Science') || d.name.includes('CSE'));
    const batch50 = batches?.find(b => b.name.includes('50') && b.department_id === cseDept?.id);
    const sectionA = sections?.find(s => s.name.includes('A') && s.batch_id === batch50?.id);
    
    console.log('\nTarget filter details:');
    console.log(`Department - CSE: ${cseDept ? `Found (ID: ${cseDept.id})` : 'Not found'}`);
    console.log(`Batch 50: ${batch50 ? `Found (ID: ${batch50.id})` : 'Not found'}`);
    console.log(`Section A: ${sectionA ? `Found (ID: ${sectionA.id})` : 'Not found'}`);
    
    // Check if there are any users in the target section
    if (sectionA) {
      const sectionUsers = users.filter(u => u.section_id === sectionA.id);
      console.log(`\nUsers in Section A: ${sectionUsers.length}`);
      
      if (sectionUsers.length === 0) {
        console.log('No users found in this section. This matches the UI message.');
      } else {
        console.log('Section users:');
        sectionUsers.forEach(user => {
          console.log(`- ${user.name || 'Unnamed'} (${user.email}) - Role: ${user.role}`);
        });
      }
    }
    
    // Log all sections and their user counts for comparison
    console.log('\nAll sections and their user counts:');
    const sectionCounts = sections?.map(section => {
      const count = users.filter(u => u.section_id === section.id).length;
      const batch = batches?.find(b => b.id === section.batch_id);
      const dept = departments?.find(d => d.id === batch?.department_id);
      return {
        section: section.name,
        batch: batch?.name || 'Unknown',
        department: dept?.name || 'Unknown',
        userCount: count
      };
    });
    
    sectionCounts?.forEach(sc => {
      console.log(`- ${sc.department} > Batch ${sc.batch} > Section ${sc.section}: ${sc.userCount} users`);
    });
    
    // Check for possible data issues
    console.log('\nChecking for possible data issues:');
    
    // Users with section_id that doesn't exist in sections table
    const invalidSectionIds = users.filter(u => u.section_id && !sections?.some(s => s.id === u.section_id));
    if (invalidSectionIds.length > 0) {
      console.log(`Found ${invalidSectionIds.length} users with invalid section IDs`);
    }
    
    // Sections without associated users
    const sectionsWithoutUsers = sections?.filter(s => !users.some(u => u.section_id === s.id));
    console.log(`Found ${sectionsWithoutUsers?.length || 0} sections without any users assigned`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkUsers(); 