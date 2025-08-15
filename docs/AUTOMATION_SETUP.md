# 🤖 Photo Mapper Automation Setup Guide

This guide explains how to set up the automated incremental update system for Photo Mapper v2.0 using Google's free tier cloud services.

## Overview

The automation system provides:
- **Incremental Processing**: Automatically processes new photos every 15 minutes
- **Health Monitoring**: Checks system health every hour
- **Daily Cleanup**: Maintains database integrity with daily cleanup at 2 AM
- **Email Notifications**: Alerts for errors and daily summaries
- **Error Recovery**: Automatic retry mechanisms for failed operations
- **Performance Monitoring**: Tracks processing performance and error rates

## 🚀 Quick Setup

### 1. Deploy Enhanced Apps Script
Ensure your Apps Script project includes these files:
- `Code.gs` - Main API handlers
- `DatabaseManager.gs` - Database operations  
- `PhotoProcessor.gs` - Processing pipeline
- `AutomationManager.gs` - **NEW** - Automation system
- `appsscript.json` - Manifest configuration

### 2. Setup Automation via Admin Interface
1. Open `web/admin.html` in your browser
2. Configure your backend URL and folder ID
3. (Optional) Enter notification email address
4. Click **"Setup Automation"** button
5. Verify 4 triggers are created successfully

### 3. Verify Automation
- Check the activity log for "Automation system initialized"
- Triggers should show: Incremental (15min), Health (1hr), Cleanup (daily), Monitoring (6hr)
- Test the system with **"Test Automation"** button

## 📋 Automation Components

### Time-Based Triggers

| Trigger | Frequency | Function | Purpose |
|---------|-----------|----------|---------|
| **Incremental Processing** | Every 15 minutes | `automatedIncrementalProcessing()` | Process new/modified photos |
| **Health Checks** | Every hour | `automatedHealthCheck()` | Monitor system health |
| **Daily Cleanup** | 2:00 AM daily | `automatedDailyCleanup()` | Database maintenance |
| **Monitoring Reports** | Every 6 hours | `automatedMonitoringReport()` | Performance monitoring |

### Processing Limits (Free Tier Optimization)

```javascript
MAX_FILES_PER_RUN: 100        // Prevent timeout with large batches
MAX_EXECUTION_TIME: 300000    // 5 minutes max (Apps Script limit is 6)
MAX_RETRIES: 3                // Automatic retry attempts
RETRY_DELAY: 300000           // 5 minutes between retries
```

### Email Notifications

Configure notifications by setting the `NOTIFICATION_EMAIL` script property:

**Notification Types:**
- ✅ **Error Alerts**: Immediate notification for processing failures
- 📊 **Daily Summaries**: Database statistics and health status
- ⚠️ **Health Warnings**: System health issues detection
- 🔄 **Significant Activity**: When >10 new photos are processed

**Sample Email:**
```
Subject: [Photo Mapper] New Photos Processed

Processed 25 new photos, 23 with GPS data.

Timestamp: 2024-01-15T14:30:00.000Z
Level: info
System: Photo Mapper v2.0
```

## 🎛️ Admin Interface Controls

### Automation Management
- **Setup Automation**: Initialize all triggers and monitoring
- **Test Automation**: Run a test cycle of incremental processing
- **Clear Triggers**: Remove all automation (manual mode)

### Monitoring Dashboard
- **Active Triggers**: Shows number of active automation triggers
- **Last Update**: Timestamp of most recent automated activity
- **Processing Status**: Real-time status of automation system

### Health Checks
- **Database Connection**: Verifies Google Sheets access
- **Drive Folder Access**: Confirms Drive API permissions
- **Recent Activity**: Checks for stalled processing
- **Error Rate Monitoring**: Tracks processing error percentage

## 🔧 Configuration Options

### Script Properties
Set these in Google Apps Script → Project Settings → Script Properties:

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `FOLDER_ID` | Yes | Google Drive folder ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `DATABASE_SPREADSHEET_ID` | Auto | Created automatically | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `NOTIFICATION_EMAIL` | Optional | Email for alerts | `admin@example.com` |
| `API_TOKEN` | Optional | API authentication | `your-secret-token-123` |

### Automation Configuration
Modify `AUTOMATION_CONFIG` in `AutomationManager.gs`:

```javascript
const AUTOMATION_CONFIG = {
  INCREMENTAL_INTERVAL: 15,      // Minutes between photo checks
  CLEANUP_INTERVAL: 1440,        // Daily cleanup (24 hours)
  HEALTH_CHECK_INTERVAL: 60,     // Health check frequency
  MONITORING_INTERVAL: 360,      // Monitoring report frequency
  
  MAX_FILES_PER_RUN: 100,        // Batch size limit
  SEND_SUCCESS_NOTIFICATIONS: false,  // Only errors by default
  SEND_DAILY_SUMMARY: true,      // Daily summary emails
  
  PERFORMANCE_THRESHOLD: 30000,  // 30 second performance alert
  ERROR_RATE_THRESHOLD: 0.1      // 10% error rate alert
};
```

