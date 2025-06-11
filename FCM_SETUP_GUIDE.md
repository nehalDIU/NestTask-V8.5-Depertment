# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in your NestTask application.

## Prerequisites

1. A Firebase project
2. A web app registered in your Firebase project
3. FCM enabled in your Firebase project

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard to create your project

## Step 2: Register Web App

1. In your Firebase project console, click the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "NestTask Web")
3. Copy the Firebase configuration object

## Step 3: Enable Cloud Messaging

1. In your Firebase project console, go to "Cloud Messaging" in the left sidebar
2. If prompted, enable the Cloud Messaging API
3. Go to the "Web configuration" tab
4. Generate a new key pair for VAPID (if not already generated)
5. Copy the VAPID key

## Step 4: Get Server Key

1. In your Firebase project console, go to Project Settings (gear icon)
2. Go to the "Cloud Messaging" tab
3. Copy the "Server key" (this will be used in your backend)

## Step 5: Update Environment Variables

Update your `.env` file with the Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

## Step 6: Update Firebase Service Worker

Update `public/firebase-messaging-sw.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

## Step 7: Update Supabase Edge Function

Update `supabase/functions/send-fcm-notification/index.ts`:

1. Set the FCM_SERVER_KEY environment variable in your Supabase project
2. Or replace the placeholder with your actual server key

## Step 8: Update Manifest

Update `public/manifest.json` with your Firebase sender ID:

```json
{
  "gcm_sender_id": "your-sender-id"
}
```

## Step 9: Deploy Supabase Functions

Deploy the FCM notification function:

```bash
supabase functions deploy send-fcm-notification
```

## Step 10: Run Database Migration

Apply the FCM tokens table migration:

```bash
supabase db push
```

## Testing

1. Start your development server
2. Open the app in a browser
3. Grant notification permissions when prompted
4. Check the browser console for FCM token generation
5. Create an admin task to test notifications

## Troubleshooting

### Common Issues

1. **VAPID key mismatch**: Ensure the VAPID key in your environment matches the one in Firebase
2. **Service worker registration fails**: Check browser console for errors
3. **Notifications not received**: Verify FCM server key and token storage
4. **Permission denied**: Check if notifications are blocked in browser settings

### Debug Steps

1. Check browser console for FCM-related errors
2. Verify environment variables are loaded correctly
3. Test FCM token generation manually
4. Check Supabase function logs for errors

## Security Notes

1. Never expose your FCM server key in client-side code
2. Use environment variables for all sensitive configuration
3. Implement proper RLS policies for the FCM tokens table
4. Regularly rotate your VAPID keys and server keys

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
