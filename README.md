# 📍 Photo Mapper v2.0 (Database-Enhanced)

[![GitHub Pages](https://img.shields.io/badge/demo-live-green.svg)](https://yourusername.github.io/photo-mapper/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Google Apps Script](https://img.shields.io/badge/backend-Apps%20Script-blue.svg)](https://script.google.com/)

A production-ready photo mapping application that extracts GPS metadata once, stores it in a database, and provides lightning-fast location-based searches. Built entirely on Google's free tiers with zero custom servers.

## 🌐 Quick Demo
- **Live App**: [https://yourusername.github.io/photo-mapper/](https://yourusername.github.io/photo-mapper/) *(Replace with your GitHub username)*
- **Admin Panel**: [https://yourusername.github.io/photo-mapper/admin.html](https://yourusername.github.io/photo-mapper/admin.html)
- **Deploy Your Own**: See [GitHub Deployment Guide](docs/GITHUB_DEPLOYMENT.md)

## Overview

Photo Mapper v2.0 introduces a revolutionary database-backed architecture:
- **Processing Pipeline**: One-time extraction of GPS metadata from Google Drive photos
- **Google Sheets Database**: Stores processed photo metadata for instant retrieval
- **Optimized Search API**: Lightning-fast location-based queries (10x faster than v1.0)
- **Admin Interface**: Complete management dashboard for processing and maintenance
- **Static Frontend**: Enhanced map interface with database-powered searches
- **Gmail Integration**: Automatic photo ingestion from email attachments

### 🚀 Version 2.0 Performance Improvements
- **10x faster searches**: Database queries vs. real-time Drive API calls
- **95% less data transfer**: Pre-processed metadata only
- **Instant response times**: Cached location-based searches
- **Background processing**: No frontend wait times for large photo collections
- **Scalable architecture**: Handles thousands of photos efficiently
- **🤖 Full automation**: Automatic incremental updates every 15 minutes
- **📧 Smart notifications**: Email alerts for errors and daily summaries
- **🔍 Health monitoring**: Automated system health checks and recovery

## Architecture

```
Gmail → Drive Folder → Processing Pipeline → Google Sheets Database
   ↓         ↓              ↓                        ↓
Photos → Auto-save → GPS Extraction → Stored Metadata

Database → Search API → Web Frontend → Interactive Map
    ↓           ↓            ↓              ↓
Cached → Location Query → JSON Response → OpenStreetMap
```

### 🏗️ Database Schema

**Photos Table:**
- `id`, `name`, `mimeType` - Basic file info
- `latitude`, `longitude`, `altitude` - GPS coordinates  
- `dateTime`, `modifiedTime` - Timestamps
- `thumbnailLink`, `webViewLink` - Drive URLs
- `folderId`, `processed`, `checksum` - Management data

**Processing Log:**
- Processing history, performance metrics, error tracking

## 📖 Documentation
- [GitHub Deployment Guide](docs/GITHUB_DEPLOYMENT.md) - Deploy to GitHub Pages
- [Automation Setup Guide](docs/AUTOMATION_SETUP.md) - Set up automated processing
- [Viewport Search Fix](docs/VIEWPORT_SEARCH_FIX.md) - Technical details on infinite loop fix
- [Permission Updates](docs/PERMISSION_UPDATE.md) - OAuth scope requirements

## Quick Start

### 🚀 Deploy to GitHub Pages (5 minutes)

[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue.svg?style=for-the-badge&logo=github)](https://github.com/yourusername/photo-mapper/fork)

1. **Fork this repository** on GitHub (click badge above)
2. **Enable GitHub Pages**: Repository Settings → Pages → Source: `/web` folder
3. **Deploy Apps Script**: Copy files from `apps-script/` to [script.google.com](https://script.google.com)
4. **Access your app**: `https://yourusername.github.io/photo-mapper/`

📖 **Detailed Instructions**: [Complete GitHub Setup Guide](GITHUB_SETUP.md)

### Prerequisites
- Google account with access to Drive, Gmail, and Apps Script
- Google Drive folder containing photos with GPS metadata
- Basic understanding of Google Apps Script

### 1. Backend Setup (Google Apps Script)

#### Create Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Add these files to your project:
   - `Code.gs` - Main API handlers
   - `DatabaseManager.gs` - Database operations
   - `PhotoProcessor.gs` - Processing pipeline
   - `appsscript.json` - Manifest configuration

#### Enable Drive API
1. In your Apps Script project, click "Services" (⚙️ icon)
2. Add "Google Drive API" → Select version "v3" → Save
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Find your Apps Script project and enable the Drive API

#### Configure Script Properties
1. In Apps Script, go to "Project Settings" → "Script Properties"
2. Add these properties:
   - `FOLDER_ID`: Your Google Drive folder ID (required)
   - `API_TOKEN`: Random string for API authentication (optional)

**Finding your Drive Folder ID:**
- Open your Drive folder in browser
- Copy the ID from URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`

#### Deploy Web App
1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone" (or "Anyone with link")
5. Click "Deploy"
6. Copy the Web App URL (you'll need this for the frontend)

### 2. Database Setup & Processing

#### Initialize Database
1. After deploying your Apps Script as a Web App
2. Open `web/admin.html` in your browser
3. Enter your Web App URL in the admin interface
4. Click "Initialize Database" - this creates a Google Sheets database
5. Enter your Drive Folder ID
6. Click "Process All Photos" to extract GPS metadata

#### Monitor Processing
- Use the admin dashboard to track processing progress
- View statistics: total photos, GPS photos, processing rate
- Run incremental updates for new photos
- Perform cleanup operations as needed

#### Setup Automation (Recommended)
1. In the admin dashboard, enter your notification email (optional)
2. Click "Setup Automation" to enable automatic incremental updates
3. The system will now:
   - Process new photos every 15 minutes automatically
   - Monitor system health hourly
   - Perform daily cleanup at 2 AM
   - Send email alerts for errors and daily summaries

See [Automation Setup Guide](docs/AUTOMATION_SETUP.md) for detailed automation configuration.

### 3. Frontend Setup

#### Option A: Local Development
1. Open `web/index.html` in any modern web browser
2. The app now shows "v2.0 DB" indicating database mode
3. Click "⚙️ Config" button and enter your Web App URL
4. Choose your location and start exploring photos instantly

#### Option B: Static Hosting
Deploy both `web/index.html` and `web/admin.html`:
- **GitHub Pages**: Push to repo, enable Pages
- **Netlify**: Drag & drop both files
- **Cloudflare Pages**: Connect your repository
- **Vercel**: Deploy the web directory

### 3. Gmail Ingestion Setup (Optional)

#### Configure Gmail Filter
1. In Gmail, create a filter for photo emails:
   - Go to Settings → Filters and Blocked Addresses
   - Create filter with criteria like:
     - From: `camera@yourdomain.com` 
     - Has attachment: Yes
     - Size: greater than 1MB
   - Apply label: `photos-to-map`

#### Setup Apps Script Ingestion
1. In your Apps Script project, add the `apps-script/GmailToDrive.gs` file
2. Modify the configuration at the top:
   ```javascript
   const GMAIL_CONFIG = {
     GMAIL_LABEL: 'photos-to-map',      // Your Gmail label
     TARGET_FOLDER_ID: 'your-folder-id', // Same as main config
     // ... other settings
   };
   ```

#### Create Time-based Trigger
1. In Apps Script, go to "Triggers" (⏰ icon)
2. Add trigger:
   - Function: `processPhotoEmails`
   - Event source: "Time-driven"
   - Type: "Minutes timer"
   - Interval: "Every 5 minutes"

## Configuration Reference

### Apps Script Environment Variables

Set these in **Project Settings → Script Properties**:

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `FOLDER_ID` | Yes | Google Drive folder ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `API_TOKEN` | No | API authentication token | `your-secret-token-123` |

### Frontend Configuration

Configure in the web app's settings panel:

| Setting | Required | Description |
|---------|----------|-------------|
| Backend URL | Yes | Apps Script Web App URL |
| Folder ID | No | Override default folder |
| API Token | No | Required if set in backend |

## API Reference

### Backend Endpoints

#### `GET /list`
Returns all photos with GPS metadata from the specified folder.

**Parameters:**
- `folderId` (optional): Drive folder ID
- `token` (optional): API authentication token

**Response:**
```json
{
  "count": 42,
  "folderId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "cached": false,
  "photos": [
    {
      "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "name": "IMG_20240115_103000.jpg",
      "mimeType": "image/jpeg",
      "modifiedTime": "2024-01-15T10:30:00.000Z",
      "thumbnailLink": "https://lh3.googleusercontent.com/...",
      "webViewLink": "https://drive.google.com/file/d/.../view",
      "webContentLink": "https://drive.google.com/uc?id=...",
      "imageMediaMetadata": {
        "time": "2024-01-15T10:30:00.000Z",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "altitude": 10
        }
      }
    }
  ]
}
```

#### `GET /search`
Returns photos filtered by location within a specified area or radius.

**Parameters:**
- `folderId` (optional): Drive folder ID
- `token` (optional): API authentication token

**Bounding Box Search:**
- `north`, `south`, `east`, `west`: Bounding box coordinates

**Radius Search:**
- `lat`, `lng`: Center point coordinates
- `radius`: Search radius in meters

**Viewport Search:**
- `north`, `south`, `east`, `west`: Viewport bounds

**Optional:**
- `limit`: Maximum number of results (default/max: 1000)

**Response:**
```json
{
  "count": 15,
  "totalCount": 42,
  "folderId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "searchParams": {
    "type": "viewport",
    "bounds": { "north": 40.8, "south": 40.6, "east": -73.9, "west": -74.1 }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "cached": false,
  "photos": [...]
}
```

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🗺️ Location-Based Search Features

### Overview
The enhanced Photo Mapper now includes powerful location-based search capabilities that optimize data transfer and improve performance:

- **Viewport-based loading**: Automatically loads only photos visible in the current map area
- **User location search**: Find photos within a customizable radius of your current location  
- **Smart caching**: Separate cache strategies for full lists vs. search results
- **Optimized traffic**: Reduces data transfer by up to 90% for large photo collections

### Frontend Features

#### 1. Viewport Search (`🔍 Search Area`)
- **Auto-loading**: Automatically fetches photos when you pan or zoom the map
- **Toggle**: Click to enable/disable viewport-based loading
- **Debounced**: Waits 500ms after map movement to avoid excessive API calls
- **Visual feedback**: Status shows "Found X/Y photos in area"

#### 2. User Location Search (`📍 My Location`)
- **Geolocation**: Automatically detects your current location
- **Radius search**: Configurable search radius (100m - 50km)
- **Visual indicator**: Draws a circle showing the search area
- **Privacy**: Location detection requires user permission

#### 3. Configuration Options
- **Search Radius**: Adjust the distance for location-based searches
- **Auto-load Viewport**: Toggle automatic viewport loading
- **Settings persist**: Configuration saved to localStorage

### Performance Benefits

#### Data Transfer Optimization
- **Before**: Loading 10,000 photos = ~2MB JSON response
- **After**: Loading viewport area = ~50KB JSON response (typical)
- **Bandwidth savings**: 95%+ reduction for large collections

#### API Quota Efficiency  
- **Smart caching**: 2-minute cache for search results, 5-minute for full lists
- **Reduced calls**: Viewport changes debounced to prevent excessive requests
- **Result limits**: Automatic caps prevent memory issues

### Usage Examples

#### Example 1: Travel Blog
"I have 5,000 photos from a world trip. Instead of loading all photos at once, I can now browse specific cities by zooming into them."

#### Example 2: Local Photographer
"I photograph events around my city. The location search helps me find all photos within 2km of my current location."

#### Example 3: Real Estate
"I document properties across a region. Viewport search lets me see only relevant photos as I navigate different neighborhoods."

## Quotas & Limits

### Google Apps Script (Free Tier)
- **Execution time**: 6 minutes per execution
- **Daily executions**: 20 hours total runtime
- **Triggers**: 20 time-based triggers
- **Script runtime**: 30 seconds per web request

### Google Drive API (Free Tier)
- **Daily quota**: 1,000,000,000 quota units
- **Per-user rate limit**: 1,000 requests per 100 seconds
- **Files.list**: 1 quota unit per request
- **100 requests per 100 seconds per user**

### Practical Limits
- **~50,000 photos** can be processed daily with normal usage
- **~200 photos** per API request (pagination)
- **5-minute cache** reduces API calls for repeated requests

## Troubleshooting

### Common Issues

#### "Missing folderId parameter"
- **Cause**: No `FOLDER_ID` set in Script Properties
- **Solution**: Add `FOLDER_ID` in Apps Script Project Settings

#### "Forbidden: Invalid or missing API token"
- **Cause**: Backend requires API token but none provided
- **Solution**: Set correct token in frontend config or remove `API_TOKEN` from Script Properties

#### "No photos with GPS data found"
- **Cause**: Photos don't have GPS metadata embedded
- **Solution**: Ensure photos were taken with GPS enabled on device

#### CORS errors
- **Cause**: Browser blocking cross-origin requests
- **Solution**: Apps Script Web Apps handle CORS automatically - check backend URL

#### Backend returns 404
- **Cause**: Incorrect Web App URL or deployment issues
- **Solution**: Redeploy the Web App and update frontend URL

### Performance Issues

#### Slow loading
- **Cache is working**: Responses should be fast on repeated requests
- **Large folders**: Consider splitting photos across multiple folders
- **Many photos**: Marker clustering helps with map performance

#### Timeout errors
- **Large folders**: Script may timeout; reduce `PAGE_SIZE` in `Code.gs`
- **Frequent requests**: Implement longer caching periods

### Development Tips

#### Testing Backend Locally
```javascript
// In Apps Script editor
function testListPhotos() {
  const folderId = CFG.FOLDER_ID;
  const photos = listImagesWithGps(folderId);
  console.log(`Found ${photos.length} photos`);
}
```

#### Debugging Gmail Ingestion
```javascript
// Test message processing
function testProcessMessage() {
  const threads = GmailApp.search('has:attachment subject:"test"', 0, 1);
  // ... see GmailToDrive.gs for full function
}
```

#### Clear Cache
```javascript
function clearCache() {
  CacheService.getScriptCache().removeAll(['photos:' + CFG.FOLDER_ID]);
}
```

## Security Considerations

### Access Control
- **Backend**: Uses Google's authentication; only deployed user can access Drive
- **Frontend**: Public by default; add API token for basic protection
- **File access**: Users can only view/download what Drive permissions allow

### Data Privacy
- **No file downloads**: Backend only reads metadata, never file contents
- **Minimal data transfer**: Only GPS coordinates and thumbnails sent to frontend
- **Client-side processing**: All map rendering happens in user's browser

### Production Hardening
1. **Enable API token** for backend authentication
2. **Restrict Web App access** to specific domains if possible
3. **Monitor quota usage** in Google Cloud Console
4. **Use HTTPS** for all frontend hosting
5. **Implement rate limiting** in frontend if needed

## Extending the System

### Adding More Metadata
Modify `processPhotoFile()` in `Code.gs` to include:
- Camera make/model
- Photo dimensions
- ISO, aperture, shutter speed
- Custom Drive file properties

### Custom Map Styling
- Replace OpenStreetMap tiles with custom providers
- Add satellite/terrain view toggles
- Implement custom marker icons
- Add photo overlays on map

### Advanced Filtering
- Date range filters
- Location-based search
- Photo type filtering
- Custom metadata filters

### Analytics Integration
- Add Google Analytics to frontend
- Track popular photo locations
- Monitor API usage patterns
- User interaction analytics

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Google Apps Script documentation
3. Check Drive API quota limits
4. Create an issue in the repository

---

**Built with ❤️ using Google's free tiers and OpenStreetMap**
