/**
 * Photo Mapper - Automation Manager
 * 
 * Handles automatic incremental updates, monitoring, and maintenance
 * using Google's free tier cloud services for maximum automation.
 */

// Automation configuration
const AUTOMATION_CONFIG = {
  // Trigger intervals (in minutes)
  INCREMENTAL_INTERVAL: 15,      // Check for new photos every 15 minutes
  CLEANUP_INTERVAL: 1440,        // Daily cleanup (24 hours)
  HEALTH_CHECK_INTERVAL: 1,     // Health check every hour
  MONITORING_INTERVAL: 6,      // Send monitoring report every 6 hours
  
  // Processing limits
  MAX_FILES_PER_RUN: 100,        // Limit processing to avoid timeouts
  MAX_EXECUTION_TIME: 300000,    // 5 minutes max execution (Apps Script limit is 6)
  
  // Notification settings
  NOTIFICATION_EMAIL: PropertiesService.getScriptProperties().getProperty('NOTIFICATION_EMAIL') || '',
  SEND_SUCCESS_NOTIFICATIONS: false,  // Only send error notifications by default
  SEND_DAILY_SUMMARY: true,      // Send daily summary reports
  
  // Error handling
  MAX_RETRIES: 3,                // Maximum retry attempts
  RETRY_DELAY: 300000,           // 5 minutes between retries
  
  // Performance monitoring
  PERFORMANCE_THRESHOLD: 30000,  // Alert if processing takes more than 30 seconds
  ERROR_RATE_THRESHOLD: 0.1      // Alert if error rate exceeds 10%
};

/**
 * Setup all automation triggers
 * Call this once to initialize the automation system
 */
function setupAutomation() {
  try {
    console.log('Setting up Photo Mapper automation...');
    
    // Clear existing triggers first
    clearAllTriggers();
    
    // Create incremental processing trigger
    ScriptApp.newTrigger('automatedIncrementalProcessing')
             .timeBased()
             .everyMinutes(AUTOMATION_CONFIG.INCREMENTAL_INTERVAL)
             .create();
    
    // Create daily cleanup trigger
    ScriptApp.newTrigger('automatedDailyCleanup')
             .timeBased()
             .everyDays(1)
             .atHour(2) // Run at 2 AM
             .create();
    
    // Create health check trigger
    ScriptApp.newTrigger('automatedHealthCheck')
             .timeBased()
             .everyHours(AUTOMATION_CONFIG.HEALTH_CHECK_INTERVAL)
             .create();
    
    // Create monitoring report trigger
    ScriptApp.newTrigger('automatedMonitoringReport')
             .timeBased()
             .everyHours(AUTOMATION_CONFIG.MONITORING_INTERVAL)
             .create();
    
    // Create Drive file change trigger (if possible)
    try {
      setupDriveChangeTrigger();
    } catch (e) {
      console.warn('Could not setup Drive change trigger:', e.message);
    }
    
    // Log automation setup
    const setupInfo = {
      timestamp: new Date().toISOString(),
      triggers: ScriptApp.getProjectTriggers().length,
      config: AUTOMATION_CONFIG
    };
    
    logAutomationEvent('setup', 'Automation system initialized', setupInfo, 'success');
    
    // Send setup confirmation email
    if (AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper Automation Setup Complete',
        `Automation system initialized successfully with ${setupInfo.triggers} triggers.`,
        'success'
      );
    }
    
    console.log('Automation setup completed successfully');
    return setupInfo;
    
  } catch (error) {
    console.error('Automation setup failed:', error);
    logAutomationEvent('setup', 'Automation setup failed', { error: error.toString() }, 'error');
    throw error;
  }
}

/**
 * Clear all existing triggers for this project
 */
function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log(`Cleared ${triggers.length} existing triggers`);
}

/**
 * Automated incremental processing (triggered every 15 minutes)
 */
