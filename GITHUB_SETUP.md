# 🚀 How to Run Photo Mapper Through GitHub

This guide shows you exactly how to get Photo Mapper running on GitHub Pages in just a few minutes.

## 🎯 Quick Overview

**What you'll get:**
- Live web app at `https://yourusername.github.io/photo-mapper/`
- Admin panel at `https://yourusername.github.io/photo-mapper/admin.html`
- Free hosting via GitHub Pages
- Automatic updates when you push changes

## 📋 Step 1: Setup GitHub Repository

### Option A: Fork This Repository (Easiest)
1. **Go to the repository** on GitHub
2. **Click "Fork"** button (top right)
3. **Choose your account** as the destination
4. **Wait for fork to complete**

### Option B: Create New Repository
1. **Create new repository** on GitHub
2. **Clone this project** to your computer:
   ```bash
   git clone https://github.com/original-repo/photo-mapper.git
   cd photo-mapper
   ```
3. **Change remote** to your repository:
   ```bash
   git remote set-url origin https://github.com/yourusername/photo-mapper.git
   git push -u origin main
   ```

## 📋 Step 2: Enable GitHub Pages

1. **Go to your repository** on GitHub
2. **Click "Settings"** tab
3. **Scroll down to "Pages"** section
4. **Under "Source"**, select **"Deploy from a branch"**
5. **Select branch**: `main` (or `master`)
6. **Select folder**: `/web` ⚠️h **Important: Must be `/web`**
7. **Click "Save"**

![GitHub Pages Setup](https://docs.github.com/assets/cb-20691/images/help/pages/source-setting-pages.png)

## 📋 Step 3: Deploy Apps Script Backend

### 3.1 Create Apps Script Project
1. **Go to** [script.google.com](https://script.google.com)
2. **Click "New Project"**
3. **Rename** to "Photo Mapper Backend"

### 3.2 Add the Code Files
Copy these files from your repository's `apps-script/` folder:

**Main Files (Required):**
1. **`Code.gs`** - Copy entire content, replace default Code.gs
2. **`DatabaseManager.gs`** - Click ➕ → Create new script file
3. **`PhotoProcessor.gs`** - Click ➕ → Create new script file  
4. **`AutomationManager.gs`** - Click ➕ → Create new script file

**Manifest File:**
5. **`appsscript.json`** - Click ⚙️ → Show "appsscript.json" manifest file, replace content

**Optional:**
6. **`GmailToDrive.gs`** - Only if you want email photo processing

### 3.3 Enable Drive API
1. **In Apps Script**, click **Services** (⚙️ icon in left sidebar)
2. **Add a service** → **Google Drive API**
3. **Select version "v3"** → **Add**

### 3.4 Deploy as Web App
1. **Click "Deploy"** → **"New deployment"**
2. **Type**: Select **"Web app"**
3. **Execute as**: "User who deployed"
4. **Who has access**: **"Anyone, even anonymous"** ⚠️ **Important**
5. **Click "Deploy"**
6. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/ABC123.../exec`)

## 📋 Step 4: Configure Your App

### 4.1 Access Your Live App
1. **Wait 2-10 minutes** for GitHub Pages to deploy
2. **Visit**: `https://yourusername.github.io/photo-mapper/`
3. **You should see** the Photo Mapper interface

### 4.2 Configure Backend URL
1. **Click the ⚙️ Config button** in your app
2. **Paste your Apps Script URL** in "Backend URL"
3. **Click "Save Config"**

### 4.3 Setup Your Photo Folder
1. **Create a Google Drive folder** with photos that have GPS data
2. **Get the folder ID** from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
3. **Enter the folder ID** in the app config

## 📋 Step 5: Initialize Database

1. **Open Admin Panel**: `https://yourusername.github.io/photo-mapper/admin.html`
2. **Enter your config** (backend URL, folder ID)
3. **Click "Initialize Database"** - creates Google Sheets database
4. **Click "Process All Photos"** - extracts GPS metadata
5. **Wait for processing** to complete

## 📋 Step 6: Test Everything Works

### Test Frontend
- ✅ Map loads with OpenStreetMap
- ✅ Photos appear as markers (after processing)
- ✅ Clicking markers shows photo popups
- ✅ Location search works

### Test Admin Panel  
- ✅ Database stats show your photos
- ✅ Processing logs show activity
- ✅ All functions work without errors

## 🎯 Your App URLs

After successful setup:

```
🌐 Main App:      https://yourusername.github.io/photo-mapper/
🛠️ Admin Panel:   https://yourusername.github.io/photo-mapper/admin.html
📱 Mobile:        Same URLs work on mobile devices
📊 Repository:    https://github.com/yourusername/photo-mapper
```

## 🔧 Making Updates

### Update Frontend
1. **Edit files** in your repository
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Update: description"
   git push origin main
   ```
3. **GitHub Pages auto-updates** (2-10 minutes)

### Update Backend
1. **Edit Apps Script files** at script.google.com
2. **Save changes** (Ctrl+S)
3. **Deploy new version** if needed

## ⚡ Quick Deployment Script

Use the included script for fast updates:

```bash
./deploy.sh
```

This script will:
- ✅ Commit your changes
- ✅ Push to GitHub
- ✅ Show your live URLs
- ✅ Provide status updates

## 🆘 Troubleshooting

### "404 - Page Not Found"
**Problem**: GitHub Pages not working
**Solution**: 
- Check Settings → Pages → Source is set to `/web` folder
- Wait 10 minutes for deployment
- Ensure repository is public or you have Pages access

### "Backend URL not configured"
**Problem**: App can't connect to Apps Script  
**Solution**:
- Verify Apps Script is deployed as Web App
- Check "Who has access" is set to "Anyone, even anonymous"
- Copy the correct Web App URL (not the script editor URL)

### "Permission denied" errors
**Problem**: Apps Script lacks permissions
**Solution**:
- Check `appsscript.json` includes all required scopes
- Re-authorize the script when prompted
- Verify folder ID is correct and accessible

### Photos not showing
**Problem**: No photos processed or no GPS data
**Solution**:
- Check admin panel for processing status
- Verify photos have GPS metadata (check EXIF data)
- Run "Process All Photos" again if needed

### Mobile issues
**Problem**: App doesn't work well on mobile
**Solution**:
- Use HTTPS (GitHub Pages provides this automatically)
- Test location permission prompts
- Check mobile browser compatibility

## 💡 Pro Tips

### Performance
- **Use automation**: Setup automatic processing for new photos
- **Enable caching**: Responses are cached for faster loading
- **Optimize images**: Large collections process faster with smaller images

### Security
- **API Token**: Set optional API token for admin functions
- **Private repo**: Make repository private if needed (GitHub Pro)
- **Folder permissions**: Ensure Drive folder has appropriate sharing

### Customization
- **Branding**: Edit HTML/CSS to match your style
- **Features**: Add custom functionality in the frontend
- **Deployment**: Use custom domain with GitHub Pages

## 🎉 You're Live!

Congratulations! Your Photo Mapper is now running through GitHub:

- ✅ **Professional hosting** via GitHub Pages
- ✅ **Automatic deployments** on code changes
- ✅ **Free tier usage** for all services
- ✅ **Shareable URLs** for others to use
- ✅ **Mobile responsive** interface
- ✅ **Production ready** with monitoring

Share your live demo with friends and colleagues! 🌍📸

## 🔗 Useful Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Google Apps Script Guide](https://developers.google.com/apps-script)
- [Drive API Documentation](https://developers.google.com/drive/api)
- [Photo Mapper Repository](https://github.com/yourusername/photo-mapper)
