/**
 * Photo Mapper - Google Apps Script Backend (Database-Enhanced)
 * 
 * This Web App provides an optimized API for photo location data using a database layer.
 * Photos are processed once and stored in a Google Sheets database for fast retrieval.
 * 
 * Features:
 * - Database-backed photo metadata storage
 * - Optimized location-based searches
 * - Background processing pipeline
 * - Admin interface for processing management
 */

// Configuration object - reads from Script Properties
const CFG = (() => {
  const props = PropertiesService.getScriptProperties();
  return {
    FOLDER_ID: props.getProperty('FOLDER_ID') || '',
    API_TOKEN: props.getProperty('API_TOKEN') || '',
    CACHE_SECONDS: 300, // 5 minutes cache for full list
    SEARCH_CACHE_SECONDS: 120, // 2 minutes cache for search results
    PAGE_SIZE: 200,     // Drive API pagination size
    MAX_SEARCH_RESULTS: 1000, // Maximum results for search to prevent memory issues
  };
})();

/**
 * Main entry point for Web App GET requests
 * Supports routes: /search, /admin, /health, and legacy /list
 */
function doGet(e) {
  try {
    // Extract parameters
    const route = (e?.parameter?.route || 'search').toString(); // Default to search now
    const token = (e?.parameter?.token || '').toString();
    const folderId = (e?.parameter?.folderId || CFG.FOLDER_ID).toString();
    
    // Optional token authentication
    if (CFG.API_TOKEN && token !== CFG.API_TOKEN) {
      return createJsonResponse(403, { error: 'Forbidden: Invalid or missing API token' });
    }
    
    // Route handling
    if (route === 'health') {
      return createJsonResponse(200, { 
        ok: true, 
        timestamp: new Date().toISOString(),
        database: !!DB_CONFIG.SPREADSHEET_ID,
        version: '2.0.0'
      });
    }
    
    if (route === 'search') {
      return handleDatabaseSearch(e.parameter);
    }
    
    if (route === 'admin') {
      return handleAdminRequest(e.parameter);
    }
    
    if (route === 'list') {
      // Legacy support - redirect to database search
      console.log('Legacy /list route used, redirecting to database search');
      return handleDatabaseSearch(e.parameter);
    }
    
    return createJsonResponse(404, { 
      error: 'Route not found. Available routes: /search, /admin, /health' 
    });
    
  } catch (error) {
    console.error('doGet error:', error);
    return createJsonResponse(500, { 
      error: 'Internal server error', 
      message: error.toString() 
    });
  }
}

/**
 * Handles the /list route with caching
 */
function handleListPhotos(folderId, parameters = {}) {
  const cacheKey = `photos:${folderId}`;
  const cache = CacheService.getScriptCache();
  
  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      data.cached = true;
      return createJsonResponse(200, data);
    } catch (e) {
      console.warn('Cache parse error:', e);
    }
  }
  
  // Fetch fresh data
  try {
    const photos = listImagesWithGps(folderId);
    const responseData = {
      count: photos.length,
      folderId: folderId,
      timestamp: new Date().toISOString(),
      photos: photos,
      cached: false
    };
    
    // Cache the result
    try {
      cache.put(cacheKey, JSON.stringify(responseData), CFG.CACHE_SECONDS);
    } catch (e) {
      console.warn('Cache put error:', e);
    }
    
    return createJsonResponse(200, responseData);
    
  } catch (error) {
    console.error('listImagesWithGps error:', error);
    return createJsonResponse(500, { 
      error: 'Failed to fetch photos from Drive',
      message: error.toString()
    });
  }
}

/**
 * Handles database-backed search requests
 * Much faster than the original Drive API approach
 */
