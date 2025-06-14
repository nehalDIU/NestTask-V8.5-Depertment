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

## Step 6: Configure Firebase Service Worker

The Firebase Service Worker (`public/firebase-messaging-sw.js`) now loads its configuration from a separate file, `public/firebase-config.js`. You need to create or update this file with your Firebase project configuration.

**Create/Update `public/firebase-config.js`:**

Add the following content to `public/firebase-config.js`. These values should correspond to your Firebase project settings and ideally match the values you've set in your main application's environment variables (e.g., `.env` file, accessed as `VITE_FIREBASE_API_KEY` in `src/firebase.ts`).

```javascript
// IMPORTANT: REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE PROJECT CONFIGURATION
// These should match the VITE_FIREBASE_* variables in your .env file

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIGURATION
const firebaseConfig = {
  apiKey: "YOUR_VITE_FIREBASE_API_KEY", // e.g., from VITE_FIREBASE_API_KEY
  authDomain: "YOUR_VITE_FIREBASE_AUTH_DOMAIN", // e.g., from VITE_FIREBASE_AUTH_DOMAIN
  projectId: "YOUR_VITE_FIREBASE_PROJECT_ID", // e.g., from VITE_FIREBASE_PROJECT_ID
  storageBucket: "YOUR_VITE_FIREBASE_STORAGE_BUCKET", // e.g., from VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "YOUR_VITE_FIREBASE_MESSAGING_SENDER_ID", // e.g., from VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "YOUR_VITE_FIREBASE_APP_ID", // e.g., from VITE_FIREBASE_APP_ID
  measurementId: "YOUR_VITE_FIREBASE_MEASUREMENT_ID" // Optional, e.g., from VITE_FIREBASE_MEASUREMENT_ID
};

// The service worker (public/firebase-messaging-sw.js) will import this firebaseConfig.
```
Ensure that `public/firebase-messaging-sw.js` correctly imports this configuration by having `importScripts('./firebase-config.js');` at the top.

## Step 7: Configure Supabase Edge Function (`send-fcm-notification`)

The `send-fcm-notification` Edge Function is responsible for sending notifications to FCM.

1.  **Set `FCM_SERVER_KEY` Environment Variable:**
    *   In your Supabase project dashboard, navigate to "Settings" > "Functions".
    *   Select the `send-fcm-notification` function.
    *   Under "Secrets", add a new secret named `FCM_SERVER_KEY`.
    *   Set its value to the "Server key" you obtained from your Firebase project settings (see Step 4).
    *   **Crucially, the Edge Function code (`supabase/functions/send-fcm-notification/index.ts`) reads this value using `Deno.env.get('FCM_SERVER_KEY')`. Ensure this matches.**

    *Alternatively, if you are not using Supabase's environment variable system for functions (not recommended), you would have to hardcode this key in `supabase/functions/send-fcm-notification/index.ts`, which is insecure.*

## Step 8: Configure Database Trigger for Notifications

A database trigger is used to automatically send notifications when new announcements are created. This was added in migration `20250712000002_add_new_announcement_notification_trigger.sql`.

This migration performs the following:
*   Creates a PostgreSQL function named `public.notify_new_announcement`.
*   This function queries for FCM tokens and calls the `send-fcm-notification` Edge Function using `pg_net`.
*   Creates a trigger `trigger_new_announcement_notification` that fires `AFTER INSERT ON public.announcements` and executes the function.

**Requirements for the Database Trigger Function:**
*   **`pg_net` Extension:** The `pg_net` PostgreSQL extension must be enabled in your Supabase project. You can enable it under "Database" > "Extensions" in your Supabase project dashboard.
*   **Database Access to Project URL and Service Role Key:** The `notify_new_announcement` function needs to make an authenticated HTTP request to your project's Edge Function. It attempts to fetch these from PostgreSQL settings:
    *   **Project URL:** `current_setting('supabase.url', true)`
    *   **Service Role Key:** `current_setting('app.settings.service_role_key', true)`
    *   **Configuration:** Ensure these settings are available to your database. You might need to set `app.settings.service_role_key` as a database configuration variable (e.g., via SQL: `ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';`). If these settings are not correctly configured or accessible, the SQL function call to the Edge Function will fail. Refer to the comments in the migration file for more details.

## Step 9: Update Manifest

Update `public/manifest.json` with your Firebase `messagingSenderId`.

```json
{
  "gcm_sender_id": "YOUR_VITE_FIREBASE_MESSAGING_SENDER_ID"
}
```
**Note:** The `gcm_sender_id` field in `manifest.json` is primarily for compatibility with older Android web apps that might expect it. For modern web push notifications using Firebase (like in this project), the crucial part is having `messagingSenderId` correctly configured in your `public/firebase-config.js`, which is used by the service worker (`firebase-messaging-sw.js`). You can typically use your Firebase `messagingSenderId` (from `VITE_FIREBASE_MESSAGING_SENDER_ID`) for `gcm_sender_id` as well for consistency.

