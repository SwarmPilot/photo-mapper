/**
 * Photo Categorization System
 * Automatically categorizes photos using AI analysis, location context, and metadata
 */

/**
 * Main categorization configuration
 */
const CATEGORY_CONFIG = {
  // Enable/disable different categorization methods
  enableVisionAPI: true,
  enableLocationContext: true,
  enableMetadataAnalysis: true,
  enableTimeAnalysis: true,
  
  // Confidence thresholds
  minimumConfidence: 0.6,
  highConfidenceThreshold: 0.8,
  
  // Category definitions with keywords and patterns
  categories: {
    // Nature & Landscape
    'nature': {
      name: 'Nature & Landscape',
      keywords: ['mountain', 'forest', 'tree', 'lake', 'river', 'beach', 'ocean', 'sunset', 'sunrise', 'sky', 'cloud'],
      visionLabels: ['landscape', 'nature', 'mountain', 'forest', 'water', 'sky', 'tree', 'plant'],
      color: '#22c55e',
      icon: '🌿'
    },
    'urban': {
      name: 'Urban & Architecture',
      keywords: ['building', 'city', 'street', 'bridge', 'tower', 'skyscraper', 'architecture'],
      visionLabels: ['building', 'architecture', 'city', 'urban', 'street', 'bridge', 'tower'],
      color: '#6366f1',
      icon: '🏙️'
    },
    'people': {
      name: 'People & Portraits',
      keywords: ['person', 'people', 'portrait', 'face', 'family', 'group'],
      visionLabels: ['person', 'human', 'face', 'people', 'crowd', 'portrait'],
      color: '#f59e0b',
      icon: '👥'
    },
    'food': {
      name: 'Food & Dining',
      keywords: ['food', 'restaurant', 'meal', 'drink', 'coffee', 'dinner', 'lunch'],
      visionLabels: ['food', 'meal', 'restaurant', 'drink', 'cuisine', 'dish'],
      color: '#ef4444',
      icon: '🍽️'
    },
    'transportation': {
      name: 'Transportation',
      keywords: ['car', 'train', 'plane', 'boat', 'bus', 'vehicle', 'transportation'],
      visionLabels: ['vehicle', 'car', 'train', 'aircraft', 'boat', 'transportation'],
      color: '#8b5cf6',
      icon: '🚗'
    },
    'events': {
      name: 'Events & Celebrations',
      keywords: ['party', 'wedding', 'celebration', 'festival', 'concert', 'ceremony'],
      visionLabels: ['celebration', 'party', 'ceremony', 'festival', 'event'],
      color: '#ec4899',
      icon: '🎉'
    },
    'animals': {
      name: 'Animals & Wildlife',
      keywords: ['animal', 'dog', 'cat', 'bird', 'wildlife', 'pet'],
      visionLabels: ['animal', 'mammal', 'bird', 'wildlife', 'pet', 'dog', 'cat'],
      color: '#84cc16',
      icon: '🐾'
    },
    'indoor': {
      name: 'Indoor & Interiors',
      keywords: ['room', 'interior', 'home', 'office', 'indoor'],
      visionLabels: ['room', 'interior', 'furniture', 'indoor', 'home'],
      color: '#06b6d4',
      icon: '🏠'
    },
    'sports': {
      name: 'Sports & Recreation',
      keywords: ['sport', 'game', 'recreation', 'fitness', 'exercise'],
      visionLabels: ['sport', 'recreation', 'game', 'fitness', 'athletic'],
      color: '#f97316',
      icon: '⚽'
    },
    'travel': {
      name: 'Travel & Tourism',
      keywords: ['travel', 'vacation', 'tourism', 'trip', 'holiday', 'tourist'],
      visionLabels: ['tourism', 'travel', 'landmark', 'monument'],
      color: '#14b8a6',
      icon: '✈️'
    }
  },
  
  // Time-based categorization
  timeCategories: {
    'morning': { start: 5, end: 11, name: 'Morning', icon: '🌅' },
    'afternoon': { start: 11, end: 17, name: 'Afternoon', icon: '☀️' },
    'evening': { start: 17, end: 21, name: 'Evening', icon: '🌆' },
    'night': { start: 21, end: 5, name: 'Night', icon: '🌙' }
  },
  
  // Season categorization (Northern Hemisphere)
  seasonCategories: {
    'spring': { months: [3, 4, 5], name: 'Spring', icon: '🌸' },
    'summer': { months: [6, 7, 8], name: 'Summer', icon: '☀️' },
    'autumn': { months: [9, 10, 11], name: 'Autumn', icon: '🍂' },
    'winter': { months: [12, 1, 2], name: 'Winter', icon: '❄️' }
  }
};

