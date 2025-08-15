/**
 * Photo Mapper - Photo Processor
 * 
 * Processes photos from Google Drive, extracts GPS metadata, and stores it in the database.
 * This separates the heavy lifting from the frontend visualization.
 */

/**
 * Process all photos in a folder and store metadata in database
 */
function processPhotosInFolder(folderId, forceReprocess = false) {
  const startTime = new Date();
  let filesProcessed = 0;
  let filesWithGPS = 0;
  let errors = 0;
  
  try {
    console.log(`Starting photo processing for folder: ${folderId}`);
    
    // Initialize database if needed
    if (!DB_CONFIG.SPREADSHEET_ID) {
      console.log('Initializing database...');
      initializeDatabase();
    }
    
    // Get all photos from Drive folder
    const photos = listImagesFromFolder(folderId);
    console.log(`Found ${photos.length} images in folder`);
    
    for (const photo of photos) {
      try {
        // Check if already processed (unless forcing reprocess)
        if (!forceReprocess && isPhotoAlreadyProcessed(photo)) {
          console.log(`Skipping already processed: ${photo.name}`);
          continue;
        }
        
        // Extract and store metadata
        const success = processPhotoMetadata(photo, folderId);
        filesProcessed++;
        
        if (success) {
          filesWithGPS++;
        }
        
        // Add small delay to avoid quota issues
        if (filesProcessed % 50 === 0) {
          Utilities.sleep(1000); // 1 second pause every 50 files
        }
        
      } catch (error) {
        console.error(`Error processing ${photo.name}:`, error);
        errors++;
      }
    }
    
    const duration = new Date() - startTime;
    const status = errors > 0 ? 'partial' : 'completed';
    
    // Log processing activity
    logProcessingActivity(
      folderId, 
      'process', 
      filesProcessed, 
      filesWithGPS, 
      errors, 
      duration, 
      status
    );
    
    console.log(`Processing complete: ${filesProcessed} processed, ${filesWithGPS} with GPS, ${errors} errors`);
    
    return {
      success: true,
      filesProcessed: filesProcessed,
      filesWithGPS: filesWithGPS,
      errors: errors,
      duration: duration,
      status: status
    };
    
  } catch (error) {
    console.error('Photo processing failed:', error);
    
    const duration = new Date() - startTime;
    logProcessingActivity(folderId, 'process', filesProcessed, filesWithGPS, errors + 1, duration, 'failed');
    
    throw error;
  }
}

/**
 * Get all image files from a Drive folder
 */
function listImagesFromFolder(folderId) {
  const photos = [];
  const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
  const fields = 'files(id,name,mimeType,modifiedTime,size,md5Checksum,imageMediaMetadata(time,location)),nextPageToken';
  
  let pageToken = null;
  
  do {
    try {
      const requestParams = {
        q: query,
        fields: fields,
        pageSize: CFG.PAGE_SIZE || 200,
        orderBy: 'modifiedTime desc'
      };
      
      if (pageToken) {
        requestParams.pageToken = pageToken;
      }
      
      const response = Drive.Files.list(requestParams);
      
      if (response.files) {
        photos.push(...response.files);
      }
      
      pageToken = response.nextPageToken || null;
      
    } catch (error) {
      console.error('Drive API error:', error);
      throw new Error(`Drive API request failed: ${error.toString()}`);
    }
    
  } while (pageToken);
  
  return photos;
}

/**
 * Check if a photo has already been processed
 */
function isPhotoAlreadyProcessed(photo) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) return false;
    
    const existingRowIndex = findPhotoRow(sheet, photo.id);
    
    if (existingRowIndex > 0) {
      // Check if file has been modified since last processing
      const existingData = sheet.getRange(existingRowIndex, 1, 1, 16).getValues()[0];
      const existingModifiedTime = existingData[8]; // modifiedTime column
      const existingChecksum = existingData[15]; // checksum column
      
      // Compare modification time and checksum
      const currentModifiedTime = photo.modifiedTime;
      const currentChecksum = photo.md5Checksum || '';
      
      if (existingModifiedTime === currentModifiedTime && existingChecksum === currentChecksum) {
        return true; // Already processed and unchanged
      }
    }
    
    return false;
    
  } catch (error) {
    console.warn('Error checking if photo processed:', error);
    return false;
  }
}

/**
 * Process a single photo and store its metadata
 */
function processPhotoMetadata(photo, folderId) {
  try {
    // Check if photo has GPS metadata
    const metadata = photo.imageMediaMetadata;
    
    if (!metadata || !metadata.location) {
      console.log(`No GPS data found in: ${photo.name}`);
      return false;
    }
    
    const location = metadata.location;
    
    // Validate coordinates
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.log(`Invalid GPS coordinates in: ${photo.name}`);
      return false;
    }
    
    if (location.latitude < -90 || location.latitude > 90 ||
        location.longitude < -180 || location.longitude > 180) {
      console.warn(`GPS coordinates out of range in: ${photo.name}`);
      return false;
    }
    
    // Prepare metadata for database
    const photoData = {
      id: photo.id,
      name: photo.name,
      mimeType: photo.mimeType,
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: (typeof location.altitude === 'number') ? location.altitude : null,
      dateTime: metadata.time || null,
      modifiedTime: photo.modifiedTime,
      size: photo.size || null,
      folderId: folderId,
      checksum: photo.md5Checksum || ''
    };
    
    // Get Drive links (these might not be in the API response, so we'll generate them)
    photoData.thumbnailLink = `https://drive.google.com/thumbnail?id=${photo.id}`;
    photoData.webViewLink = `https://drive.google.com/file/d/${photo.id}/view`;
    photoData.webContentLink = `https://drive.google.com/uc?id=${photo.id}`;
    
    // Store in database
    storePhotoMetadata(photoData);
    
    console.log(`Successfully processed: ${photo.name} at ${location.latitude}, ${location.longitude}`);
    return true;
    
  } catch (error) {
    console.error(`Error processing photo ${photo.name}:`, error);
    throw error;
  }
}