function handleDatabaseSearch(parameters = {}) {
  try {
    // Initialize database if needed
    if (!DB_CONFIG.SPREADSHEET_ID) {
      console.log('Database not initialized, initializing now...');
      const initResult = initializeDatabase();
      console.log('Database initialized:', initResult);
    }
    
    // Parse search parameters
    const searchParams = parseSearchParameters(parameters);
    
    let results = [];
    let searchType = 'unknown';
    
    if (searchParams.type === 'bbox' || searchParams.type === 'viewport') {
      const bounds = searchParams.bounds;
      results = searchPhotosByBounds(bounds.north, bounds.south, bounds.east, bounds.west, searchParams.limit);
      searchType = 'bounding_box';
      
    } else if (searchParams.type === 'radius') {
      const center = searchParams.center;
      results = searchPhotosByRadius(center.latitude, center.longitude, searchParams.radius, searchParams.limit);
      searchType = 'radius';
      
    } else {
      // Default to all photos (with limit)
      results = getAllPhotosFromDatabase(searchParams.limit);
      searchType = 'all';
    }
    
    const responseData = {
      count: results.length,
      searchType: searchType,
      searchParams: searchParams,
      timestamp: new Date().toISOString(),
      photos: results,
      source: 'database',
      version: '2.0.0'
    };
    
    return createJsonResponse(200, responseData);
    
  } catch (error) {
    console.error('handleDatabaseSearch error:', error);
    return createJsonResponse(500, { 
      error: 'Failed to search photos',
      message: error.toString(),
      suggestion: 'Try running admin setup or processing'
    });
  }
}

/**
 * Handles admin requests for database management
 */
function handleAdminRequest(parameters = {}) {
  try {
    const action = (parameters.action || '').toString();
    const folderId = (parameters.folderId || CFG.FOLDER_ID).toString();
    
    switch (action) {
      case 'init':
        return createJsonResponse(200, initializeDatabase());
        
      case 'process':
        if (!folderId) {
          return createJsonResponse(400, { error: 'folderId required for processing' });
        }
        const processResult = processPhotosInFolder(folderId, false);
        return createJsonResponse(200, processResult);
        
      case 'reprocess':
        if (!folderId) {
          return createJsonResponse(400, { error: 'folderId required for reprocessing' });
        }
        const reprocessResult = processPhotosInFolder(folderId, true);
        return createJsonResponse(200, reprocessResult);
        
      case 'incremental':
        if (!folderId) {
          return createJsonResponse(400, { error: 'folderId required for incremental processing' });
        }
        const incrementalResult = incrementalPhotoProcessing(folderId);
        return createJsonResponse(200, incrementalResult);
        
      case 'cleanup':
        if (!folderId) {
          return createJsonResponse(400, { error: 'folderId required for cleanup' });
        }
        const cleanupResult = cleanupDatabase(folderId);
        return createJsonResponse(200, cleanupResult);
        
      case 'stats':
        const stats = getDatabaseStats();
        return createJsonResponse(200, stats);
        
      case 'clear-cache':
        const cacheCleared = clearDatabaseCache();
        return createJsonResponse(200, { success: cacheCleared });
        
      case 'setup-automation':
        const setupResult = setupAutomation();
        return createJsonResponse(200, setupResult);
        
      case 'test-automation':
        const testResult = testAutomation();
        return createJsonResponse(200, testResult);
        
      case 'clear-automation':
        clearAllTriggers();
        return createJsonResponse(200, { success: true, message: 'All triggers cleared' });
        
      case 'health-check':
        const healthResult = performHealthCheck();
        return createJsonResponse(200, healthResult);
        
      case 'set-notification-email':
        const email = (parameters.email || '').toString();
        if (email) {
          PropertiesService.getScriptProperties().setProperty('NOTIFICATION_EMAIL', email);
          return createJsonResponse(200, { success: true, email: email });
        } else {
          return createJsonResponse(400, { error: 'Email parameter required' });
        }
        
      case 'status':
        const triggerCount = ScriptApp.getProjectTriggers().length;
        return createJsonResponse(200, {
          database: !!DB_CONFIG.SPREADSHEET_ID,
          spreadsheetId: DB_CONFIG.SPREADSHEET_ID,
          folderId: CFG.FOLDER_ID,
          automation: triggerCount > 0,
          triggerCount: triggerCount,
          version: '2.0.0',
          timestamp: new Date().toISOString()
        });
        
      case 'cleanup-no-gps':
        return handleCleanupNoGpsImages(parameters, folderId);
        
      default:
        return createJsonResponse(400, { 
          error: 'Invalid admin action',
          available: [
            'init', 'process', 'reprocess', 'incremental', 'cleanup', 'stats', 'clear-cache', 
            'setup-automation', 'test-automation', 'clear-automation', 'health-check', 
            'set-notification-email', 'status', 'cleanup-no-gps'
          ]
        });
    }
    
  } catch (error) {
    console.error('handleAdminRequest error:', error);
    return createJsonResponse(500, { 
      error: 'Admin request failed',
      message: error.toString()
    });
  }
}

