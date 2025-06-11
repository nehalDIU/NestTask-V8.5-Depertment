# FCM Setup for Vercel Deployment

This guide will help you set up Firebase Cloud Messaging (FCM) to work properly on Vercel.

## Prerequisites

1. Firebase project created
2. Supabase project set up
3. Vercel account and project deployed

## Step 1: Get Firebase Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`nesttask-diu`)
3. Go to **Project Settings** > **Cloud Messaging**
4. Copy the **Server Key** (legacy)

## Step 2: Configure Supabase Environment Variables

1. Go to your Supabase dashboard
2. Navigate to **Settings** > **Edge Functions**
3. Add the following environment variable:

```
FCM_SERVER_KEY=your-firebase-server-key-here
```

**Important**: Replace `your-firebase-server-key-here` with the actual server key from Firebase.

## Step 3: Deploy Supabase Edge Function

Run the following command to deploy the FCM function:

```bash
# Deploy the FCM notification function
supabase functions deploy send-fcm-notification

# Verify deployment
supabase functions list
```

## Step 4: Run Database Migration

Apply the FCM tokens table migration:

```bash
# Apply the migration
supabase db push

# Or if using migrations
supabase migration up
```

## Step 5: Configure Vercel Environment Variables

In your Vercel dashboard, add these environment variables:

```
VITE_FIREBASE_API_KEY=AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8
VITE_FIREBASE_AUTH_DOMAIN=nesttask-diu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nesttask-diu
VITE_FIREBASE_STORAGE_BUCKET=nesttask-diu.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=743430115138
VITE_FIREBASE_APP_ID=1:743430115138:web:3cbbdc0c149def8f88c2db
VITE_FIREBASE_MEASUREMENT_ID=G-37LEQPKB3B
VITE_FIREBASE_VAPID_KEY=BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4
```

## Step 6: Test FCM Function

Test the FCM function directly:

```bash
# Test the function
curl -X POST \
  'https://your-supabase-project.supabase.co/functions/v1/send-fcm-notification' \
  -H 'Authorization: Bearer your-supabase-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "tokens": ["test-token"],
    "notification": {
      "title": "Test Notification",
      "body": "This is a test notification"
    },
    "data": {
      "url": "/",
      "type": "test"
    }
  }'
```

## Step 7: Verify Database Table

Check if the FCM tokens table was created:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'fcm_tokens';

-- Check table structure
\d fcm_tokens;

-- Check sample data
SELECT * FROM fcm_tokens LIMIT 5;
```

## Step 8: Test End-to-End Flow

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Configure FCM for Vercel"
   git push origin main
   ```

2. **Test on deployed site**:
   - Open your Vercel deployment
   - Log in to your account
   - Grant notification permission
   - Check browser console for FCM token generation
   - Create an admin task to trigger notification

## Troubleshooting

### Issue: "FCM not configured properly"

**Solution**: Check Supabase environment variables
```bash
# Check if FCM_SERVER_KEY is set
supabase functions list
```

### Issue: "Failed to send FCM notification"

**Possible causes**:
1. Invalid FCM server key
2. Invalid FCM tokens
3. Network connectivity issues

**Debug steps**:
1. Check Supabase function logs
2. Verify FCM server key
3. Test with a known valid token

### Issue: "Table 'fcm_tokens' doesn't exist"

**Solution**: Run the database migration
```bash
supabase db push
```

### Issue: FCM tokens not being saved

**Check**:
1. Database permissions
2. RLS policies
3. User authentication

## Testing Commands

### Test FCM Token Generation
```javascript
// Run in browser console
import { getFCMToken } from './src/firebase';
getFCMToken().then(token => console.log('Token:', token));
```

### Test Database Connection
```javascript
// Run in browser console
import { supabase } from './src/lib/supabase';
supabase.from('fcm_tokens').select('*').then(console.log);
```

### Test Notification Sending
```javascript
// Run in browser console (after logging in)
fetch('/api/test-notification', { method: 'POST' })
  .then(response => response.json())
  .then(console.log);
```

## Production Checklist

- [ ] Firebase server key configured in Supabase
- [ ] FCM Edge function deployed
- [ ] Database migration applied
- [ ] Vercel environment variables set
- [ ] Service worker properly configured
- [ ] HTTPS enabled (required for FCM)
- [ ] Notification permission flow working
- [ ] FCM tokens being saved to database
- [ ] Notifications being sent successfully

## Support

If you're still having issues:

1. Check Supabase function logs
2. Check Vercel deployment logs
3. Check browser console for errors
4. Test with the provided debug scripts
5. Verify all environment variables are set correctly

## Common Error Messages

### "FCM_SERVER_KEY not configured"
- Add FCM_SERVER_KEY to Supabase environment variables

### "Invalid registration token"
- Check if FCM token is valid and not expired
- Regenerate FCM token

### "Authentication error"
- Verify FCM server key is correct
- Check Firebase project settings

### "Network error"
- Check internet connectivity
- Verify FCM endpoints are accessible
- Check firewall/proxy settings
