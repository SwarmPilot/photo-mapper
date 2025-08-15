/**
 * Gmail to Drive Photo Ingestion Helper
 * 
 * This script automatically processes Gmail messages with photo attachments
 * and saves them to a Google Drive folder for the Photo Mapper app.
 * 
 * Setup Instructions:
 * 1. Create a Gmail filter to label relevant messages (e.g., "photos-to-map")
 * 2. Set the GMAIL_LABEL and TARGET_FOLDER_ID in the configuration below
 * 3. Set up a time-based trigger to run processPhotoEmails() every 5-15 minutes
 */

// Configuration for Gmail ingestion
const GMAIL_CONFIG = {
  // Gmail label to search for (create this label and set up a filter)
  GMAIL_LABEL: 'photos-to-map',
  
  // Alternative: use a search query instead of label
  //GMAIL_SEARCH: 'has:attachment filename:jpg OR filename:jpeg OR filename:png OR filename:heic',
  
  // Drive folder ID where photos should be saved
  TARGET_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('FOLDER_ID') || '',
  
  // Maximum number of messages to process per run (to avoid timeout)
  MAX_MESSAGES_PER_RUN: 10,
  
  // Supported image MIME types
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  
  // Maximum file size to process (in bytes) - 25MB limit for Drive API
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  
  // Label to apply after processing (optional)
  PROCESSED_LABEL: 'photos-processed'
};

/**
 * Main function to process photo emails
 * Set this up as a time-based trigger (every 5-15 minutes)
 */
function processPhotoEmails() {
  try {
    console.log('Starting photo email processing...');
    
    if (!GMAIL_CONFIG.TARGET_FOLDER_ID) {
      throw new Error('TARGET_FOLDER_ID not configured. Please set FOLDER_ID in Script Properties.');
    }
    
    // Get target folder
    const folder = DriveApp.getFolderById(GMAIL_CONFIG.TARGET_FOLDER_ID);
    console.log(`Target folder: ${folder.getName()}`);
    
    // Search for unprocessed messages
    const messages = findUnprocessedMessages();
    console.log(`Found ${messages.length} messages to process`);
    
    if (messages.length === 0) {
      console.log('No new messages to process');
      return;
    }
    
    let processedCount = 0;
    let savedCount = 0;
    
    for (const message of messages.slice(0, GMAIL_CONFIG.MAX_MESSAGES_PER_RUN)) {
      try {
        const result = processMessage(message, folder);
        processedCount++;
        savedCount += result.savedAttachments;
        
        // Mark message as processed
        markMessageAsProcessed(message);
        
        console.log(`Processed message "${message.getSubject()}" - saved ${result.savedAttachments} photos`);
        
      } catch (error) {
        console.error(`Error processing message "${message.getSubject()}":`, error);
        // Continue with next message
      }
    }
    
    console.log(`Processing complete. Processed ${processedCount} messages, saved ${savedCount} photos.`);
    
  } catch (error) {
    console.error('Error in processPhotoEmails:', error);
    throw error;
  }
}

/**
 * Find messages that haven't been processed yet
 */
function findUnprocessedMessages() {
  try {
    let searchQuery;
    
    if (GMAIL_CONFIG.GMAIL_LABEL) {
      // Search by label
      searchQuery = `label:${GMAIL_CONFIG.GMAIL_LABEL}`;
      
      // Exclude already processed messages if processed label exists
      if (GMAIL_CONFIG.PROCESSED_LABEL) {
        searchQuery += ` -label:${GMAIL_CONFIG.PROCESSED_LABEL}`;
      }
    } else if (GMAIL_CONFIG.GMAIL_SEARCH) {
      // Use custom search query
      searchQuery = GMAIL_CONFIG.GMAIL_SEARCH;
    } else {
      throw new Error('Either GMAIL_LABEL or GMAIL_SEARCH must be configured');
    }
    
    // Add attachment and unread filters
    searchQuery += ' has:attachment';
    
    console.log(`Gmail search query: ${searchQuery}`);
    
    const threads = GmailApp.search(searchQuery, 0, GMAIL_CONFIG.MAX_MESSAGES_PER_RUN);
    const messages = [];
    
    threads.forEach(thread => {
      thread.getMessages().forEach(message => {
        if (message.getAttachments().length > 0) {
          messages.push(message);
        }
      });
    });
    
    return messages;
    
  } catch (error) {
    console.error('Error finding messages:', error);
    throw error;
  }
}

/**
 * Process a single Gmail message and save photo attachments
 */
