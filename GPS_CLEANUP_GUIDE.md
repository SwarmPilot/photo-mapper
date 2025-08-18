# 🧹 GPS Cleanup Guide

## Overview

The GPS Cleanup feature in Photo Mapper's Admin Panel helps you maintain a clean Drive folder by identifying and removing images that don't contain GPS location data. This improves processing efficiency and keeps your photo collection focused on geotagged images.

## 🎯 Purpose

- **Optimize Processing**: Remove photos without GPS data to speed up photo processing
- **Save Storage**: Clean up unnecessary files to free up Google Drive space  
- **Improve Performance**: Reduce the number of files the app needs to scan
- **Maintain Quality**: Keep only photos that can be mapped on the application

## 🔧 How It Works

### Detection Criteria

The system identifies images without GPS data if they have:

1. **No image metadata**: File doesn't contain `imageMediaMetadata`
2. **No location data**: Metadata exists but no `location` field
3. **Invalid coordinates**: Location exists but latitude/longitude are not valid numbers
4. **Out of range**: Coordinates outside valid ranges (lat: -90 to 90, lng: -180 to 180)

### Safety Features

- ✅ **Dry Run Mode**: Preview files before deletion (enabled by default)
- ✅ **Confirmation Dialogs**: Multiple warnings before permanent deletion
- ✅ **Batch Limits**: Process limited number of files at once
- ✅ **Permission Validation**: Checks folder access before operation
- ✅ **Error Handling**: Graceful handling of permission or API errors
- ✅ **Detailed Reporting**: Complete summary of operations and results

## 🚀 Using GPS Cleanup

### Access the Feature

1. Navigate to the **Admin Panel** (`admin.html`)
2. Scroll to the **🧹 Maintenance** section
3. Find the **📷 GPS Cleanup** subsection

### Step 1: Configure Options

**Dry Run Mode (Recommended)**
- ✅ **Checked**: Safe preview mode - no files deleted
- ❌ **Unchecked**: Actual deletion mode - files permanently moved to trash

**Max Files to Process**
- Default: `100` files per operation
- Range: `10` to `1000` files
- Larger numbers = longer processing time

### Step 2: Preview Files (Recommended First Step)

1. **Ensure "Dry Run" is checked** ✅
2. **Click "🔍 Preview Files"**
3. **Review the results**:
   - Number of files found without GPS
   - List of files that would be deleted
   - File sizes and reasons for deletion
   - Total storage that would be cleaned

### Step 3: Execute Cleanup (If Desired)

1. **Uncheck "Dry Run"** if you want to actually delete files
2. **Click "🗑️ Delete Files (Permanent!)"**
3. **Confirm the warning dialog** (this is your last chance!)
4. **Review the deletion results**

## 📊 Understanding Results

### Summary Statistics

- **Total Processed**: Number of image files examined
- **Found/Targeted**: Files without GPS data identified
- **Would Delete/Deleted**: Files that would be or were removed
- **Size To Clean/Cleaned**: Total storage space affected

### File Information

For each file without GPS data, you'll see:
- **File Name**: Original filename
- **File Type**: MIME type (e.g., image/jpeg)
- **File Size**: Storage space used
- **Modified Date**: When the file was last changed
- **Reason**: Why the file lacks GPS data

### Common Reasons

- `"No image metadata available"` - File has no embedded metadata
- `"No location data in metadata"` - Metadata exists but no GPS coordinates
- `"Invalid or missing latitude/longitude coordinates"` - Coordinates are malformed

## ⚠️ Important Safety Information

### Before Using GPS Cleanup

1. **Backup Important Photos**: Ensure you have copies of any important images
2. **Test with Small Batches**: Start with 10-50 files to understand the results
3. **Use Dry Run First**: Always preview before executing deletions
4. **Check File List**: Review the files that will be deleted carefully

### What Happens to Deleted Files

- **Moved to Trash**: Files are moved to Google Drive trash, not permanently deleted immediately
- **Recovery Window**: You can recover files from Drive trash for a limited time (typically 30 days)
- **Permanent Deletion**: Files in trash are eventually permanently deleted by Google Drive

