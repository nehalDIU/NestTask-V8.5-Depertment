# Section Admin Role Routing Fix

## Problem
The `section_admin` role was not redirecting to the admin dashboard due to a role naming mismatch between the database and frontend code.

## Root Cause
- **Database**: Uses `section_admin` (with underscore)
- **Frontend**: Was checking for `section-admin` (with hyphen)

## Files Fixed

### 1. `src/App.tsx`
**Line 363**: Changed role check from `'section-admin'` to `'section_admin'`
```typescript
// Before
if (user.role === 'section-admin') {

// After  
if (user.role === 'section_admin') {
```

### 2. `src/services/auth.service.ts`
**Lines 604-618**: Updated `normalizeRole` function return type and logic
```typescript
// Before
function normalizeRole(role: string): 'user' | 'admin' | 'super-admin' | 'section-admin' {
  // ... 
  case 'section-admin':
  case 'section_admin':
    return 'section-admin';

// After
function normalizeRole(role: string): 'user' | 'admin' | 'super-admin' | 'section_admin' {
  // ...
  case 'section-admin':
  case 'section_admin':
    return 'section_admin';
```

### 3. `src/types/auth.ts`
**Line 7**: Updated User interface role type
```typescript
// Before
role: 'user' | 'admin' | 'super-admin' | 'section-admin';

// After
role: 'user' | 'admin' | 'super-admin' | 'section_admin';
```

### 4. `src/components/admin/UserList.tsx`
**Line 29**: Simplified section admin role check
```typescript
// Before
const isSectionAdminRole = (role: string) => role === 'section-admin' || role === 'section_admin';

// After
const isSectionAdminRole = (role: string) => role === 'section_admin';
```

### 5. `src/pages/AdminDashboard.tsx`
**Line 473**: Fixed promote user role parameter
```typescript
// Before
await promoteUser(userId, 'section-admin');

// After
await promoteUser(userId, 'section_admin');
```

### 6. `src/services/task.service.ts`
**Line 469**: Simplified section admin role check
```typescript
// Before
if ((userRole === 'section_admin' || userRole === 'section-admin') && userSectionId) {

// After
if (userRole === 'section_admin' && userSectionId) {
```

### 7. `src/hooks/useAuth.ts`
**Line 287**: Updated type assertion
```typescript
// Before
user.role = userData.role as 'user' | 'admin' | 'super-admin' | 'section-admin';

// After
user.role = userData.role as 'user' | 'admin' | 'super-admin' | 'section_admin';
```

## Testing

### Manual Testing
1. **Check existing section admin users**:
   ```javascript
   // In browser console
   testSectionAdminRouting.checkSectionAdminUsers()
   ```

2. **Test role routing logic**:
   ```javascript
   // In browser console
   testSectionAdminRouting.runSectionAdminTests()
   ```

3. **Check current user role**:
   ```javascript
   // In browser console
   testSectionAdminRouting.getCurrentUserRole()
   ```

### Create Test Section Admin User
If you need to create a test section admin user for testing:

1. **Via Super Admin Dashboard**:
   - Login as super admin
   - Go to Section Admins tab
   - Promote an existing user to section admin

2. **Via Database Function**:
   ```sql
   SELECT set_section_admin('user-uuid-here', 'section-uuid-here');
   ```

3. **Via Test Utility** (development only):
   ```javascript
   // In browser console
   testSectionAdminRouting.createTestSectionAdmin(
     'test-section-admin@example.com', 
     'password123', 
     'section-uuid-here'
   )
   ```

## Verification Steps

1. **Login with section admin credentials**
2. **Check browser console for role debugging**:
   ```
   Current user role: section_admin
   Complete user object: { role: "section_admin", ... }
   ```
3. **Verify redirection to AdminDashboard** (not HomePage)
4. **Confirm section-specific data filtering** works correctly

## Database Schema Consistency
The database schema correctly uses `section_admin` throughout:
- `users.role` constraint includes `'section_admin'`
- RLS policies check for `'section_admin'`
- Database functions use `'section_admin'`

## Next Steps
- Test with actual section admin users
- Verify all section admin functionality works correctly
- Monitor for any remaining role-related issues
- Consider adding automated tests for role routing