function processMessage(message, targetFolder) {
  const attachments = message.getAttachments();
  let savedAttachments = 0;
  
  for (const attachment of attachments) {
    try {
      if (isImageAttachment(attachment)) {
        const fileName = generateFileName(attachment, message);
        
        // Check file size
        if (attachment.getSize() > GMAIL_CONFIG.MAX_FILE_SIZE) {
          console.warn(`Skipping large file: ${fileName} (${attachment.getSize()} bytes)`);
          continue;
        }
        
        // Save to Drive
        const file = targetFolder.createFile(attachment.copyBlob().setName(fileName));
        savedAttachments++;
        
        console.log(`Saved: ${fileName} (${attachment.getSize()} bytes)`);
        
      } else {
        console.log(`Skipping non-image attachment: ${attachment.getName()}`);
      }
      
    } catch (error) {
      console.error(`Error processing attachment ${attachment.getName()}:`, error);
      // Continue with next attachment
    }
  }
  
  return { savedAttachments };
}

/**
 * Check if an attachment is a supported image type
 */
function isImageAttachment(attachment) {
  const contentType = attachment.getContentType().toLowerCase();
  return GMAIL_CONFIG.SUPPORTED_IMAGE_TYPES.includes(contentType);
}

/**
 * Generate a unique filename for the attachment
 */
function generateFileName(attachment, message) {
  const originalName = attachment.getName();
  const timestamp = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const sender = message.getFrom().replace(/[<>]/g, '').replace(/[@.]/g, '_');
  
  // Extract file extension
  const extension = originalName.split('.').pop() || 'jpg';
  
  // Create filename with timestamp and sender info
  const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  
  return `${timestamp}_${safeName}_${sender.substring(0, 20)}.${extension}`;
}

/**
 * Mark a message as processed
 */
function markMessageAsProcessed(message) {
  try {
    // Apply processed label if configured
    if (GMAIL_CONFIG.PROCESSED_LABEL) {
      const label = GmailApp.getUserLabelByName(GMAIL_CONFIG.PROCESSED_LABEL) || 
                   GmailApp.createLabel(GMAIL_CONFIG.PROCESSED_LABEL);
      message.getThread().addLabel(label);
    }
    
    // Mark as read
    message.markRead();
    
  } catch (error) {
    console.error('Error marking message as processed:', error);
  }
}

/**
 * Setup function to create necessary labels and configure the system
 */
function setupGmailIngestion() {
  try {
    console.log('Setting up Gmail ingestion...');
    
    // Create labels if they don't exist
    if (GMAIL_CONFIG.GMAIL_LABEL) {
      const mainLabel = GmailApp.getUserLabelByName(GMAIL_CONFIG.GMAIL_LABEL) || 
                       GmailApp.createLabel(GMAIL_CONFIG.GMAIL_LABEL);
      console.log(`Main label ready: ${mainLabel.getName()}`);
    }
    
    if (GMAIL_CONFIG.PROCESSED_LABEL) {
      const processedLabel = GmailApp.getUserLabelByName(GMAIL_CONFIG.PROCESSED_LABEL) || 
                            GmailApp.createLabel(GMAIL_CONFIG.PROCESSED_LABEL);
      console.log(`Processed label ready: ${processedLabel.getName()}`);
    }
    
    // Verify Drive folder access
    if (GMAIL_CONFIG.TARGET_FOLDER_ID) {
      const folder = DriveApp.getFolderById(GMAIL_CONFIG.TARGET_FOLDER_ID);
      console.log(`Target folder verified: ${folder.getName()}`);
    } else {
      console.warn('TARGET_FOLDER_ID not configured');
    }
    
    console.log('Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Create a Gmail filter to apply the label to incoming photo emails');
    console.log('2. Set up a time-based trigger for processPhotoEmails()');
    console.log('3. Test with a few messages');
    
  } catch (error) {
    console.error('Setup error:', error);
    throw error;
  }
}

/**
 * Create a time-based trigger for automatic processing
 * Run this once to set up the trigger, then delete it
 */
function createTrigger() {
  try {
    // Delete existing triggers for this function
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processPhotoEmails') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger - runs every 5 minutes
    ScriptApp.newTrigger('processPhotoEmails')
             .timeBased()
             .everyMinutes(5)
             .create();
             
    console.log('Trigger created successfully');
    
  } catch (error) {
    console.error('Error creating trigger:', error);
    throw error;
  }
}

/**
 * Test function to process a single message by subject
 */
function testProcessMessage() {
  try {
    // Find a test message (modify the search as needed)
    const threads = GmailApp.search('has:attachment subject:"test photo"', 0, 1);
    
    if (threads.length === 0) {
      console.log('No test messages found');
      return;
    }
    
    const message = threads[0].getMessages()[0];
    const folder = DriveApp.getFolderById(GMAIL_CONFIG.TARGET_FOLDER_ID);
    
    console.log(`Testing with message: "${message.getSubject()}"`);
    const result = processMessage(message, folder);
    console.log(`Test result: saved ${result.savedAttachments} attachments`);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}