## Step 10: Deploy Supabase Functions

Deploy the FCM notification function:

```bash
supabase functions deploy send-fcm-notification
```

## Step 11: Run Database Migrations

Apply all pending database migrations. This will set up the `fcm_tokens` table (if not already present) and the `announcements` table trigger and function for sending notifications (`20250712000002_add_new_announcement_notification_trigger.sql`).

```bash
supabase db push
```
Or, if you prefer to manage migrations more explicitly:
```bash
supabase migration up
```
Ensure all local migrations in `supabase/migrations` are applied to your Supabase database.

## Testing Overview

The following sections detail how to test general FCM setup and the specific new announcement notification feature.

### General FCM Setup Testing (Token Generation & Basic Reception)

1.  **Start your development server.**
2.  **Open the app in a browser.** Notification permission should NOT be requested automatically on page load.
3.  **Log in or sign up** to your account.
4.  **After successful authentication,** notification permission should be requested (this is handled by `src/hooks/useFcm.ts`).
5.  **Grant notification permissions** when prompted by the browser.
6.  **Check for FCM Token:**
    *   Open browser developer tools.
    *   In the console, look for logs related to FCM token generation (e.g., "FCM Token generated:", "Saving FCM token to Supabase:").
    *   You can also check the `public.fcm_tokens` table in your Supabase database to see if a new token has been stored for the logged-in user.
7.  **(Optional) Test with a direct FCM message:** If you have a way to send a test message directly from the Firebase Console to the generated FCM token, this can verify basic client-side reception by the service worker.

### Testing New Announcement Notifications (End-to-End)

This tests the full pipeline: UI -> Database Trigger -> Supabase Edge Function -> FCM -> Client Notification.

**Prerequisites:**
*   All environment variables and configurations mentioned in previous steps are correctly set:
    *   Firebase config in `.env` (e.g., `VITE_FIREBASE_...` variables).
    *   `public/firebase-config.js` is correctly populated with these values.
    *   Supabase Edge Function `send-fcm-notification` has `FCM_SERVER_KEY` environment variable set.
    *   Database settings for `pg_net` are configured (URL and service key accessible to the `notify_new_announcement` SQL function).
*   The `pg_net` extension is enabled in your Supabase project (see Step 8).
*   All database migrations, including `..._add_new_announcement_notification_trigger.sql`, have been successfully run (`supabase db push`).
*   The Supabase Edge Function `send-fcm-notification` is deployed (e.g., `supabase functions deploy send-fcm-notification --no-verify-jwt`).

**Test Steps:**

1.  **Open the application in your browser.**
2.  **Log in** with a user account.
3.  **Subscribe to notifications:** Ensure you have previously granted notification permissions for the app in your browser. If not, the app should request it after login. Verify an FCM token is generated and stored.
4.  **Access Announcement Creation:** As a user with appropriate permissions (e.g., an admin), navigate to the section of the application where new announcements can be created.
5.  **Create a New Announcement:** Fill in the required details (e.g., title, content) and submit the form to create the announcement.
6.  **Verify Notification (Background):**
    *   Quickly after submitting, switch to a different browser tab, minimize the browser, or ensure the app tab is not active.
    *   A system push notification should appear shortly (usually within a few seconds to a minute, depending on FCM).
    *   The notification should display the title and a snippet of the announcement content.
    *   Clicking the notification should open or focus the application window/tab.
7.  **Verify Notification (Foreground):**
    *   If the application tab is open and active when the notification is processed by the client:
    *   A browser `alert()` dialog should appear, displaying the notification title and body (this is the current behavior implemented in `src/App.tsx`).
    *   (Future Enhancement: This alert could be replaced with a more user-friendly in-app notification/toast).
8.  **Check Logs for Issues:**
    *   **Browser Console:** Open developer tools in your browser and check the console for any errors related to message handling, token refreshing, or service worker activity.
    *   **Supabase Edge Function Logs:** Go to your Supabase project dashboard > "Edge Functions" > `send-fcm-notification` > "Logs". Look for:
        *   Invocation logs around the time you created the announcement.
        *   Messages indicating success (e.g., "Notification sent successfully to X tokens") or failure ("FCM Error:", "Failed to send FCM notification").
        *   Any error messages from the FCM API.
    *   **Supabase Database Logs (Postgres Logs):** If notifications are not being triggered at all, there might be an issue with the database trigger or the `notify_new_announcement` SQL function. Check your Supabase database logs (Dashboard > "Logs" > "Postgres Logs") for errors related to:
        *   `pg_net` (e.g., "pg_net not enabled", connection issues, authentication failures when calling the Edge Function).
        *   The `notify_new_announcement` function itself (e.g., SQL errors, issues fetching tokens or constructing the payload).

