#!/bin/bash

# Deploy Supabase Edge Functions for NestTask FCM

echo "🚀 Deploying Supabase Edge Functions for NestTask..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Run 'supabase init' first."
    exit 1
fi

# Check if push function exists
if [ ! -f "supabase/functions/push/index.ts" ]; then
    echo "❌ Push function not found. Make sure supabase/functions/push/index.ts exists."
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✅ Supabase CLI installed"
echo "✅ Config file exists"
echo "✅ Push function exists"

# Login check
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi
echo "✅ Authenticated with Supabase"

# Link to project if not already linked
echo "🔗 Checking project link..."
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️ Project not linked. You may need to run:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    echo "Continuing with deployment..."
fi

# Deploy the push notification function
echo "📤 Deploying push notification function..."
supabase functions deploy push --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Push notification function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables in Supabase Dashboard:"
    echo "   Go to: Project Settings → Edge Functions → Environment Variables"
    echo "   Add these variables:"
    echo "   - FIREBASE_SERVER_KEY: Your Firebase Server Key (from Firebase Console)"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase Service Role Key"
    echo ""
    echo "2. Configure the notification trigger:"
    echo "   Run this in Supabase SQL Editor:"
    echo "   SELECT configure_notification_settings("
    echo "     'https://jqpdftmgertvsgpwdvgw.supabase.co',"
    echo "     'your-service-role-key-here'"
    echo "   );"
    echo ""
    echo "3. Test the function:"
    echo "   curl -X POST 'https://jqpdftmgertvsgpwdvgw.supabase.co/functions/v1/push' \\"
    echo "        -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"userIds\":[\"test-user-id\"],\"notification\":{\"title\":\"Test\",\"body\":\"Test message\"}}'"
    echo ""
    echo "4. Check function logs:"
    echo "   supabase functions logs push"
else
    echo "❌ Failed to deploy push notification function"
    echo "Check the error above and try again."
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "📚 For more information, see: TASK_NOTIFICATION_SETUP.md"