/**
 * Categorizes a single photo using multiple analysis methods
 */
async function categorizePhoto(photoData) {
  try {
    console.log(`Categorizing photo: ${photoData.name}`);
    
    const categories = {
      primary: [],
      secondary: [],
      time: null,
      season: null,
      confidence: {}
    };
    
    // 1. Vision API Analysis (if enabled and thumbnail available)
    if (CATEGORY_CONFIG.enableVisionAPI && photoData.thumbnailLink) {
      const visionCategories = await analyzePhotoWithVision(photoData);
      categories.primary.push(...visionCategories.primary);
      categories.secondary.push(...visionCategories.secondary);
      Object.assign(categories.confidence, visionCategories.confidence);
    }
    
    // 2. Metadata Analysis
    if (CATEGORY_CONFIG.enableMetadataAnalysis) {
      const metadataCategories = analyzePhotoMetadata(photoData);
      categories.primary.push(...metadataCategories.primary);
      categories.secondary.push(...metadataCategories.secondary);
      Object.assign(categories.confidence, metadataCategories.confidence);
    }
    
    // 3. Location Context Analysis
    if (CATEGORY_CONFIG.enableLocationContext && photoData.imageMediaMetadata?.location) {
      const locationCategories = await analyzeLocationContext(photoData);
      categories.primary.push(...locationCategories.primary);
      categories.secondary.push(...locationCategories.secondary);
      Object.assign(categories.confidence, locationCategories.confidence);
    }
    
    // 4. Time-based Analysis
    if (CATEGORY_CONFIG.enableTimeAnalysis) {
      const timeCategories = analyzePhotoTiming(photoData);
      categories.time = timeCategories.time;
      categories.season = timeCategories.season;
    }
    
    // 5. Consolidate and rank categories
    const finalCategories = consolidateCategories(categories);
    
    console.log(`Photo categorized as: ${finalCategories.primary.join(', ')}`);
    return finalCategories;
    
  } catch (error) {
    console.error(`Error categorizing photo ${photoData.name}:`, error);
    return {
      primary: ['uncategorized'],
      secondary: [],
      time: null,
      season: null,
      confidence: { uncategorized: 0.1 },
      error: error.toString()
    };
  }
}

/**
 * Analyzes photo using Google Vision API
 */
async function analyzePhotoWithVision(photoData) {
  try {
    // Note: This is a simplified implementation
    // In production, you'd call the actual Vision API
    const categories = { primary: [], secondary: [], confidence: {} };
    
    // For now, we'll simulate Vision API based on filename and metadata
    // TODO: Implement actual Google Vision API integration
    const fileName = photoData.name.toLowerCase();
    
    // Simulate vision analysis based on filename patterns
    for (const [categoryId, categoryInfo] of Object.entries(CATEGORY_CONFIG.categories)) {
      let confidence = 0;
      
      // Check filename for category keywords
      for (const keyword of categoryInfo.keywords) {
        if (fileName.includes(keyword.toLowerCase())) {
          confidence += 0.3;
        }
      }
      
      // Add some randomization to simulate AI confidence
      confidence += Math.random() * 0.4;
      
      if (confidence >= CATEGORY_CONFIG.minimumConfidence) {
        if (confidence >= CATEGORY_CONFIG.highConfidenceThreshold) {
          categories.primary.push(categoryId);
        } else {
          categories.secondary.push(categoryId);
        }
        categories.confidence[categoryId] = Math.min(confidence, 1.0);
      }
    }
    
    return categories;
    
  } catch (error) {
    console.error('Vision API analysis failed:', error);
    return { primary: [], secondary: [], confidence: {} };
  }
}

/**
 * Analyzes photo metadata for categorization clues
 */
