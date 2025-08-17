# 🚀 GitHub Deployment Guide for Photo Mapper

This guide explains how to deploy Photo Mapper on GitHub using GitHub Pages for the frontend while keeping the Google Apps Script backend separate.

## 📋 Deployment Overview

### Architecture
```
GitHub Repository (Public/Private)
├── Frontend: GitHub Pages (web/index.html)
├── Documentation: README.md, guides
└── Apps Script: Code files (for reference)

Google Apps Script (Separate)
├── Backend API: Your deployed web app
└── Database: Google Sheets integration
```

## 🎯 Step-by-Step Deployment

### 1. **Prepare Your Repository**

#### **Create GitHub Repository**
```bash
# Navigate to your project directory
cd /Users/brodex/photo4

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Photo Mapper v2.0 with automation"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/photo-mapper.git

# Push to GitHub
git push -u origin main
```

#### **Repository Structure**
```
photo-mapper/
├── apps-script/              # Apps Script files (reference only)
│   ├── Code.gs
│   ├── DatabaseManager.gs
│   ├── PhotoProcessor.gs
│   ├── AutomationManager.gs
│   └── appsscript.json
├── web/                      # Frontend files (deployed to Pages)
│   ├── index.html
│   └── admin.html
├── docs/                     # Documentation
│   ├── README.md
│   ├── AUTOMATION_SETUP.md
│   ├── VIEWPORT_SEARCH_FIX.md
│   └── GITHUB_DEPLOYMENT.md
└── README.md                 # Main documentation
```

### 2. **Setup GitHub Pages**

#### **Enable GitHub Pages**
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select **Branch**: `main` (or `master`)
5. Select **Folder**: `/web` (this hosts your frontend files)
6. Click **Save**

#### **Custom Domain (Optional)**
```bash
# Add CNAME file for custom domain
echo "your-custom-domain.com" > web/CNAME
git add web/CNAME
git commit -m "Add custom domain"
git push
```

### 3. **Configure Frontend for GitHub Pages**

#### **Update Frontend URLs**
Since GitHub Pages will serve from `/web/`, ensure relative paths work:

```html
<!-- In web/index.html - paths are already relative, so no changes needed -->
<link rel="stylesheet" href="..." />  <!-- ✅ Already correct -->
<script src="..."></script>          <!-- ✅ Already correct -->
```

#### **Add GitHub Pages Configuration**
Create `web/_config.yml` for Jekyll configuration:

```yaml
# Disable Jekyll processing for plain HTML
plugins: []
markdown: kramdown
highlighter: rouge
```

### 4. **Deploy Apps Script Backend**

#### **Apps Script Deployment**
```javascript
// In Google Apps Script Editor:
// 1. Create new project
// 2. Copy all .gs files from apps-script/ folder
// 3. Update appsscript.json with manifest
// 4. Deploy as Web App:
//    - Execute as: User who deployed  
//    - Who has access: Anyone, even anonymous
//    - Copy the Web App URL
```

#### **Update Frontend Configuration**
```javascript
// In web/index.html, users will configure:
const APP = {
    config: {
        backendUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
        // ... other config
    }
};
```

### 5. **Repository Configuration Files**

#### **Create `.gitignore`**
```gitignore
# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*

# Environment variables
.env
.env.local

# Build artifacts
dist/
build/

# Temporary files
*.tmp
```

#### **Create `web/.nojekyll`**
```bash
# Disable Jekyll processing completely
touch web/.nojekyll
```

### 6. **Documentation Setup**

#### **Update README.md**
```markdown
# Photo Mapper v2.0

[![GitHub Pages](https://img.shields.io/badge/demo-live-green.svg)](https://yourusername.github.io/photo-mapper/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌐 Live Demo
- **Frontend**: https://yourusername.github.io/photo-mapper/
- **Admin Panel**: https://yourusername.github.io/photo-mapper/admin.html

## 📖 Documentation
- [Automation Setup Guide](docs/AUTOMATION_SETUP.md)
- [GitHub Deployment Guide](docs/GITHUB_DEPLOYMENT.md)
- [Viewport Search Fix](docs/VIEWPORT_SEARCH_FIX.md)
```

#### **Create `LICENSE` file**
```
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

### 7. **Deployment Scripts**

#### **Create `deploy.sh`**
```bash
#!/bin/bash
# Quick deployment script

echo "🚀 Deploying Photo Mapper to GitHub Pages..."

# Build/prepare files if needed
echo "📦 Preparing files..."

# Commit changes
git add .
echo "📝 Enter commit message:"
read commit_message
git commit -m "$commit_message"

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push origin main

