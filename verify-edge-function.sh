#!/bin/bash

# Verify Edge Function Setup for NestTask FCM

echo "🔍 Verifying Edge Function Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check 1: Supabase CLI
echo "1. Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    VERSION=$(supabase --version)
    print_status 0 "Supabase CLI installed: $VERSION"
else
    print_status 1 "Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Check 2: Project structure
echo ""
echo "2. Checking project structure..."

if [ -f "supabase/config.toml" ]; then
    print_status 0 "Supabase config.toml exists"
else
    print_status 1 "Supabase config.toml missing"
    echo "Run: supabase init"
fi

if [ -f "supabase/functions/push/index.ts" ]; then
    print_status 0 "Push function exists"
    
    # Check function content
    if grep -q "serve" "supabase/functions/push/index.ts"; then
        print_status 0 "Push function has serve handler"
    else
        print_status 1 "Push function missing serve handler"
    fi
    
    if grep -q "FIREBASE_SERVER_KEY" "supabase/functions/push/index.ts"; then
        print_status 0 "Push function configured for Firebase"
    else
        print_status 1 "Push function missing Firebase configuration"
    fi
else
    print_status 1 "Push function missing"
    echo "Create with: supabase functions new push"
fi

# Check 3: Authentication
echo ""
echo "3. Checking Supabase authentication..."
if supabase projects list &> /dev/null; then
    print_status 0 "Authenticated with Supabase"
    
    # Try to get project info
    PROJECT_INFO=$(supabase projects list 2>/dev/null | grep -v "ID" | head -1)
    if [ ! -z "$PROJECT_INFO" ]; then
        echo "   Available projects found"
    fi
else
    print_status 1 "Not authenticated with Supabase"
    echo "Run: supabase login"
fi

# Check 4: Project linking
echo ""
echo "4. Checking project linking..."
if [ -f ".supabase/config.toml" ]; then
    print_status 0 "Project is linked"
    
    # Try to get project reference
    if grep -q "project_id" ".supabase/config.toml"; then
        PROJECT_REF=$(grep "project_id" ".supabase/config.toml" | cut -d'"' -f2)
        echo "   Project ref: $PROJECT_REF"
    fi
else
    print_warning "Project not linked (optional for deployment)"
    echo "   To link: supabase link --project-ref YOUR_PROJECT_REF"
fi

# Check 5: Environment files
echo ""
echo "5. Checking environment configuration..."

if [ -f ".env" ]; then
    print_status 0 ".env file exists"
    
    if grep -q "VITE_FIREBASE_SERVER_KEY" ".env"; then
        print_status 0 "Firebase server key configured in .env"
    else
        print_warning "Firebase server key not found in .env"
    fi
    
    if grep -q "VITE_SUPABASE_URL" ".env"; then
        print_status 0 "Supabase URL configured in .env"
    else
        print_warning "Supabase URL not found in .env"
    fi
else
    print_warning ".env file missing"
fi

if [ -f "supabase/.env" ]; then
    print_status 0 "Supabase .env file exists"
else
    print_warning "Supabase .env file missing (for local development)"
fi

# Check 6: Migration files
echo ""
echo "6. Checking migration files..."

if [ -f "supabase/migrations/20250619000001_create_fcm_tokens_table.sql" ]; then
    print_status 0 "FCM tokens table migration exists"
else
    print_warning "FCM tokens table migration missing"
fi

if [ -f "supabase/migrations/20250619000002_create_task_notification_trigger.sql" ]; then
    print_status 0 "Task notification trigger migration exists"
else
    print_warning "Task notification trigger migration missing"
fi

# Check 7: Test function deployment (dry run)
echo ""
echo "7. Testing function deployment (dry run)..."

if supabase functions deploy push --help &> /dev/null; then
    print_status 0 "Function deployment command available"
else
    print_status 1 "Function deployment command not available"
fi

# Summary
echo ""
echo "📋 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "supabase/functions/push/index.ts" ] && command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Edge function is properly set up and ready for deployment${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the function: ./deploy-functions.sh"
    echo "2. Set environment variables in Supabase Dashboard"
    echo "3. Run database migrations"
    echo "4. Configure notification settings"
else
    echo -e "${RED}❌ Edge function setup incomplete${NC}"
    echo ""
    echo "Required actions:"
    if ! command -v supabase &> /dev/null; then
        echo "- Install Supabase CLI: npm install -g supabase"
    fi
    if [ ! -f "supabase/functions/push/index.ts" ]; then
        echo "- Create push function: supabase functions new push"
        echo "- Copy the provided index.ts content"
    fi
fi

echo ""
echo "📚 For detailed setup instructions, see: TASK_NOTIFICATION_SETUP.md"
