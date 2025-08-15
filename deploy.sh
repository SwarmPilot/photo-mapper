#!/bin/bash
# Photo Mapper - GitHub Deployment Script

echo "🚀 Deploying Photo Mapper to GitHub Pages..."

# Check if git repository is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository. Run 'git init' first."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Preparing files for deployment..."
    
    # Add all files
    git add .
    
    # Get commit message
    echo "📝 Enter commit message (or press Enter for default):"
    read commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="Deploy: Photo Mapper update $(date +'%Y-%m-%d %H:%M:%S')"
    fi
    
    # Commit changes
    git commit -m "$commit_message"
    echo "✅ Changes committed: $commit_message"
else
    echo "✅ No uncommitted changes found"
fi

# Push to GitHub
echo "🔄 Pushing to GitHub..."
if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Error: Failed to push to GitHub. Check your remote configuration."
    echo "💡 Tip: Make sure you've set up your GitHub remote:"
    echo "   git remote add origin https://github.com/yourusername/photo-mapper.git"
    exit 1
fi

# Get repository info
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    # Extract username and repo name
    REPO_PATH=$(echo $REPO_URL | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' | sed 's/\.git$//')
    USERNAME=$(echo $REPO_PATH | cut -d'/' -f1)
    REPONAME=$(echo $REPO_PATH | cut -d'/' -f2)
    
    echo ""
    echo "🎉 Deployment complete!"
    echo "📋 Deployment Summary:"
    echo "   Repository: https://github.com/$REPO_PATH"
    echo "   Frontend: https://$USERNAME.github.io/$REPONAME/"
    echo "   Admin Panel: https://$USERNAME.github.io/$REPONAME/admin.html"
    echo ""
    echo "⏳ GitHub Pages may take 2-10 minutes to update"
    echo "💡 Don't forget to configure your Apps Script backend URL in the app!"
    echo ""
    echo "📚 Documentation:"
    echo "   Setup Guide: https://github.com/$REPO_PATH/blob/main/README.md"
    echo "   Automation: https://github.com/$REPO_PATH/blob/main/docs/AUTOMATION_SETUP.md"
else
    echo "✅ Deployment complete! Check your repository settings for GitHub Pages URL."
fi
