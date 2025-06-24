#!/bin/bash

# Force Deployment Script for NestTask Landing Page
# This script helps force a fresh deployment to Vercel

echo "🚀 NestTask Force Deployment Script"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not found. Please initialize git first."
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "   Committing changes before deployment..."
    git add .
    git commit -m "Update landing page - force deployment $(date)"
else
    echo "✅ No uncommitted changes found."
fi

# Clean build to ensure fresh compilation
echo "🧹 Cleaning previous build..."
rm -rf dist
rm -rf node_modules/.vite

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo "✅ Build successful!"

# Check if landing page is in the build
if grep -r "LandingPage" dist/assets/js/ > /dev/null; then
    echo "✅ Landing page found in build"
else
    echo "⚠️  Warning: Landing page not found in build"
fi

# Create a deployment marker file
echo "$(date)" > .deployment-marker
git add .deployment-marker

# Commit the deployment marker
git commit -m "Force deployment marker - $(date)"

# Push to trigger Vercel deployment
echo "🚀 Pushing to trigger deployment..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to repository!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Check Vercel dashboard for deployment status"
    echo "2. Wait 2-3 minutes for deployment to complete"
    echo "3. Test your domain in incognito mode"
    echo "4. Clear browser cache if needed"
    echo ""
    echo "🌐 Your site should be updating at:"
    echo "   https://your-domain.vercel.app/"
else
    echo "❌ Failed to push to repository"
    exit 1
fi

echo "✨ Deployment initiated successfully!"
