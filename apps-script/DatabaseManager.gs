/**
 * Photo Mapper - Database Manager
 * 
 * Manages photo metadata storage and retrieval using Google Sheets as a database.
 * This provides a scalable, serverless database solution within Google's ecosystem.
 */

// Database configuration
const DB_CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('DATABASE_SPREADSHEET_ID') || '',
  PHOTOS_SHEET: 'photos',
  PROCESSING_SHEET: 'processing_log',
  CACHE_DURATION: 300, // 5 minutes
};

/**
 * Initialize database (create spreadsheet and sheets if they don't exist)
 */
function initializeDatabase() {
  try {
    let spreadsheetId = DB_CONFIG.SPREADSHEET_ID;
    let spreadsheet;
    
    if (!spreadsheetId) {
      // Create new spreadsheet
      spreadsheet = SpreadsheetApp.create('Photo Mapper Database');
      spreadsheetId = spreadsheet.getId();
      
      // Save spreadsheet ID to script properties
      PropertiesService.getScriptProperties().setProperty('DATABASE_SPREADSHEET_ID', spreadsheetId);
      DB_CONFIG.SPREADSHEET_ID = spreadsheetId;
      
      console.log('Created new database spreadsheet:', spreadsheetId);
    } else {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    }
    
    // Initialize photos sheet
    initializePhotosSheet(spreadsheet);
    
    // Initialize processing log sheet
    initializeProcessingSheet(spreadsheet);
    
    return {
      success: true,
      spreadsheetId: spreadsheetId,
      url: spreadsheet.getUrl()
    };
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw new Error(`Failed to initialize database: ${error.toString()}`);
  }
}

/**
 * Initialize or verify photos sheet structure
 */
function initializePhotosSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DB_CONFIG.PHOTOS_SHEET);
    
    // Set up headers
    const headers = [
      'id',           // Drive file ID
      'name',         // File name
      'mimeType',     // File MIME type
      'latitude',     // GPS latitude
      'longitude',    // GPS longitude
      'altitude',     // GPS altitude (optional)
      'accuracy',     // GPS accuracy (optional)
      'dateTime',     // Photo date/time
      'modifiedTime', // Drive modified time
      'size',         // File size in bytes
      'thumbnailLink', // Drive thumbnail URL
      'webViewLink',  // Drive view URL
      'webContentLink', // Drive download URL
      'folderId',     // Parent folder ID
      'processed',    // Processing timestamp
      'checksum'      // File checksum for change detection
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    console.log('Created photos sheet with headers');
  }
  
  return sheet;
}

/**
 * Initialize or verify processing log sheet structure
 */
function initializeProcessingSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(DB_CONFIG.PROCESSING_SHEET);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DB_CONFIG.PROCESSING_SHEET);
    
    const headers = [
      'timestamp',
      'folderId',
      'action',       // 'scan', 'process', 'update', 'delete'
      'filesProcessed',
      'filesWithGPS',
      'errors',
      'duration',
      'status'        // 'completed', 'failed', 'partial'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    console.log('Created processing log sheet with headers');
  }
  
  return sheet;
}

/**
 * Store photo metadata in database
 */
