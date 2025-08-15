# 📋 Photo Mapper GitHub Deployment Checklist

## ✅ Pre-Deployment Checklist

### Repository Structure
- [x] **Frontend files** in `/web/` directory
  - [x] `index.html` - Main application
  - [x] `admin.html` - Admin interface
  - [x] `.nojekyll` - Disable Jekyll processing
  
- [x] **Apps Script files** in `/apps-script/` directory
  - [x] `Code.gs` - Main API handlers
  - [x] `DatabaseManager.gs` - Database operations
  - [x] `PhotoProcessor.gs` - Processing pipeline
  - [x] `AutomationManager.gs` - Automation system
  - [x] `GmailToDrive.gs` - Email integration (optional)
  - [x] `appsscript.json` - Manifest with permissions

- [x] **Documentation** in `/docs/` directory
  - [x] `GITHUB_DEPLOYMENT.md` - Deployment guide
  - [x] `AUTOMATION_SETUP.md` - Automation setup
  - [x] `VIEWPORT_SEARCH_FIX.md` - Technical fixes
  - [x] `PERMISSION_UPDATE.md` - OAuth requirements

- [x] **Root files**
  - [x] `README.md` - Main documentation
  - [x] `LICENSE` - MIT license
  - [x] `.gitignore` - Git ignore rules
  - [x] `deploy.sh` - Deployment script
  - [x] `.github/workflows/deploy.yml` - GitHub Actions

## 🚀 Deployment Steps

### 1. GitHub Repository Setup
- [ ] Create GitHub repository
- [ ] Push all files to repository
- [ ] Verify all files are present

### 2. Enable GitHub Pages
- [ ] Go to Repository Settings → Pages
- [ ] Set Source to "Deploy from a branch"
- [ ] Select branch: `main` (or `master`)
- [ ] Select folder: `/web`
- [ ] Save settings

### 3. Apps Script Backend
- [ ] Create new Apps Script project at [script.google.com](https://script.google.com)
- [ ] Copy all `.gs` files from `apps-script/` folder
- [ ] Update `appsscript.json` manifest
- [ ] Enable Drive API in Services
- [ ] Deploy as Web App:
  - [ ] Execute as: "User who deployed"
  - [ ] Who has access: "Anyone, even anonymous"
- [ ] Copy Web App URL

### 4. Configuration
- [ ] Test frontend loads at `https://yourusername.github.io/photo-mapper/`
- [ ] Configure Apps Script URL in the app
- [ ] Test admin panel at `https://yourusername.github.io/photo-mapper/admin.html`
- [ ] Verify database initialization works
- [ ] Test photo processing pipeline

### 5. Automation Setup (Optional)
- [ ] Set notification email in admin panel
- [ ] Click "Setup Automation" in admin interface
- [ ] Verify 4 triggers are created
- [ ] Test automation with "Test Automation" button

## 🧪 Post-Deployment Testing

### Frontend Testing
- [ ] **Homepage loads** without errors
- [ ] **Map initializes** correctly
- [ ] **Configuration panel** opens and saves settings
- [ ] **Location detection** works (or shows proper fallback)
- [ ] **Admin panel** loads and connects to backend

### Backend Testing
- [ ] **Health check** returns success
- [ ] **Database initialization** creates spreadsheet
- [ ] **Photo processing** extracts GPS metadata
- [ ] **Search functionality** returns results
- [ ] **Cache system** works properly

### Integration Testing
- [ ] **End-to-end workflow**: Upload photo → Process → View on map
- [ ] **Viewport search** works without infinite loops
- [ ] **Location-based search** returns appropriate results
- [ ] **Mobile responsiveness** on various devices
- [ ] **Error handling** shows appropriate messages

### Automation Testing (if enabled)
- [ ] **Incremental processing** runs automatically
- [ ] **Email notifications** are sent for errors
- [ ] **Health monitoring** detects and reports issues
- [ ] **Daily cleanup** maintains database integrity

## 🔧 Troubleshooting

### Common Issues

#### "404 - Page Not Found"
- **Check**: GitHub Pages is enabled and pointing to `/web` folder
- **Check**: Repository is public or you have Pages access
- **Wait**: GitHub Pages can take 2-10 minutes to deploy

#### "Backend URL not configured"
- **Action**: Enter your Apps Script Web App URL in the frontend
- **Check**: Apps Script is deployed as Web App with public access
- **Verify**: Apps Script URL is correct and accessible

#### "Permission denied" errors
- **Check**: All required OAuth scopes are in `appsscript.json`
- **Action**: Re-authorize the Apps Script with new permissions
- **Verify**: Drive folder ID is correct and accessible

#### Automation not working
- **Check**: All required permissions are granted
- **Check**: Notification email is valid (if configured)
- **Action**: Run "Test Automation" from admin panel
- **Verify**: 4 triggers are created in Apps Script

### Getting Help
- **Documentation**: Check the comprehensive guides in `/docs/`
- **Issues**: Create an issue in the GitHub repository
- **Debugging**: Use browser developer tools console
- **Apps Script**: Check execution transcript in Apps Script editor

## 🎉 Success Indicators

When everything is working correctly, you should see:

### Frontend
- ✅ Map loads with OpenStreetMap tiles
- ✅ Configuration saves successfully
- ✅ Location detection works or provides manual options
- ✅ Status messages are clear and helpful

### Backend
- ✅ API endpoints respond with JSON
- ✅ Database operations complete successfully
- ✅ Processing logs show activity
- ✅ Cache improves response times

### Integration
- ✅ Photos appear as markers on the map
- ✅ Popups show photo details and thumbnails
- ✅ Search functions return appropriate results
- ✅ Admin operations complete without errors

### Automation (if enabled)
- ✅ Triggers are active and running
- ✅ Email notifications are received
- ✅ Processing happens automatically
- ✅ System health is monitored

## 📊 Performance Metrics

### Expected Performance
- **Initial load**: < 3 seconds
- **Search response**: < 1 second (cached), < 5 seconds (uncached)
- **Photo processing**: 50+ photos/minute
- **Map rendering**: Instant with clustering

### Quota Usage (Free Tier)
- **GitHub Pages**: Unlimited for public repos
- **Apps Script**: ~30-60 minutes daily runtime
- **Drive API**: Efficient metadata-only queries
- **Gmail API**: < 10 emails/day for notifications

Your Photo Mapper is now deployed and ready to share with the world! 🌍📸
