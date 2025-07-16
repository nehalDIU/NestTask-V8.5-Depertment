# Authentication Test Instructions

## Test Login Persistence

1. **Open the application**: http://localhost:5175
2. **Login with valid credentials**
3. **Check browser console** for these messages:
   - "Session stored in localStorage for persistence"
   - "Active session found, updating user state"
4. **Refresh the page** (F5 or Ctrl+R)
5. **Verify**: User should remain logged in
6. **Check browser console** for:
   - "Active session found, updating user state"

## Test Remember Me Feature

1. **Logout if logged in**
2. **Login with "Remember Me" checked**
3. **Close browser completely**
4. **Reopen browser and navigate to app**
5. **Verify**: Email should be pre-filled

## Test Session Storage

1. **Open Developer Tools** (F12)
2. **Go to Application/Storage tab**
3. **Check localStorage** for:
   - `nesttask_supabase_auth` (Supabase session)
   - `supabase.auth.token` (Backup session)
   - `dark-mode` (Theme preference)
   - `nesttask_remember_me` (if Remember Me was used)
   - `nesttask_saved_email` (if Remember Me was used)

## Expected Behavior

✅ **Login should persist across page refreshes**
✅ **Login should persist across browser restarts**
✅ **Theme preference should persist**
✅ **Remember Me should save email**
✅ **Logout should clear session properly**

## Troubleshooting

If login doesn't persist:
1. Check browser console for errors
2. Verify localStorage contains session data
3. Check if Supabase auth is properly configured
4. Ensure no browser extensions are blocking localStorage