function storePhotoMetadata(photoData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      throw new Error('Photos sheet not found');
    }
    
    // Check if photo already exists
    const existingRowIndex = findPhotoRow(sheet, photoData.id);
    
    const rowData = [
      photoData.id,
      photoData.name,
      photoData.mimeType,
      photoData.latitude,
      photoData.longitude,
      photoData.altitude || '',
      photoData.accuracy || '',
      photoData.dateTime || '',
      photoData.modifiedTime,
      photoData.size || '',
      photoData.thumbnailLink || '',
      photoData.webViewLink || '',
      photoData.webContentLink || '',
      photoData.folderId || '',
      new Date().toISOString(),
      photoData.checksum || ''
    ];
    
    if (existingRowIndex > 0) {
      // Update existing row
      sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
      console.log(`Updated photo metadata: ${photoData.name}`);
    } else {
      // Add new row
      sheet.appendRow(rowData);
      console.log(`Added photo metadata: ${photoData.name}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('Error storing photo metadata:', error);
    throw error;
  }
}

/**
 * Find row index for a photo by ID
 */
function findPhotoRow(sheet, photoId) {
  const idColumn = sheet.getRange('A:A').getValues();
  
  for (let i = 1; i < idColumn.length; i++) { // Start from 1 to skip header
    if (idColumn[i][0] === photoId) {
      return i + 1; // Return 1-based row index
    }
  }
  
  return -1; // Not found
}

/**
 * Search photos by location within bounding box
 */
function searchPhotosByBounds(north, south, east, west, limit = 1000) {
  try {
    const cacheKey = `search:${north},${south},${east},${west},${limit}`;
    const cache = CacheService.getScriptCache();
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      throw new Error('Photos sheet not found');
    }
    
    // Get all data (excluding header)
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Find column indices
    const latIndex = headers.indexOf('latitude');
    const lngIndex = headers.indexOf('longitude');
    
    if (latIndex === -1 || lngIndex === -1) {
      throw new Error('Latitude or longitude columns not found');
    }
    
    // Filter rows within bounds
    const results = [];
    
    for (const row of rows) {
      const lat = parseFloat(row[latIndex]);
      const lng = parseFloat(row[lngIndex]);
      
      // Skip invalid coordinates
      if (isNaN(lat) || isNaN(lng)) continue;
      
      // Check if within bounds
      if (lat <= north && lat >= south && lng <= east && lng >= west) {
        const photo = {
          id: row[0],
          name: row[1],
          mimeType: row[2],
          imageMediaMetadata: {
            location: {
              latitude: lat,
              longitude: lng,
              altitude: row[5] ? parseFloat(row[5]) : null
            },
            time: row[7] || null
          },
          modifiedTime: row[8],
          thumbnailLink: row[10],
          webViewLink: row[11],
          webContentLink: row[12],
          folderId: row[13]
        };
        
        results.push(photo);
        
        // Apply limit
        if (results.length >= limit) break;
      }
    }
    
    // Cache results
    try {
      cache.put(cacheKey, JSON.stringify(results), DB_CONFIG.CACHE_DURATION);
    } catch (e) {
      console.warn('Cache put error:', e);
    }
    
    return results;
    
  } catch (error) {
    console.error('Error searching photos by bounds:', error);
    throw error;
  }
}

/**
 * Search photos by radius around a point
 */
function searchPhotosByRadius(centerLat, centerLng, radiusMeters, limit = 1000) {
  try {
    const cacheKey = `radius:${centerLat},${centerLng},${radiusMeters},${limit}`;
    const cache = CacheService.getScriptCache();
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      throw new Error('Photos sheet not found');
    }
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Find column indices
    const latIndex = headers.indexOf('latitude');
    const lngIndex = headers.indexOf('longitude');
    
    if (latIndex === -1 || lngIndex === -1) {
      throw new Error('Latitude or longitude columns not found');
    }
    
    const results = [];
    
    for (const row of rows) {
      const lat = parseFloat(row[latIndex]);
      const lng = parseFloat(row[lngIndex]);
      
      if (isNaN(lat) || isNaN(lng)) continue;
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(centerLat, centerLng, lat, lng);
      
      if (distance <= radiusMeters) {
        const photo = {
          id: row[0],
          name: row[1],
          mimeType: row[2],
          imageMediaMetadata: {
            location: {
              latitude: lat,
              longitude: lng,
              altitude: row[5] ? parseFloat(row[5]) : null
            },
            time: row[7] || null
          },
          modifiedTime: row[8],
          thumbnailLink: row[10],
          webViewLink: row[11],
          webContentLink: row[12],
          folderId: row[13],
          distance: distance // Include distance in results
        };
        
        results.push(photo);
        
        if (results.length >= limit) break;
      }
    }
    
    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);
    
    // Cache results
    try {
      cache.put(cacheKey, JSON.stringify(results), DB_CONFIG.CACHE_DURATION);
    } catch (e) {
      console.warn('Cache put error:', e);
    }
    
    return results;
    
  } catch (error) {
    console.error('Error searching photos by radius:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
function getDatabaseStats() {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      return { totalPhotos: 0, photosWithGPS: 0 };
    }
    
    const data = sheet.getDataRange().getValues();
    const totalPhotos = data.length - 1; // Exclude header
    
    let photosWithGPS = 0;
    const latIndex = data[0].indexOf('latitude');
    const lngIndex = data[0].indexOf('longitude');
    
    if (latIndex !== -1 && lngIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        const lat = parseFloat(data[i][latIndex]);
        const lng = parseFloat(data[i][lngIndex]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          photosWithGPS++;
        }
      }
    }
    
    return {
      totalPhotos: totalPhotos,
      photosWithGPS: photosWithGPS,
      spreadsheetId: DB_CONFIG.SPREADSHEET_ID,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: error.toString() };
  }
}

/**
 * Log processing activity
 */
function logProcessingActivity(folderId, action, filesProcessed, filesWithGPS, errors, duration, status) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PROCESSING_SHEET);
    
    if (sheet) {
      const logEntry = [
        new Date().toISOString(),
        folderId,
        action,
        filesProcessed,
        filesWithGPS,
        errors,
        duration,
        status
      ];
      
      sheet.appendRow(logEntry);
    }
    
  } catch (error) {
    console.error('Error logging processing activity:', error);
  }
}

/**
 * Clear all cached data
 */
function clearDatabaseCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['search', 'radius']);
    console.log('Database cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}