function automatedIncrementalProcessing() {
  const startTime = new Date();
  
  try {
    console.log('Starting automated incremental processing...');
    
    // Check if another processing is still running
    if (isProcessingRunning()) {
      console.log('Processing already running, skipping this cycle');
      return;
    }
    
    // Set processing flag
    setProcessingFlag(true);
    
    const folderId = CFG.FOLDER_ID;
    if (!folderId) {
      throw new Error('FOLDER_ID not configured');
    }
    
    // Run incremental processing with limits
    const result = incrementalPhotoProcessingWithLimits(folderId);
    
    const duration = new Date() - startTime;
    
    // Log successful processing
    logAutomationEvent(
      'incremental_processing',
      'Automated incremental processing completed',
      {
        ...result,
        duration: duration,
        folderId: folderId
      },
      'success'
    );
    
    // Send notification if significant activity
    if (result.filesProcessed > 10 && AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper: New Photos Processed',
        `Processed ${result.filesProcessed} new photos, ${result.filesWithGPS} with GPS data.`,
        'info'
      );
    }
    
    console.log(`Automated processing completed: ${result.filesProcessed} files processed`);
    
  } catch (error) {
    const duration = new Date() - startTime;
    
    console.error('Automated incremental processing failed:', error);
    
    logAutomationEvent(
      'incremental_processing',
      'Automated processing failed',
      {
        error: error.toString(),
        duration: duration
      },
      'error'
    );
    
    // Send error notification
    if (AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper: Processing Error',
        `Automated processing failed: ${error.message}`,
        'error'
      );
    }
    
    // Implement retry mechanism
    scheduleRetry('automatedIncrementalProcessing', error);
    
  } finally {
    // Clear processing flag
    setProcessingFlag(false);
  }
}

/**
 * Incremental processing with execution time and file limits
 */
function incrementalPhotoProcessingWithLimits(folderId) {
  const startTime = new Date();
  let filesProcessed = 0;
  let filesWithGPS = 0;
  let errors = 0;
  
  try {
    // Get recently modified photos
    const lastProcessingTime = getLastProcessingTime(folderId);
    const photos = listRecentlyModifiedImages(folderId, lastProcessingTime);
    
    console.log(`Found ${photos.length} photos to process`);
    
    // Limit number of files to process
    const photosToProcess = photos.slice(0, AUTOMATION_CONFIG.MAX_FILES_PER_RUN);
    
    for (const photo of photosToProcess) {
      // Check execution time limit
      if (new Date() - startTime > AUTOMATION_CONFIG.MAX_EXECUTION_TIME) {
        console.log('Execution time limit reached, stopping processing');
        break;
      }
      
      try {
        const success = processPhotoMetadata(photo, folderId);
        filesProcessed++;
        
        if (success) {
          filesWithGPS++;
        }
        
        // Small delay to avoid rate limits
        if (filesProcessed % 10 === 0) {
          Utilities.sleep(100);
        }
        
      } catch (error) {
        console.error(`Error processing ${photo.name}:`, error);
        errors++;
      }
    }
    
    // Log processing activity
    const duration = new Date() - startTime;
    logProcessingActivity(
      folderId,
      'automated_incremental',
      filesProcessed,
      filesWithGPS,
      errors,
      duration,
      errors > 0 ? 'partial' : 'completed'
    );
    
    return {
      success: true,
      filesProcessed: filesProcessed,
      filesWithGPS: filesWithGPS,
      errors: errors,
      totalFound: photos.length,
      duration: duration
    };
    
  } catch (error) {
    console.error('Limited incremental processing failed:', error);
    throw error;
  }
}

/**
 * Automated daily cleanup (triggered at 2 AM daily)
 */
function automatedDailyCleanup() {
  const startTime = new Date();
  
  try {
    console.log('Starting automated daily cleanup...');
    
    const folderId = CFG.FOLDER_ID;
    if (!folderId) {
      throw new Error('FOLDER_ID not configured');
    }
    
    // Run database cleanup
    const cleanupResult = cleanupDatabase(folderId);
    
    // Clear old cache entries
    clearDatabaseCache();
    
    // Get database statistics
    const stats = getDatabaseStats();
    
    const duration = new Date() - startTime;
    
    // Log cleanup activity
    logAutomationEvent(
      'daily_cleanup',
      'Automated daily cleanup completed',
      {
        ...cleanupResult,
        stats: stats,
        duration: duration
      },
      'success'
    );
    
    // Send daily summary if enabled
    if (AUTOMATION_CONFIG.SEND_DAILY_SUMMARY && AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendDailySummary(stats, cleanupResult);
    }
    
    console.log(`Daily cleanup completed: ${cleanupResult.removed} entries removed`);
    
  } catch (error) {
    console.error('Automated daily cleanup failed:', error);
    
    logAutomationEvent(
      'daily_cleanup',
      'Daily cleanup failed',
      { error: error.toString() },
      'error'
    );
    
    if (AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper: Daily Cleanup Error',
        `Daily cleanup failed: ${error.message}`,
        'error'
      );
    }
  }
}