echo "✅ Deployment complete!"
echo "🌐 Frontend will be available at: https://yourusername.github.io/photo-mapper/"
echo "⏳ GitHub Pages may take a few minutes to update"
```

Make it executable:
```bash
chmod +x deploy.sh
```

### 8. **Environment-Specific Configuration**

#### **Development vs Production**
```javascript
// In web/index.html - add environment detection
const APP = {
    config: {
        // Auto-detect environment
        backendUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:8080/api'  // Local development
            : localStorage.getItem('photoMapperBackendUrl') || '', // Production
        
        // Default configuration for GitHub Pages
        environment: window.location.hostname.includes('github.io') ? 'github-pages' : 'local'
    }
};
```

#### **Configuration Management**
```javascript
// Add helper for GitHub Pages deployment
function detectEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } else if (hostname.includes('github.io')) {
        return 'github-pages';
    } else {
        return 'production';
    }
}

// Show setup instructions for GitHub Pages users
if (detectEnvironment() === 'github-pages' && !APP.config.backendUrl) {
    setStatus('⚙️ First time setup: Configure your Apps Script backend URL', 'info');
}
```

### 9. **GitHub Repository Features**

#### **Add Repository Topics**
In GitHub repository settings, add topics:
```
photo-mapping, google-drive, leaflet, apps-script, javascript, github-pages
```

#### **Create Release**
```bash
# Tag a release
git tag -a v2.0.0 -m "Photo Mapper v2.0 - Database-enhanced with automation"
git push origin v2.0.0
```

#### **GitHub Repository Template**
```markdown
## Repository Description
📸 Interactive photo mapping application using Google Drive GPS metadata and OpenStreetMap. Features automated processing, location-based search, and real-time updates.

## Features
✅ Real-time photo mapping with GPS coordinates
✅ Automated incremental updates every 15 minutes  
✅ Location-based search and viewport filtering
✅ Google Drive integration with zero server costs
✅ Mobile-responsive interface with dark mode
✅ Email notifications and health monitoring
```

### 10. **Continuous Deployment**

#### **GitHub Actions (Optional)**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Pages
      uses: actions/configure-pages@v2
      
    - name: Build
      run: |
        # Any build steps if needed
        echo "Building Photo Mapper..."
        
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v1
      with:
        path: ./web
        
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v1
```

### 11. **Testing Deployment**

#### **Pre-deployment Checklist**
- [ ] All file paths are relative
- [ ] Apps Script backend is deployed and accessible
- [ ] Frontend loads without errors
- [ ] Admin panel is functional
- [ ] Documentation is up to date
- [ ] Repository structure is clean

#### **Post-deployment Testing**
1. **Frontend Access**: Visit `https://yourusername.github.io/photo-mapper/`
2. **Admin Panel**: Visit `https://yourusername.github.io/photo-mapper/admin.html`
3. **Configuration**: Test backend URL configuration
4. **Functionality**: Test photo loading and mapping
5. **Mobile**: Test responsive design on mobile devices

### 12. **Sharing Your Deployment**

#### **Demo URLs**
```
🌐 Live Demo: https://yourusername.github.io/photo-mapper/
🛠️ Admin Panel: https://yourusername.github.io/photo-mapper/admin.html
📚 Documentation: https://github.com/yourusername/photo-mapper
```

#### **Sharing Instructions**
```markdown
## Quick Start for Users
1. Visit: https://yourusername.github.io/photo-mapper/
2. Deploy your own Apps Script backend (5 minutes)
3. Configure backend URL in the app
4. Start mapping your photos!

Full setup guide: [README.md](README.md)
```

## 🔧 Maintenance

### **Updating Deployment**
```bash
# Make changes to your code
git add .
git commit -m "Update: description of changes"
git push origin main

# GitHub Pages will automatically update (2-10 minutes)
```

### **Monitoring**
- **GitHub Pages Status**: Repository Settings → Pages
- **Analytics**: Enable in repository Settings → Analytics
- **Issues**: Monitor repository Issues tab for user feedback

### **Backup Strategy**
- **Code**: Automatically backed up in GitHub
- **Apps Script**: Export/backup your Google Apps Script periodically
- **Documentation**: Keep docs updated with each release

## 🎉 Your Photo Mapper is Now Live!

After following this guide, you'll have:
- ✅ **Public demo** at `https://yourusername.github.io/photo-mapper/`
- ✅ **Professional documentation** with setup guides
- ✅ **Easy sharing** with direct links
- ✅ **Automatic updates** via GitHub Pages
- ✅ **Community engagement** through GitHub repository

Your Photo Mapper is now deployed and ready to share with the world! 🌍📸