function analyzePhotoMetadata(photoData) {
  const categories = { primary: [], secondary: [], confidence: {} };
  
  try {
    const fileName = photoData.name.toLowerCase();
    const mimeType = photoData.mimeType || '';
    
    // Analyze filename for category indicators
    for (const [categoryId, categoryInfo] of Object.entries(CATEGORY_CONFIG.categories)) {
      let confidence = 0;
      
      // Check filename for category keywords
      for (const keyword of categoryInfo.keywords) {
        if (fileName.includes(keyword.toLowerCase())) {
          confidence += 0.4;
        }
      }
      
      // Additional metadata analysis
      if (photoData.imageMediaMetadata) {
        // Check camera settings for indoor/outdoor detection
        if (categoryId === 'indoor' && photoData.imageMediaMetadata.flashUsed) {
          confidence += 0.2;
        }
        
        if (categoryId === 'nature' && !photoData.imageMediaMetadata.flashUsed) {
          confidence += 0.1;
        }
      }
      
      if (confidence >= CATEGORY_CONFIG.minimumConfidence) {
        if (confidence >= CATEGORY_CONFIG.highConfidenceThreshold) {
          categories.primary.push(categoryId);
        } else {
          categories.secondary.push(categoryId);
        }
        categories.confidence[categoryId] = Math.min(confidence, 1.0);
      }
    }
    
    return categories;
    
  } catch (error) {
    console.error('Metadata analysis failed:', error);
    return { primary: [], secondary: [], confidence: {} };
  }
}

/**
 * Analyzes location context for categorization
 */
async function analyzeLocationContext(photoData) {
  const categories = { primary: [], secondary: [], confidence: {} };
  
  try {
    const location = photoData.imageMediaMetadata.location;
    if (!location || !location.latitude || !location.longitude) {
      return categories;
    }
    
    // Use reverse geocoding to get location context
    // Note: This is simplified - in production, use Google Maps Geocoding API
    const locationContext = await getLocationContext(location.latitude, location.longitude);
    
    if (locationContext) {
      // Analyze location types
      if (locationContext.types) {
        for (const type of locationContext.types) {
          const categoryMatch = mapLocationTypeToCategory(type);
          if (categoryMatch) {
            categories.primary.push(categoryMatch);
            categories.confidence[categoryMatch] = 0.7;
          }
        }
      }
      
      // Analyze place name for context
      if (locationContext.placeName) {
        const placeName = locationContext.placeName.toLowerCase();
        
        for (const [categoryId, categoryInfo] of Object.entries(CATEGORY_CONFIG.categories)) {
          for (const keyword of categoryInfo.keywords) {
            if (placeName.includes(keyword.toLowerCase())) {
              categories.secondary.push(categoryId);
              categories.confidence[categoryId] = 0.6;
            }
          }
        }
      }
    }
    
    return categories;
    
  } catch (error) {
    console.error('Location context analysis failed:', error);
    return { primary: [], secondary: [], confidence: {} };
  }
}

/**
 * Analyzes photo timing for time and season categorization
 */
function analyzePhotoTiming(photoData) {
  try {
    const photoTime = photoData.imageMediaMetadata?.time || photoData.modifiedTime;
    if (!photoTime) {
      return { time: null, season: null };
    }
    
    const date = new Date(photoTime);
    const hour = date.getHours();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    
    // Determine time of day
    let timeCategory = null;
    for (const [timeId, timeInfo] of Object.entries(CATEGORY_CONFIG.timeCategories)) {
      if (timeInfo.start <= timeInfo.end) {
        // Normal range (e.g., 5-11 for morning)
        if (hour >= timeInfo.start && hour < timeInfo.end) {
          timeCategory = timeId;
          break;
        }
      } else {
        // Wraparound range (e.g., 21-5 for night)
        if (hour >= timeInfo.start || hour < timeInfo.end) {
          timeCategory = timeId;
          break;
        }
      }
    }
    
    // Determine season
    let seasonCategory = null;
    for (const [seasonId, seasonInfo] of Object.entries(CATEGORY_CONFIG.seasonCategories)) {
      if (seasonInfo.months.includes(month)) {
        seasonCategory = seasonId;
        break;
      }
    }
    
    return { time: timeCategory, season: seasonCategory };
    
  } catch (error) {
    console.error('Timing analysis failed:', error);
    return { time: null, season: null };
  }
}

/**
 * Consolidates multiple categorization results into final categories
 */
function consolidateCategories(categories) {
  // Remove duplicates and sort by confidence
  const allPrimary = [...new Set(categories.primary)];
  const allSecondary = [...new Set(categories.secondary.filter(cat => !allPrimary.includes(cat)))];
  
  // Sort by confidence scores
  allPrimary.sort((a, b) => (categories.confidence[b] || 0) - (categories.confidence[a] || 0));
  allSecondary.sort((a, b) => (categories.confidence[b] || 0) - (categories.confidence[a] || 0));
  
  // Limit to top categories
  const finalPrimary = allPrimary.slice(0, 3);
  const finalSecondary = allSecondary.slice(0, 5);
  
  // If no primary categories found, add 'uncategorized'
  if (finalPrimary.length === 0) {
    finalPrimary.push('uncategorized');
    categories.confidence.uncategorized = 0.1;
  }
  
  return {
    primary: finalPrimary,
    secondary: finalSecondary,
    time: categories.time,
    season: categories.season,
    confidence: categories.confidence
  };
}

