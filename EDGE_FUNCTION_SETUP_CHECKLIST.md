# Edge Function Setup Checklist ✅

This checklist ensures your FCM push notification edge function is properly set up and deployed.

## 📋 Prerequisites

### 1. Install Supabase CLI
```bash
# Install globally via npm
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Login to Supabase
```bash
# Login with your Supabase account
supabase login

# Verify you can see your projects
supabase projects list
```

## 🔧 Project Setup

### 3. Initialize Supabase (if not done)
```bash
# In your project directory
supabase init
```

### 4. Link to Your Project (optional but recommended)
```bash
# Replace with your actual project reference
supabase link --project-ref jqpdftmgertvsgpwdvgw
```

## 📁 File Verification

### 5. Check Required Files Exist

✅ **Edge Function Files:**
- `supabase/functions/push/index.ts` ✅ (Created)
- `supabase/config.toml` ✅ (Created)

✅ **Migration Files:**
- `supabase/migrations/20250619000001_create_fcm_tokens_table.sql` ✅ (Created)
- `supabase/migrations/20250619000002_create_task_notification_trigger.sql` ✅ (Created)

✅ **Configuration Files:**
- `.env` ✅ (Created with Firebase config)
- `supabase/.env` ✅ (Created for edge functions)

✅ **Setup Scripts:**
- `deploy-functions.sh` ✅ (Created)
- `verify-edge-function.sh` ✅ (Created)
- `configure-notifications.sql` ✅ (Created)
- `test-task-notifications.sql` ✅ (Created)

## 🚀 Deployment Steps

### 6. Run Verification Script
```bash
# Check if everything is set up correctly
./verify-edge-function.sh
```

### 7. Deploy the Edge Function
```bash
# Deploy the push notification function
./deploy-functions.sh

# Or manually:
supabase functions deploy push
```

### 8. Set Environment Variables

Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Environment Variables**

Add these variables:
- `FIREBASE_SERVER_KEY`: Your Firebase Server Key (from Firebase Console → Project Settings → Cloud Messaging)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (from Project Settings → API)

### 9. Run Database Migrations
```bash
# Apply all migrations
supabase db push

# Or manually run each SQL file in Supabase SQL Editor
```

### 10. Configure Notification Settings

Run this in **Supabase SQL Editor**:
```sql
-- Replace with your actual values
SELECT configure_notification_settings(
  'https://jqpdftmgertvsgpwdvgw.supabase.co',
  'your-service-role-key-here'
);
```

## 🧪 Testing

### 11. Test the Edge Function

```bash
# Test with curl (replace with your actual values)
curl -X POST 'https://jqpdftmgertvsgpwdvgw.supabase.co/functions/v1/push' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "userIds": ["test-user-id"],
       "notification": {
         "title": "Test Notification",
         "body": "This is a test from the edge function"
       }
     }'
```

### 12. Test Database Trigger

Run the test script in **Supabase SQL Editor**:
```sql
-- Copy and paste contents of test-task-notifications.sql
-- Uncomment the test task insertion sections to actually test
```

### 13. Check Function Logs

```bash
# View edge function logs
supabase functions logs push

# Or check in Supabase Dashboard → Edge Functions → push → Logs
```

## 🔍 Verification Commands

### Check Edge Function Status
```bash
# List all functions
supabase functions list

# Check specific function
supabase functions inspect push
```

### Check Database Status
```bash
# Check migrations
supabase db diff

# Check if trigger exists
# Run in SQL Editor:
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'task_notification_trigger';
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Supabase CLI not installed"**
   ```bash
   npm install -g supabase
   ```

2. **"Not authenticated"**
   ```bash
   supabase login
   ```

3. **"Function deployment failed"**
   - Check if you're in the correct directory
   - Verify the function file exists
   - Check your internet connection

4. **"Environment variables not set"**
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Add FIREBASE_SERVER_KEY and SUPABASE_SERVICE_ROLE_KEY

5. **"Trigger not working"**
   - Check if migrations were applied
   - Verify configuration settings
   - Check edge function logs

## ✅ Final Checklist

- [ ] Supabase CLI installed and authenticated
- [ ] Project linked (optional)
- [ ] Edge function deployed successfully
- [ ] Environment variables set in Supabase Dashboard
- [ ] Database migrations applied
- [ ] Notification settings configured
- [ ] Test notification sent successfully
- [ ] Database trigger tested
- [ ] Function logs show no errors

## 📞 Support

If you encounter issues:

1. **Check the logs**: `supabase functions logs push`
2. **Verify configuration**: Run `./verify-edge-function.sh`
3. **Test step by step**: Use the test scripts provided
4. **Check Supabase Dashboard**: Look for errors in the Edge Functions section

## 🎉 Success!

Once all items are checked, your automatic FCM push notification system is ready! 

New tasks will automatically trigger notifications to the appropriate users based on their section/department.