### Notification Permission Optimization

The app is optimized to only request notification permissions after successful user authentication:

- ✅ **No automatic permission request on page load**
- ✅ **Permission requested only after login/signup**
- ✅ **User-friendly timing with delays to let UI settle**
- ✅ **Session tracking to avoid multiple requests**
- ✅ **Graceful handling of denied permissions**

### Testing the Optimization

You can use the test component to verify the optimization:

1. Add the `NotificationTest` component to a route
2. Load the page without being logged in - no permission request should appear
3. Log in - permission request should appear after authentication
4. Verify the test results in the component

## Troubleshooting

### Common Issues

1.  **VAPID Key Mismatch**: Ensure `VITE_FIREBASE_VAPID_KEY` in your `.env` file (used by `src/firebase.ts` for token generation) matches the VAPID key pair configured in your Firebase project's Cloud Messaging settings.
2.  **Service Worker Issues**:
    *   **Registration Fails**: Check browser console for errors related to `firebase-messaging-sw.js` registration. Ensure the file exists in `public/` and `firebase-config.js` is also present and correct.
    *   **Scope Issues**: Ensure the service worker is registered with the correct scope (usually `/`).
3.  **Notifications Not Received**:
    *   **Incorrect `firebase-config.js`**: Double-check all values, especially `messagingSenderId`.
    *   **FCM Server Key**: Verify `FCM_SERVER_KEY` is correctly set for the Supabase Edge Function.
    *   **Token Issues**:
        *   Token not generated or not saved to `fcm_tokens` table.
        *   Token is stale/invalid (Firebase automatically handles this sometimes, but persistent issues might occur).
    *   **Edge Function Errors**: Check Supabase Edge Function logs for `send-fcm-notification`.
    *   **Database Trigger/Function Errors**: Check Postgres logs for errors in `notify_new_announcement` or `pg_net` issues.
    *   **Power Saving Modes (Device)**: Some operating systems or browsers might delay or block notifications if the device is in a power-saving mode or if the app is not frequently used.
4.  **Permission Denied**:
    *   User explicitly denied permission.
    *   Browser settings block notifications globally or for the specific site.
    *   Quiet Notification UI: Some browsers use a "quieter" notification permission UI which can be easily missed.
5.  **`pg_net` Errors**:
    *   Extension not enabled in Supabase.
    *   Network policies blocking outbound requests from Postgres (less common in Supabase managed environment but possible).
    *   Incorrect Supabase URL or Service Role Key configuration for the database function.

### Debug Steps

1.  **Browser Console**: Check for FCM-related errors, service worker messages, and any issues reported by `src/App.tsx`'s foreground message handler.
2.  **Verify Environment Variables**:
    *   Client-side: Use browser dev tools to confirm `VITE_FIREBASE_*` variables are correctly embedded (e.g., inspect the source or log them during init).
    *   `public/firebase-config.js`: Manually verify its contents.
    *   Supabase Edge Function: Confirm `FCM_SERVER_KEY` is set.
    *   Supabase Database: Confirm how `supabase.url` and `app.settings.service_role_key` are being resolved by the SQL function (check Postgres logs for warnings from the function if it can't find them).
3.  **Test FCM Token Generation**: Ensure tokens are created and stored in the `fcm_tokens` table upon login and permission grant.
4.  **Supabase Function Logs**: Examine logs for `send-fcm-notification` for detailed error messages or success confirmations.
5.  **Supabase Postgres Logs**: Check for any errors related to the `notify_new_announcement` trigger function or `pg_net` calls.
6.  **Firebase Console**: The Firebase console itself offers some (limited) delivery reporting for messages sent via FCM.

## Security Notes

1.  **Service Keys and API Keys**:
    *   Never expose your FCM Server Key (`FCM_SERVER_KEY`) or Supabase Service Role Key in client-side code or public repositories.
    *   Firebase API keys (`VITE_FIREBASE_API_KEY`, etc.) are generally considered safe for client-side use as they are for identifying your Firebase project, but ensure your Firebase project has appropriate security rules (e.g., Firestore rules, Storage rules).
2.  **Environment Variables**: Use environment variables (`.env` for client-side Vite config, Supabase project settings for Edge Function secrets and database config) for all sensitive configurations.
3.  **RLS Policies**: Implement proper Row Level Security (RLS) policies for the `fcm_tokens` table to ensure users can only access/manage their own tokens. The `announcements` table should also have appropriate RLS.
4.  **Key Rotation**: Consider regularly rotating your VAPID keys and FCM Server Key as a security best practice.
5.  **`pg_net` Security**: Be cautious with `pg_net` as it allows your database to make arbitrary HTTP requests. Ensure the functions using it (like `notify_new_announcement`) are secure and only call trusted endpoints. The use of `SECURITY DEFINER` for such functions requires careful review of the function's code to prevent potential misuse.

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
