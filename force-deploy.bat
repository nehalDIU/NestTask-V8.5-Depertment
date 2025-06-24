@echo off
echo 🚀 NestTask Force Deployment Script
echo ====================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Error: Git repository not found. Please initialize git first.
    pause
    exit /b 1
)

echo 📋 Pre-deployment checks...

REM Check for uncommitted changes and commit them
echo ⚠️  Committing any changes before deployment...
git add .
git commit -m "Update landing page - force deployment %date% %time%"

REM Clean build to ensure fresh compilation
echo 🧹 Cleaning previous build...
if exist "dist" rmdir /s /q "dist"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)

REM Build the project
echo 🔨 Building project...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Create a deployment marker file
echo %date% %time% > .deployment-marker
git add .deployment-marker

REM Commit the deployment marker
git commit -m "Force deployment marker - %date% %time%"

REM Push to trigger Vercel deployment
echo 🚀 Pushing to trigger deployment...
git push origin main

if %errorlevel% eq 0 (
    echo ✅ Successfully pushed to repository!
    echo.
    echo 🎯 Next steps:
    echo 1. Check Vercel dashboard for deployment status
    echo 2. Wait 2-3 minutes for deployment to complete
    echo 3. Test your domain in incognito mode
    echo 4. Clear browser cache if needed
    echo.
    echo 🌐 Your site should be updating at:
    echo    https://your-domain.vercel.app/
) else (
    echo ❌ Failed to push to repository
    pause
    exit /b 1
)

echo ✨ Deployment initiated successfully!
echo.
echo Press any key to continue...
pause > nul