/**
 * Gets location context using reverse geocoding
 */
async function getLocationContext(latitude, longitude) {
  try {
    // Simplified location context - in production, use Google Maps API
    // For now, return basic context based on coordinates
    
    // Basic geographic classification
    const isUrban = Math.abs(latitude) < 60 && Math.abs(longitude) < 120; // Simplified urban detection
    const isCoastal = false; // Would need actual coastline data
    
    return {
      types: isUrban ? ['urban', 'populated_place'] : ['natural', 'rural'],
      placeName: `Location ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
      isUrban: isUrban,
      isCoastal: isCoastal
    };
    
  } catch (error) {
    console.error('Location context lookup failed:', error);
    return null;
  }
}

/**
 * Maps Google Places API location types to our categories
 */
function mapLocationTypeToCategory(locationType) {
  const typeMapping = {
    'natural_feature': 'nature',
    'park': 'nature',
    'tourist_attraction': 'travel',
    'restaurant': 'food',
    'establishment': 'urban',
    'point_of_interest': 'travel',
    'locality': 'urban',
    'administrative_area': 'urban'
  };
  
  return typeMapping[locationType] || null;
}

/**
 * Batch categorizes multiple photos
 */
async function batchCategorizePhotos(photos, progressCallback = null) {
  const results = [];
  const batchSize = 10; // Process 10 photos at a time
  
  for (let i = 0; i < photos.length; i += batchSize) {
    const batch = photos.slice(i, i + batchSize);
    
    console.log(`Processing categorization batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(photos.length/batchSize)}`);
    
    for (const photo of batch) {
      try {
        const categories = await categorizePhoto(photo);
        results.push({
          photoId: photo.id,
          photoName: photo.name,
          categories: categories,
          processed: new Date().toISOString()
        });
        
        // Progress callback for UI updates
        if (progressCallback) {
          progressCallback(results.length, photos.length);
        }
        
        // Small delay to avoid API rate limits
        Utilities.sleep(100);
        
      } catch (error) {
        console.error(`Failed to categorize photo ${photo.name}:`, error);
        results.push({
          photoId: photo.id,
          photoName: photo.name,
          categories: { primary: ['uncategorized'], secondary: [], confidence: { uncategorized: 0.1 } },
          error: error.toString(),
          processed: new Date().toISOString()
        });
      }
    }
    
    // Longer pause between batches
    if (i + batchSize < photos.length) {
      Utilities.sleep(500);
    }
  }
  
  return results;
}

/**
 * Gets category information by ID
 */
function getCategoryInfo(categoryId) {
  if (categoryId === 'uncategorized') {
    return {
      name: 'Uncategorized',
      icon: '❓',
      color: '#6b7280'
    };
  }
  
  return CATEGORY_CONFIG.categories[categoryId] || {
    name: categoryId,
    icon: '📷',
    color: '#6b7280'
  };
}

/**
 * Gets all available categories for filtering
 */
function getAllCategories() {
  const categories = {};
  
  // Add main categories
  for (const [id, info] of Object.entries(CATEGORY_CONFIG.categories)) {
    categories[id] = {
      id: id,
      name: info.name,
      icon: info.icon,
      color: info.color,
      type: 'content'
    };
  }
  
  // Add time categories
  for (const [id, info] of Object.entries(CATEGORY_CONFIG.timeCategories)) {
    categories[`time_${id}`] = {
      id: `time_${id}`,
      name: info.name,
      icon: info.icon,
      color: '#64748b',
      type: 'time'
    };
  }
  
  // Add season categories
  for (const [id, info] of Object.entries(CATEGORY_CONFIG.seasonCategories)) {
    categories[`season_${id}`] = {
      id: `season_${id}`,
      name: info.name,
      icon: info.icon,
      color: '#64748b',
      type: 'season'
    };
  }
  
  // Add uncategorized
  categories.uncategorized = {
    id: 'uncategorized',
    name: 'Uncategorized',
    icon: '❓',
    color: '#6b7280',
    type: 'content'
  };
  
  return categories;
}