/**
 * Automated health check (triggered every hour)
 */
function automatedHealthCheck() {
  try {
    const healthStatus = performHealthCheck();
    
    // Log health check
    logAutomationEvent(
      'health_check',
      'Automated health check completed',
      healthStatus,
      healthStatus.overall === 'healthy' ? 'success' : 'warning'
    );
    
    // Send alert if unhealthy
    if (healthStatus.overall !== 'healthy' && AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper: Health Check Alert',
        `System health check detected issues: ${JSON.stringify(healthStatus.issues)}`,
        'warning'
      );
    }
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    if (AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      sendNotificationEmail(
        'Photo Mapper: Health Check Failed',
        `Health check could not complete: ${error.message}`,
        'error'
      );
    }
  }
}

/**
 * Perform comprehensive health check
 */
function performHealthCheck() {
  const issues = [];
  
  try {
    // Check database connection
    if (!DB_CONFIG.SPREADSHEET_ID) {
      issues.push('Database not initialized');
    } else {
      try {
        SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
      } catch (e) {
        issues.push('Database connection failed');
      }
    }
    
    // Check folder access
    if (CFG.FOLDER_ID) {
      try {
        DriveApp.getFolderById(CFG.FOLDER_ID);
      } catch (e) {
        issues.push('Drive folder access failed');
      }
    } else {
      issues.push('Folder ID not configured');
    }
    
    // Check recent processing activity
    const lastProcessing = getLastProcessingTime(CFG.FOLDER_ID);
    if (lastProcessing) {
      const timeSinceLastProcessing = new Date() - new Date(lastProcessing);
      const hoursSince = timeSinceLastProcessing / (1000 * 60 * 60);
      
      if (hoursSince > 25) { // More than 25 hours since last processing
        issues.push('No recent processing activity');
      }
    }
    
    // Check error rates
    const recentErrors = getRecentErrorRate();
    if (recentErrors > AUTOMATION_CONFIG.ERROR_RATE_THRESHOLD) {
      issues.push(`High error rate: ${(recentErrors * 100).toFixed(1)}%`);
    }
    
    return {
      timestamp: new Date().toISOString(),
      overall: issues.length === 0 ? 'healthy' : 'issues',
      issues: issues,
      checksPerformed: ['database', 'folder_access', 'recent_activity', 'error_rate']
    };
    
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      overall: 'error',
      issues: ['Health check execution failed'],
      error: error.toString()
    };
  }
}

/**
 * Get recent error rate from processing logs
 */
function getRecentErrorRate() {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PROCESSING_SHEET);
    
    if (!sheet) return 0;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Get logs from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let totalOperations = 0;
    let errorOperations = 0;
    
    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][0]);
      if (timestamp > oneDayAgo) {
        totalOperations++;
        const status = data[i][7]; // status column
        if (status === 'failed' || status === 'partial') {
          errorOperations++;
        }
      }
    }
    
    return totalOperations > 0 ? errorOperations / totalOperations : 0;
    
  } catch (error) {
    console.warn('Could not calculate error rate:', error);
    return 0;
  }
}

/**
 * Setup Drive API change notification (experimental)
 */
function setupDriveChangeTrigger() {
  // Note: This requires additional setup and may not work in all environments
  // It's included for completeness but may need manual configuration
  
  try {
    const folderId = CFG.FOLDER_ID;
    if (!folderId) {
      throw new Error('Folder ID not configured');
    }
    
    // This would require setting up a webhook endpoint
    // For now, we'll rely on time-based triggers
    console.log('Drive change triggers require additional webhook setup');
    
  } catch (error) {
    console.warn('Drive change trigger setup failed:', error);
  }
}

/**
 * Processing flag management to prevent overlapping executions
 */
function setProcessingFlag(isProcessing) {
  const cache = CacheService.getScriptCache();
  if (isProcessing) {
    cache.put('processing_flag', 'true', 600); // 10 minutes expiry
  } else {
    cache.remove('processing_flag');
  }
}

function isProcessingRunning() {
  const cache = CacheService.getScriptCache();
  return cache.get('processing_flag') === 'true';
}