/**
 * Schedule processing for a folder (can be called by trigger)
 */
function schedulePhotoProcessing(folderId) {
  try {
    console.log(`Scheduled processing started for folder: ${folderId}`);
    
    const result = processPhotosInFolder(folderId, false);
    
    console.log('Scheduled processing completed:', result);
    return result;
    
  } catch (error) {
    console.error('Scheduled processing failed:', error);
    throw error;
  }
}

/**
 * Incremental processing - only process new/modified photos
 */
function incrementalPhotoProcessing(folderId) {
  try {
    console.log(`Starting incremental processing for folder: ${folderId}`);
    
    // Get last processing time
    const lastProcessingTime = getLastProcessingTime(folderId);
    
    // Get photos modified since last processing
    const photos = listRecentlyModifiedImages(folderId, lastProcessingTime);
    
    if (photos.length === 0) {
      console.log('No new or modified photos found');
      return { success: true, filesProcessed: 0, filesWithGPS: 0, errors: 0 };
    }
    
    console.log(`Found ${photos.length} new/modified photos`);
    
    let filesProcessed = 0;
    let filesWithGPS = 0;
    let errors = 0;
    
    for (const photo of photos) {
      try {
        const success = processPhotoMetadata(photo, folderId);
        filesProcessed++;
        
        if (success) {
          filesWithGPS++;
        }
        
      } catch (error) {
        console.error(`Error processing ${photo.name}:`, error);
        errors++;
      }
    }
    
    // Log incremental processing
    logProcessingActivity(
      folderId, 
      'incremental', 
      filesProcessed, 
      filesWithGPS, 
      errors, 
      0, 
      errors > 0 ? 'partial' : 'completed'
    );
    
    return {
      success: true,
      filesProcessed: filesProcessed,
      filesWithGPS: filesWithGPS,
      errors: errors
    };
    
  } catch (error) {
    console.error('Incremental processing failed:', error);
    throw error;
  }
}

/**
 * Get last processing time for a folder
 */
function getLastProcessingTime(folderId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PROCESSING_SHEET);
    
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    let lastTime = null;
    
    // Find most recent processing entry for this folder
    for (let i = data.length - 1; i >= 1; i--) { // Start from end, skip header
      if (data[i][1] === folderId && (data[i][2] === 'process' || data[i][2] === 'incremental')) {
        lastTime = data[i][0]; // timestamp column
        break;
      }
    }
    
    return lastTime;
    
  } catch (error) {
    console.warn('Error getting last processing time:', error);
    return null;
  }
}

/**
 * Get recently modified images from a folder
 */
function listRecentlyModifiedImages(folderId, since) {
  if (!since) {
    return listImagesFromFolder(folderId);
  }
  
  const sinceDate = new Date(since);
  const sinceISO = sinceDate.toISOString();
  
  const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/' and modifiedTime > '${sinceISO}'`;
  const fields = 'files(id,name,mimeType,modifiedTime,size,md5Checksum,imageMediaMetadata(time,location)),nextPageToken';
  
  const photos = [];
  let pageToken = null;
  
  do {
    try {
      const requestParams = {
        q: query,
        fields: fields,
        pageSize: CFG.PAGE_SIZE || 200,
        orderBy: 'modifiedTime desc'
      };
      
      if (pageToken) {
        requestParams.pageToken = pageToken;
      }
      
      const response = Drive.Files.list(requestParams);
      
      if (response.files) {
        photos.push(...response.files);
      }
      
      pageToken = response.nextPageToken || null;
      
    } catch (error) {
      console.error('Drive API error:', error);
      throw new Error(`Drive API request failed: ${error.toString()}`);
    }
    
  } while (pageToken);
  
  return photos;
}

/**
 * Clean up database - remove entries for deleted Drive files
 */
function cleanupDatabase(folderId) {
  try {
    console.log(`Starting database cleanup for folder: ${folderId}`);
    
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      console.log('No photos sheet found');
      return { removed: 0 };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const folderIdIndex = headers.indexOf('folderId');
    const idIndex = headers.indexOf('id');
    
    let removedCount = 0;
    
    // Check each database entry against Drive
    for (let i = data.length - 1; i >= 1; i--) { // Start from end to avoid index issues
      const row = data[i];
      
      // Only check files from specified folder
      if (row[folderIdIndex] === folderId) {
        const fileId = row[idIndex];
        
        try {
          // Try to get file from Drive
          Drive.Files.get(fileId);
        } catch (error) {
          // File not found in Drive - remove from database
          sheet.deleteRow(i + 1); // +1 because sheet rows are 1-based
          removedCount++;
          console.log(`Removed deleted file from database: ${row[1]}`); // row[1] is name
        }
      }
    }
    
    logProcessingActivity(folderId, 'cleanup', 0, 0, 0, 0, 'completed');
    
    console.log(`Database cleanup complete: ${removedCount} entries removed`);
    return { removed: removedCount };
    
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
}