### Permissions Required

The Apps Script needs `drive.file` permission to delete files:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/drive.file"
  ]
}
```

## 🔍 Troubleshooting

### "Insufficient permissions to delete files"

**Solution**: 
1. Ensure the folder is shared with delete permissions
2. Re-authorize the Apps Script to grant drive.file permission
3. Check that you're the folder owner or have been granted delete access

### "Folder not found or not accessible"

**Solution**:
1. Verify the folder ID is correct in your configuration
2. Ensure the folder is shared with the Apps Script account
3. Check that the folder hasn't been moved or deleted

### "GPS cleanup preview failed"

**Solution**:
1. Check your internet connection
2. Verify the backend URL is correctly configured
3. Ensure the Apps Script deployment is active
4. Check the Activity Log for detailed error messages

### No Files Found for Cleanup

This is actually good news! It means:
- ✅ All your images have GPS data
- ✅ Your photo collection is already optimized
- ✅ No cleanup is needed

## 📝 Best Practices

### For Photographers

1. **Enable GPS on Camera**: Configure your camera/phone to record location data
2. **Sort Before Upload**: Separate geotagged from non-geotagged photos before uploading
3. **Regular Cleanup**: Run GPS cleanup periodically to maintain folder quality
4. **Backup Strategy**: Keep originals in a separate backup location

### For System Administrators

1. **Start Small**: Begin with low max file limits for testing
2. **Monitor Results**: Check the Activity Log for any errors or issues
3. **Batch Processing**: For large folders, process in smaller batches over time
4. **Schedule Wisely**: Don't run cleanup during peak photo processing times

## 🔄 Integration with Photo Processing

### Workflow Optimization

1. **Upload New Photos** → Google Drive folder
2. **Run GPS Cleanup** → Remove non-geotagged images  
3. **Process Photos** → Extract GPS data from remaining images
4. **Update Database** → Store metadata for mapping

### Performance Benefits

- **Faster Processing**: Fewer files to examine during photo processing
- **Reduced API Calls**: Lower Google Drive API usage
- **Improved Caching**: More efficient caching with smaller datasets
- **Better User Experience**: Faster photo loading and map updates

## 📋 GPS Cleanup Checklist

Before running GPS cleanup, verify:

- [ ] **Backup created** of important photos
- [ ] **Dry run completed** and results reviewed
- [ ] **File list checked** for any photos you want to keep
- [ ] **Permissions confirmed** for folder access
- [ ] **Small batch size** selected for first attempt
- [ ] **Admin panel accessible** and functioning
- [ ] **Activity log monitored** for any errors

After running GPS cleanup:

- [ ] **Results reviewed** in the admin panel
- [ ] **File count verified** against expectations
- [ ] **Drive trash checked** if you need to recover anything
- [ ] **Photo processing tested** to ensure it still works
- [ ] **Map display verified** shows remaining photos correctly

## 🔗 Related Features

- **Photo Processing**: Processes remaining GPS-enabled photos
- **Database Management**: Updates photo metadata database
- **Automation**: Can be integrated into scheduled maintenance
- **Health Checks**: Monitors overall system health including file cleanup

## 🆘 Recovery Instructions

### If You Deleted the Wrong Files

1. **Go to Google Drive** → [drive.google.com](https://drive.google.com)
2. **Click "Trash"** in the left sidebar  
3. **Find your deleted photos** (they'll be marked with deletion date)
4. **Right-click deleted files** → "Restore"
5. **Files return to original folder** immediately

### If Trash is Empty

- Unfortunately, permanently deleted files cannot be recovered
- This is why **dry run mode** and **careful review** are essential
- Always maintain separate backups of important photos

## 📈 Monitoring and Maintenance

### Regular Cleanup Schedule

- **Weekly**: For active photo uploading
- **Monthly**: For moderate photo activity  
- **Quarterly**: For occasional photo uploads

### Health Monitoring

Use the **Health Check** feature to monitor:
- Total photos in database vs. Drive folder
- Processing performance metrics
- API usage and quota status
- Overall system health

Your Photo Mapper now includes enterprise-grade cleanup capabilities! 🎉