/**
 * Schedule retry for failed operations
 */
function scheduleRetry(functionName, error) {
  try {
    const cache = CacheService.getScriptCache();
    const retryKey = `retry_${functionName}`;
    const retryCount = parseInt(cache.get(retryKey) || '0');
    
    if (retryCount < AUTOMATION_CONFIG.MAX_RETRIES) {
      cache.put(retryKey, (retryCount + 1).toString(), 3600); // 1 hour expiry
      
      // Schedule retry trigger
      ScriptApp.newTrigger(functionName)
               .timeBased()
               .after(AUTOMATION_CONFIG.RETRY_DELAY)
               .create();
      
      console.log(`Scheduled retry ${retryCount + 1} for ${functionName}`);
      
    } else {
      console.error(`Max retries reached for ${functionName}`);
      cache.remove(retryKey);
    }
    
  } catch (e) {
    console.error('Could not schedule retry:', e);
  }
}

/**
 * Log automation events to a dedicated sheet
 */
function logAutomationEvent(eventType, message, data, level) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName('automation_log');
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet('automation_log');
      sheet.getRange(1, 1, 1, 6).setValues([
        ['timestamp', 'event_type', 'level', 'message', 'data', 'execution_id']
      ]);
      sheet.setFrozenRows(1);
    }
    
    const logEntry = [
      new Date().toISOString(),
      eventType,
      level,
      message,
      JSON.stringify(data),
      Utilities.getUuid()
    ];
    
    sheet.appendRow(logEntry);
    
  } catch (error) {
    console.error('Failed to log automation event:', error);
  }
}

/**
 * Send email notifications
 */
function sendNotificationEmail(subject, message, level) {
  try {
    if (!AUTOMATION_CONFIG.NOTIFICATION_EMAIL) {
      return;
    }
    
    const emailBody = `
Photo Mapper Automation Notification

${message}

Timestamp: ${new Date().toISOString()}
Level: ${level}
System: Photo Mapper v2.0

---
This is an automated message from your Photo Mapper system.
    `;
    
    GmailApp.sendEmail(
      AUTOMATION_CONFIG.NOTIFICATION_EMAIL,
      `[Photo Mapper] ${subject}`,
      emailBody
    );
    
    console.log(`Notification email sent: ${subject}`);
    
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
}

/**
 * Send daily summary report
 */
function sendDailySummary(stats, cleanupResult) {
  try {
    const subject = 'Photo Mapper Daily Summary';
    const message = `
Daily Summary Report

Database Statistics:
- Total Photos: ${stats.totalPhotos}
- Photos with GPS: ${stats.photosWithGPS}
- Processing Rate: ${stats.totalPhotos > 0 ? Math.round((stats.photosWithGPS / stats.totalPhotos) * 100) : 0}%

Cleanup Results:
- Removed Entries: ${cleanupResult.removed}

System Status: Healthy
Last Updated: ${stats.lastUpdated}

Your Photo Mapper system is running smoothly!
    `;
    
    sendNotificationEmail(subject, message, 'info');
    
  } catch (error) {
    console.error('Failed to send daily summary:', error);
  }
}

/**
 * Automated monitoring report (triggered every 6 hours)
 */
function automatedMonitoringReport() {
  try {
    const stats = getDatabaseStats();
    const healthStatus = performHealthCheck();
    
    logAutomationEvent(
      'monitoring_report',
      'Automated monitoring report generated',
      {
        stats: stats,
        health: healthStatus
      },
      'info'
    );
    
    // Only send email if there are issues or significant changes
    if (healthStatus.overall !== 'healthy') {
      sendNotificationEmail(
        'Photo Mapper: Monitoring Alert',
        `System monitoring detected issues: ${JSON.stringify(healthStatus.issues)}`,
        'warning'
      );
    }
    
  } catch (error) {
    console.error('Monitoring report failed:', error);
  }
}

/**
 * Manual trigger to test automation
 */
function testAutomation() {
  console.log('Testing automation system...');
  
  try {
    // Test incremental processing
    automatedIncrementalProcessing();
    
    // Test health check
    automatedHealthCheck();
    
    console.log('Automation test completed successfully');
    return { success: true, message: 'Automation test completed' };
    
  } catch (error) {
    console.error('Automation test failed:', error);
    return { success: false, error: error.toString() };
  }
}