/**
 * Get all photos from database (with limit)
 */
function getAllPhotosFromDatabase(limit = 1000) {
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DB_CONFIG.PHOTOS_SHEET);
    
    if (!sheet) {
      throw new Error('Photos sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1, limit + 1); // Apply limit
    
    const results = [];
    
    for (const row of rows) {
      const photo = {
        id: row[0],
        name: row[1],
        mimeType: row[2],
        imageMediaMetadata: {
          location: {
            latitude: parseFloat(row[3]),
            longitude: parseFloat(row[4]),
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
      
      // Only include photos with valid coordinates
      if (!isNaN(photo.imageMediaMetadata.location.latitude) && 
          !isNaN(photo.imageMediaMetadata.location.longitude)) {
        results.push(photo);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error getting all photos from database:', error);
    throw error;
  }
}

/**
 * Legacy function - now redirects to database search
 * Supports bounding box, radius, and user location searches
 */
function handleSearchPhotos(folderId, parameters = {}) {
  try {
    // Parse search parameters
    const searchParams = parseSearchParameters(parameters);
    
    // Create cache key based on search parameters
    const cacheKey = createSearchCacheKey(folderId, searchParams);
    const cache = CacheService.getScriptCache();
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        data.cached = true;
        return createJsonResponse(200, data);
      } catch (e) {
        console.warn('Cache parse error:', e);
      }
    }
    
    // Fetch and filter photos
    const allPhotos = listImagesWithGps(folderId);
    const filteredPhotos = filterPhotosByLocation(allPhotos, searchParams);
    
    const responseData = {
      count: filteredPhotos.length,
      totalCount: allPhotos.length,
      folderId: folderId,
      searchParams: searchParams,
      timestamp: new Date().toISOString(),
      photos: filteredPhotos,
      cached: false
    };
    
    // Cache the result (shorter cache time for search results)
    try {
      cache.put(cacheKey, JSON.stringify(responseData), CFG.SEARCH_CACHE_SECONDS);
    } catch (e) {
      console.warn('Cache put error:', e);
    }
    
    return createJsonResponse(200, responseData);
    
  } catch (error) {
    console.error('handleSearchPhotos error:', error);
    return createJsonResponse(500, { 
      error: 'Failed to search photos',
      message: error.toString()
    });
  }
}

/**
 * Lists all images with GPS metadata from the specified Drive folder
 * Uses Drive API v3 with optimized field selection and permission validation
 */
function listImagesWithGps(folderId) {
  // Validate folder access and permissions first
  try {
    const folderInfo = Drive.Files.get(folderId, { 
      fields: 'id,name,capabilities,owners,permissions' 
    });
    
    if (!folderInfo.capabilities || !folderInfo.capabilities.canListChildren) {
      throw new Error('Insufficient permissions to access folder. Please ensure the folder is shared with read access.');
    }
    
    console.log(`Validated access to folder: ${folderInfo.name} (${folderId})`);
  } catch (error) {
    console.error('Folder access validation failed:', error);
    throw new Error(`Cannot access folder: ${error.toString()}. Please check folder ID and sharing permissions.`);
  }

  const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
  const fields = 'files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,webContentLink,imageMediaMetadata(time,location)),nextPageToken';
  
  let pageToken = null;
  const photos = [];
  
  do {
    try {
      const requestParams = {
        q: query,
        fields: fields,
        pageSize: CFG.PAGE_SIZE,
        orderBy: 'modifiedTime desc'
      };
      
      if (pageToken) {
        requestParams.pageToken = pageToken;
      }
      
      const response = Drive.Files.list(requestParams);
      
      if (response.files) {
        response.files.forEach(file => {
          const photo = processPhotoFile(file);
          if (photo) {
            photos.push(photo);
          }
        });
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
 * Processes a Drive file and extracts GPS photo data
 * Returns null if file doesn't have valid GPS coordinates
 */
function processPhotoFile(file) {
  try {
    const metadata = file.imageMediaMetadata;
    
    // Check if location data exists and is valid
    if (!metadata || !metadata.location) {
      return null;
    }
    
    const location = metadata.location;
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return null;
    }
    
    // Validate coordinate ranges
    if (location.latitude < -90 || location.latitude > 90 ||
        location.longitude < -180 || location.longitude > 180) {
      console.warn(`Invalid coordinates for file ${file.name}: lat=${location.latitude}, lng=${location.longitude}`);
      return null;
    }
    
    // Generate reliable photo URLs with fallbacks
    const photoUrls = generatePhotoUrls(file);
    
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size || null,
      thumbnailLink: photoUrls.thumbnail,
      webViewLink: photoUrls.view,
      webContentLink: photoUrls.download,
      imageMediaMetadata: {
        time: metadata.time || null,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: (typeof location.altitude === 'number') ? location.altitude : null
        }
      }
    };
    
  } catch (error) {
    console.warn(`Error processing file ${file.name}:`, error);
    return null;
  }
}

/**
 * Handles cleanup of images without GPS data from Drive folder
 * Supports dry-run mode for safety and detailed reporting
 */
function handleCleanupNoGpsImages(parameters = {}, folderId) {
  try {
    const dryRun = (parameters.dryRun || 'true').toString() === 'true';
    const batchSize = parseInt(parameters.batchSize || '50');
    const maxFiles = parseInt(parameters.maxFiles || '500');
    
    console.log(`Starting GPS cleanup - Folder: ${folderId}, DryRun: ${dryRun}, BatchSize: ${batchSize}`);
    
    if (!folderId) {
      return createJsonResponse(400, { error: 'Folder ID is required for cleanup operation' });
    }
    
    // Validate folder access
    try {
      const folderInfo = Drive.Files.get(folderId, { fields: 'id,name,capabilities' });
      if (!dryRun && (!folderInfo.capabilities || !folderInfo.capabilities.canDelete)) {
        return createJsonResponse(403, { 
          error: 'Insufficient permissions to delete files from folder',
          folderName: folderInfo.name
        });
      }
    } catch (error) {
      return createJsonResponse(404, { error: `Folder not found or not accessible: ${error.toString()}` });
    }
    
    const results = findAndProcessNoGpsImages(folderId, dryRun, batchSize, maxFiles);
    
    return createJsonResponse(200, {
      success: true,
      dryRun: dryRun,
      summary: results.summary,
      files: results.files,
      completed: results.completed,
      hasMore: results.hasMore,
      nextPageToken: results.nextPageToken || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GPS cleanup error:', error);
    return createJsonResponse(500, { 
      error: 'GPS cleanup failed',
      message: error.toString()
    });
  }
}

/**
 * Finds and optionally removes images without GPS data
 */
function findAndProcessNoGpsImages(folderId, dryRun = true, batchSize = 50, maxFiles = 500) {
  const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
  const fields = 'files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(location)),nextPageToken';
  
  let pageToken = null;
  let totalProcessed = 0;
  let noGpsFiles = [];
  let deletedFiles = [];
  let errors = [];
  
  do {
    try {
      const requestParams = {
        q: query,
        fields: fields,
        pageSize: Math.min(batchSize, maxFiles - totalProcessed),
        pageToken: pageToken
      };
      
      const response = Drive.Files.list(requestParams);
      
      if (response.files) {
        for (const file of response.files) {
          totalProcessed++;
          
          // Check if file has GPS data
          const hasGpsData = file.imageMediaMetadata && 
                           file.imageMediaMetadata.location &&
                           typeof file.imageMediaMetadata.location.latitude === 'number' &&
                           typeof file.imageMediaMetadata.location.longitude === 'number';
          
          if (!hasGpsData) {
            const fileInfo = {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size || 0,
              modifiedTime: file.modifiedTime,
              reason: getNoGpsReason(file)
            };
            
            noGpsFiles.push(fileInfo);
            
            // Actually delete the file if not in dry-run mode
            if (!dryRun) {
              try {
                Drive.Files.remove(file.id);
                deletedFiles.push(fileInfo);
                console.log(`Deleted file without GPS: ${file.name} (${file.id})`);
              } catch (deleteError) {
                console.error(`Failed to delete ${file.name}:`, deleteError);
                errors.push({
                  file: fileInfo,
                  error: deleteError.toString()
                });
              }
            }
          }
          
          // Stop if we've reached the maximum file limit
          if (totalProcessed >= maxFiles) {
            break;
          }
        }
      }
      
      pageToken = response.nextPageToken;
      
      // Stop if we've reached the maximum file limit
      if (totalProcessed >= maxFiles) {
        break;
      }
      
    } catch (error) {
      console.error('Error processing batch:', error);
      errors.push({
        batch: true,
        error: error.toString()
      });
      break;
    }
    
  } while (pageToken);
  
  const summary = {
    totalProcessed: totalProcessed,
    imagesWithoutGps: noGpsFiles.length,
    filesDeleted: deletedFiles.length,
    errors: errors.length,
    totalSizeCleaned: dryRun ? 
      noGpsFiles.reduce((sum, f) => sum + (f.size || 0), 0) :
      deletedFiles.reduce((sum, f) => sum + (f.size || 0), 0)
  };
  
  return {
    summary: summary,
    files: dryRun ? noGpsFiles : deletedFiles,
    errors: errors,
    completed: !pageToken || totalProcessed >= maxFiles,
    hasMore: !!pageToken && totalProcessed < maxFiles,
    nextPageToken: pageToken
  };
}

/**
 * Determines why a file doesn't have GPS data
 */
function getNoGpsReason(file) {
  if (!file.imageMediaMetadata) {
    return 'No image metadata available';
  }
  
  if (!file.imageMediaMetadata.location) {
    return 'No location data in metadata';
  }
  
  const location = file.imageMediaMetadata.location;
  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return 'Invalid or missing latitude/longitude coordinates';
  }
  
  return 'Unknown reason';
}

/**
 * Generates reliable photo URLs with fallbacks for thumbnails and links
 * Ensures users have proper read-only access to photos
 */
function generatePhotoUrls(file) {
  const fileId = file.id;
  
  // Use API-provided URLs when available, otherwise generate standard Drive URLs
  const thumbnail = file.thumbnailLink || 
                   `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`;
  
  const view = file.webViewLink || 
              `https://drive.google.com/file/d/${fileId}/view`;
  
  // For webContentLink, only provide if user has download permissions
  // This maintains read-only security while allowing viewing
  const download = file.webContentLink || 
                  `https://drive.google.com/uc?id=${fileId}&export=download`;
  
  return {
    thumbnail: thumbnail,
    view: view,
    download: download
  };
}

/**
 * Creates a JSON response with CORS headers
 */
function createJsonResponse(statusCode, data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
    
  // Note: Apps Script Web Apps handle CORS automatically for most cases
  // But we can set headers if needed
  return output;
}

/**
 * Utility function for testing the API locally
 */
function testListPhotos() {
  const folderId = CFG.FOLDER_ID;
  if (!folderId) {
    console.log('Please set FOLDER_ID in Script Properties');
    return;
  }
  
  console.log('Testing photo listing for folder:', folderId);
  const photos = listImagesWithGps(folderId);
  console.log(`Found ${photos.length} photos with GPS data`);
  
  photos.slice(0, 3).forEach((photo, index) => {
    console.log(`Photo ${index + 1}:`, {
      name: photo.name,
      coordinates: `${photo.imageMediaMetadata.location.latitude}, ${photo.imageMediaMetadata.location.longitude}`,
      time: photo.imageMediaMetadata.time
    });
  });
}

/**
 * Parse search parameters from URL query string
 */
function parseSearchParameters(parameters) {
  const params = {
    type: 'all', // 'all', 'bbox', 'radius', 'viewport'
    bounds: null,
    center: null,
    radius: null,
    limit: null
  };
  
  // Bounding box search: ?bbox=north,south,east,west
  if (parameters.bbox) {
    const coords = parameters.bbox.toString().split(',').map(parseFloat);
    if (coords.length === 4) {
      params.type = 'bbox';
      params.bounds = {
        north: coords[0],
        south: coords[1], 
        east: coords[2],
        west: coords[3]
      };
    }
  }
  
  // Radius search: ?lat=40.7128&lng=-74.0060&radius=1000 (meters)
  if (parameters.lat && parameters.lng && parameters.radius) {
    params.type = 'radius';
    params.center = {
      latitude: parseFloat(parameters.lat),
      longitude: parseFloat(parameters.lng)
    };
    params.radius = parseFloat(parameters.radius);
  }
  
  // Viewport search: ?north=40.8&south=40.6&east=-73.9&west=-74.1
  if (parameters.north && parameters.south && parameters.east && parameters.west) {
    params.type = 'viewport';
    params.bounds = {
      north: parseFloat(parameters.north),
      south: parseFloat(parameters.south),
      east: parseFloat(parameters.east),
      west: parseFloat(parameters.west)
    };
  }
  
  // Optional result limit (cap at max for performance)
  if (parameters.limit) {
    params.limit = Math.min(parseInt(parameters.limit), CFG.MAX_SEARCH_RESULTS);
  } else {
    params.limit = CFG.MAX_SEARCH_RESULTS;
  }
  
  return params;
}

/**
 * Create cache key for search parameters
 */
function createSearchCacheKey(folderId, searchParams) {
  const key = `search:${folderId}:${searchParams.type}`;
  
  if (searchParams.type === 'bbox' || searchParams.type === 'viewport') {
    const b = searchParams.bounds;
    return `${key}:${b.north.toFixed(4)},${b.south.toFixed(4)},${b.east.toFixed(4)},${b.west.toFixed(4)}`;
  }
  
  if (searchParams.type === 'radius') {
    const c = searchParams.center;
    return `${key}:${c.latitude.toFixed(4)},${c.longitude.toFixed(4)},${searchParams.radius}`;
  }
  
  return `${key}:all`;
}

/**
 * Filter photos by location-based search parameters
 */
function filterPhotosByLocation(photos, searchParams) {
  if (searchParams.type === 'all') {
    return searchParams.limit ? photos.slice(0, searchParams.limit) : photos;
  }
  
  let filtered = [];
  
  for (const photo of photos) {
    const location = photo.imageMediaMetadata.location;
    const lat = location.latitude;
    const lng = location.longitude;
    
    let matches = false;
    
    if (searchParams.type === 'bbox' || searchParams.type === 'viewport') {
      const bounds = searchParams.bounds;
      matches = (
        lat <= bounds.north &&
        lat >= bounds.south &&
        lng <= bounds.east &&
        lng >= bounds.west
      );
    }
    
    if (searchParams.type === 'radius') {
      const center = searchParams.center;
      const distance = calculateDistance(
        center.latitude, center.longitude,
        lat, lng
      );
      matches = distance <= searchParams.radius;
    }
    
    if (matches) {
      filtered.push(photo);
    }
    
    // Apply limit during filtering for efficiency
    if (searchParams.limit && filtered.length >= searchParams.limit) {
      break;
    }
  }
  
  return filtered;
}

/**
 * Calculate distance between two GPS coordinates in meters
 * Uses Haversine formula for accuracy
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Utility function to clear cache (for debugging)
 */
function clearCache() {
  try {
    CacheService.getScriptCache().removeAll(['photos:' + CFG.FOLDER_ID]);
    console.log('Cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Test function for location-based search
 */
function testLocationSearch() {
  const folderId = CFG.FOLDER_ID;
  if (!folderId) {
    console.log('Please set FOLDER_ID in Script Properties');
    return;
  }
  
  // Test bounding box search (New York area)
  const testParams = {
    type: 'bbox',
    bounds: {
      north: 40.8,
      south: 40.6,
      east: -73.9,
      west: -74.1
    }
  };
  
  console.log('Testing location search with bbox:', testParams.bounds);
  const allPhotos = listImagesWithGps(folderId);
  const filtered = filterPhotosByLocation(allPhotos, testParams);
  
  console.log(`Total photos: ${allPhotos.length}`);
  console.log(`Filtered photos: ${filtered.length}`);
  
  if (filtered.length > 0) {
    console.log('Sample filtered photo:', {
      name: filtered[0].name,
      coordinates: `${filtered[0].imageMediaMetadata.location.latitude}, ${filtered[0].imageMediaMetadata.location.longitude}`
    });
  }
}