## 📊 Monitoring & Logs

### Automated Logging
The system automatically logs all activities to:
- **Processing Log Sheet**: Standard processing activities
- **Automation Log Sheet**: Automation events and errors
- **Admin Interface Log**: Real-time activity display

### Log Types
- 🔄 **Processing Events**: Photo processing activities
- 🤖 **Automation Events**: Trigger executions and results
- ⚕️ **Health Checks**: System health monitoring
- ❌ **Error Recovery**: Retry attempts and failures

### Performance Metrics
- **Processing Speed**: Photos processed per minute
- **Success Rate**: Percentage of successful operations
- **Error Rate**: Failed operations percentage
- **Execution Time**: Average processing duration

## 🚨 Troubleshooting

### Common Issues

#### "No recent processing activity"
- **Cause**: Automation triggers not running
- **Solution**: Check trigger setup, verify Apps Script permissions

#### "High error rate: X%"
- **Cause**: Drive API quota exceeded or folder permissions
- **Solution**: Check Google Cloud Console quotas, verify folder access

#### "Processing already running, skipping this cycle"
- **Cause**: Previous processing taking longer than 15 minutes
- **Solution**: Normal behavior, system prevents overlapping executions

#### Email notifications not working
- **Cause**: Gmail API permissions or invalid email address
- **Solution**: Verify email address, check Gmail API scopes in manifest

### Performance Optimization

#### For Large Photo Collections (>1000 photos)
```javascript
// Reduce frequency to avoid quota limits
INCREMENTAL_INTERVAL: 30        // Every 30 minutes
MAX_FILES_PER_RUN: 50          // Smaller batches
```

#### For High-Activity Folders
```javascript
// Increase frequency for faster updates
INCREMENTAL_INTERVAL: 5         // Every 5 minutes
MAX_FILES_PER_RUN: 150         // Larger batches
```

### Manual Operations

#### Force Full Reprocessing
```javascript
// In Apps Script console
processPhotosInFolder(CFG.FOLDER_ID, true)
```

#### Clear All Automation
```javascript
// In Apps Script console
clearAllTriggers()
```

#### Test Single Component
```javascript
// Test incremental processing
automatedIncrementalProcessing()

// Test health check
automatedHealthCheck()

// Test cleanup
automatedDailyCleanup()
```

## 🎯 Best Practices

### 1. **Gradual Rollout**
- Start with short intervals (15 minutes)
- Monitor performance for 24-48 hours
- Adjust intervals based on activity patterns

### 2. **Notification Management**
- Start with error-only notifications
- Enable daily summaries after system is stable
- Use a dedicated email for automation alerts

### 3. **Performance Monitoring**
- Check admin dashboard daily for first week
- Monitor Google Apps Script quota usage
- Watch for error rate trends

### 4. **Maintenance Schedule**
- Weekly admin dashboard review
- Monthly performance optimization
- Quarterly automation configuration review

## 🆓 Free Tier Limits

### Google Apps Script
- **Daily runtime**: 6 hours total execution time
- **Triggers**: 20 time-based triggers maximum  
- **Execution time**: 6 minutes per execution
- **Gmail API**: 250 quota units per user per day

### Optimization Strategies
- **Batch processing**: Process multiple photos per execution
- **Smart caching**: Reduce redundant API calls
- **Execution limits**: Stop processing before timeout
- **Error handling**: Graceful failure without wasting quota

### Quota Monitoring
```javascript
// Monitor execution time
console.log('Execution time:', new Date() - startTime, 'ms');

// Check quota usage in Google Cloud Console
// APIs & Services → Drive API → Quotas
```

## 🚀 Advanced Features

### Custom Triggers
Add custom automation for specific needs:

```javascript
// Custom trigger for high-priority folder
ScriptApp.newTrigger('processHighPriorityFolder')
         .timeBased()
         .everyMinutes(5)
         .create();
```

### Webhook Integration (Advanced)
For real-time Drive change notifications:
- Requires Google Cloud Pub/Sub setup
- Not covered by free tier
- Alternative: Use shorter time intervals

### Performance Analytics
Export processing logs for analysis:
```javascript
// Export automation logs
const logs = getAutomationLogs();
const csv = convertToCSV(logs);
// Use in BI tools for trend analysis
```

---

**The automation system is now ready to keep your photo database automatically updated 24/7 using only Google's free tier services!** 🚀

For support, check the main README.md or create an issue in the repository.
