// Content Script for Transcription System Cookie Extension
// Automatically detects cookie errors and handles cookie export

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Domains to monitor
    ALLOWED_ORIGINS: [
      'http://localhost:3002',
      'https://localhost:3002',
      'https://ylbh.co.il',
      'http://ylbh.co.il'
    ],
    // Check interval for error detection
    CHECK_INTERVAL: 2000,
    // Debounce time for auto-export
    DEBOUNCE_TIME: 3000
  };

  // State management
  let isProcessing = false;
  let lastErrorDetected = null;
  let checkInterval = null;
  let extensionId = chrome.runtime.id;

  console.log('[Cookie Extension] Content script loaded on:', window.location.href);
  
  // Immediately announce extension presence
  window.postMessage({
    type: 'COOKIE_EXTENSION_READY',
    extensionId: chrome.runtime.id || 'cookie-helper',
    version: '2.0.0'
  }, '*');

  // Check if we're on a transcription system page
  function isTranscriptionSystem() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === 'ylbh.co.il' || 
           hostname.includes('transcription');
  }

  // Detect cookie-related errors in the DOM
  function detectCookieError() {
    // Look for specific error indicators
    const errorIndicators = [
      'סרטון מוגן - נדרש קובץ Cookies',
      'Cookie', 
      'protected',
      'bot detection',
      'private',
      'member',
      'authentication required',
      'נכשל'
    ];

    // Check for error messages in various elements
    const selectors = [
      '.media-error',
      '.error-message',
      '.status-failed',
      '[class*="error"]',
      '[class*="cookie"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent || '';
        for (const indicator of errorIndicators) {
          if (text.toLowerCase().includes(indicator.toLowerCase())) {
            // Also check if there's a batch ID nearby
            const modal = element.closest('.download-progress-modal');
            if (modal) {
              return {
                detected: true,
                element: element,
                modal: modal,
                errorText: text
              };
            }
          }
        }
      }
    }

    return { detected: false };
  }

  // Extract batch ID from the page
  function extractBatchId() {
    // Try to find batch ID from various sources
    
    // Method 1: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const batchId = urlParams.get('batchId');
    if (batchId) {
      console.log('[Cookie Extension] Found batchId in URL:', batchId);
      return batchId;
    }

    // Method 2: Check data attributes on modal
    const modalElement = document.querySelector('.download-progress-modal[data-batch-id]');
    if (modalElement) {
      const batchId = modalElement.getAttribute('data-batch-id');
      console.log('[Cookie Extension] Found batchId in modal:', batchId);
      return batchId;
    }

    // Method 3: Try to find it in any data attribute
    const anyBatchElement = document.querySelector('[data-batch-id]');
    if (anyBatchElement) {
      const batchId = anyBatchElement.getAttribute('data-batch-id');
      console.log('[Cookie Extension] Found batchId in element:', batchId);
      return batchId;
    }
    
    console.warn('[Cookie Extension] Could not find batchId');
    return null;
  }

  // Extract media index from error context
  function extractMediaIndex(errorElement) {
    // Try to find the media index from the error element's context
    const mediaItem = errorElement.closest('.media-item');
    if (mediaItem) {
      // Look for index in data attributes
      const indexAttr = mediaItem.getAttribute('data-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr);
        console.log('[Cookie Extension] Found mediaIndex from data-index:', index);
        return index;
      }
      
      // Try to extract from media name
      const mediaName = mediaItem.querySelector('.media-name');
      if (mediaName) {
        const match = mediaName.textContent.match(/(\d+)/);
        if (match) {
          const index = parseInt(match[1]) - 1; // Convert to 0-based index
          console.log('[Cookie Extension] Found mediaIndex from media name:', index);
          return index;
        }
      }
    }
    
    console.warn('[Cookie Extension] Could not determine mediaIndex, defaulting to 0');
    return 0; // Default to first media if can't determine
  }

  // Send message to background script
  async function sendToBackground(action, data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: action,
        data: data,
        origin: window.location.origin
      }, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Automatically handle cookie export and upload
  async function handleAutomaticCookieExport(errorInfo) {
    if (isProcessing) {
      console.log('[Cookie Extension] Already processing, skipping...');
      return;
    }

    isProcessing = true;
    
    try {
      console.log('[Cookie Extension] Detected cookie error, initiating automatic export...');
      
      // Show user notification
      showNotification('מזהה בעיית Cookies, מטפל אוטומטית...', 'info');

      // Step 1: Extract batchId and mediaIndex
      const batchId = extractBatchId();
      const mediaIndex = extractMediaIndex(errorInfo.element);
      
      if (!batchId) {
        throw new Error('Could not find batch ID. Please refresh the page and try again.');
      }
      
      console.log('[Cookie Extension] Extracted values - batchId:', batchId, 'mediaIndex:', mediaIndex);

      // Step 2: Export YouTube cookies
      const exportResult = await sendToBackground('EXPORT_YOUTUBE_COOKIES', {
        batchId: batchId,
        mediaIndex: mediaIndex
      });

      if (!exportResult.success) {
        throw new Error(exportResult.error || 'Failed to export cookies');
      }

      console.log('[Cookie Extension] Cookies exported successfully:', exportResult.data);

      // Step 3: Send cookies to backend
      const uploadResult = await uploadCookiesToBackend(
        exportResult.data.cookies,
        batchId,  // Use the extracted batchId directly
        mediaIndex  // Use the extracted mediaIndex directly
      );

      if (uploadResult.success) {
        showNotification('Cookies הועלו בהצלחה! מנסה שוב...', 'success');
        
        // Trigger page refresh or retry mechanism
        setTimeout(() => {
          triggerRetry(uploadResult.batchId, uploadResult.mediaIndex);
        }, 1000);
      } else {
        throw new Error(uploadResult.error || 'Failed to upload cookies');
      }

    } catch (error) {
      console.error('[Cookie Extension] Error in automatic handling:', error);
      showNotification('שגיאה בטיפול אוטומטי: ' + error.message, 'error');
      
      // Fall back to manual mode
      showManualUploadOption();
    } finally {
      isProcessing = false;
      
      // Reset after some time
      setTimeout(() => {
        lastErrorDetected = null;
      }, 30000); // Reset after 30 seconds
    }
  }

  // Upload cookies to backend
  async function uploadCookiesToBackend(cookies, batchId, mediaIndex) {
    try {
      // Validate parameters
      if (!batchId) {
        throw new Error('batchId is required for upload');
      }
      
      if (mediaIndex === null || mediaIndex === undefined) {
        throw new Error('mediaIndex is required for upload');
      }
      
      console.log('[Cookie Extension] Uploading cookies - batchId:', batchId, 'mediaIndex:', mediaIndex);
      
      // Convert cookies to Netscape format
      const netscapeContent = convertToNetscapeFormat(cookies);
      
      // Create FormData with cookie file
      const formData = new FormData();
      const cookieBlob = new Blob([netscapeContent], { type: 'text/plain' });
      formData.append('cookieFile', cookieBlob, 'youtube_cookies.txt');
      formData.append('batchId', batchId);
      formData.append('mediaIndex', mediaIndex.toString());

      // Get auth token from localStorage
      const token = localStorage.getItem('token') || 'dev-anonymous';

      // Determine the API URL based on environment
      let apiUrl = window.location.origin;
      if (window.location.hostname === 'localhost' && window.location.port === '3002') {
        // Frontend is on 3002, backend is on 5000
        apiUrl = 'http://localhost:5000';
      }
      
      // Send to backend
      const response = await fetch(`${apiUrl}/api/projects/batch-download/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      return { success: true, batchId, mediaIndex };
      
    } catch (error) {
      console.error('[Cookie Extension] Upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Convert cookies to Netscape format
  function convertToNetscapeFormat(cookies) {
    let content = '# Netscape HTTP Cookie File\n';
    content += '# Generated by Transcription System Cookie Extension\n';
    content += '# Automatic export for protected content\n\n';

    cookies.forEach(cookie => {
      const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
      const domainFlag = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expiration = cookie.expirationDate ? Math.floor(cookie.expirationDate) : '0';
      const name = cookie.name;
      const value = cookie.value;

      content += `${domain}\t${domainFlag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
    });

    return content;
  }

  // Trigger retry mechanism
  function triggerRetry(batchId, mediaIndex) {
    // Method 1: Click retry button if available
    const retryButton = document.querySelector(`[data-retry-media="${mediaIndex}"]`);
    if (retryButton) {
      retryButton.click();
      return;
    }

    // Method 2: Dispatch custom event
    window.dispatchEvent(new CustomEvent('cookie-retry', {
      detail: { batchId, mediaIndex }
    }));

    // Method 3: Reload the modal/page
    const modal = document.querySelector('.download-progress-modal');
    if (modal) {
      // Trigger re-fetch of progress
      const event = new Event('refresh-progress');
      modal.dispatchEvent(event);
    }
  }

  // Show notification to user
  function showNotification(message, type = 'info') {
    // Create or update notification element
    let notification = document.getElementById('cookie-extension-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'cookie-extension-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        direction: rtl;
      `;
      document.body.appendChild(notification);
    }

    // Set colors based on type
    const colors = {
      info: { bg: '#e3f2fd', text: '#1976d2', border: '#90caf9' },
      success: { bg: '#e8f5e9', text: '#2e7d32', border: '#81c784' },
      error: { bg: '#ffebee', text: '#c62828', border: '#ef5350' },
      warning: { bg: '#fff3e0', text: '#f57c00', border: '#ffb74d' }
    };

    const color = colors[type] || colors.info;
    notification.style.backgroundColor = color.bg;
    notification.style.color = color.text;
    notification.style.border = `2px solid ${color.border}`;
    
    // Add icon based on type
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    
    notification.innerHTML = `${icons[type] || ''} ${message}`;
    notification.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.style.display = 'none';
        notification.style.opacity = '1';
      }, 300);
    }, 5000);
  }

  // Show manual upload option as fallback
  function showManualUploadOption() {
    const errorElements = document.querySelectorAll('.media-error');
    errorElements.forEach(element => {
      if (!element.querySelector('.extension-manual-fallback')) {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'extension-manual-fallback';
        fallbackDiv.style.cssText = `
          margin-top: 10px;
          padding: 8px;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 4px;
          font-size: 12px;
          color: #ffc107;
        `;
        fallbackDiv.innerHTML = `
          <strong>🍪 הטיפול האוטומטי נכשל</strong><br>
          <span style="font-size: 11px;">השתמש בכפתור הידני למעלה להעלאת Cookies</span>
        `;
        element.appendChild(fallbackDiv);
      }
    });
  }

  // Initialize monitoring
  function startMonitoring() {
    if (!isTranscriptionSystem()) {
      console.log('[Cookie Extension] Not on transcription system, skipping monitoring');
      return;
    }

    console.log('[Cookie Extension] Starting error monitoring...');

    checkInterval = setInterval(() => {
      const errorInfo = detectCookieError();
      
      if (errorInfo.detected) {
        const errorKey = errorInfo.errorText;
        
        // Check if this is a new error or the same one
        if (lastErrorDetected !== errorKey) {
          console.log('[Cookie Extension] New cookie error detected:', errorInfo);
          lastErrorDetected = errorKey;
          
          // Debounce to avoid multiple triggers
          setTimeout(() => {
            if (lastErrorDetected === errorKey) {
              handleAutomaticCookieExport(errorInfo);
            }
          }, CONFIG.DEBOUNCE_TIME);
        }
      }
    }, CONFIG.CHECK_INTERVAL);
  }

  // Listen for messages from the page
  window.addEventListener('message', (event) => {
    // Verify origin
    if (!CONFIG.ALLOWED_ORIGINS.some(origin => event.origin.startsWith(origin))) {
      return;
    }

    if (event.data.type === 'COOKIE_ERROR_DETECTED') {
      console.log('[Cookie Extension] Received cookie error message from page');
      const errorInfo = detectCookieError();
      if (errorInfo.detected) {
        handleAutomaticCookieExport(errorInfo);
      }
    }
  });

  // Listen for extension installation check
  window.addEventListener('message', (event) => {
    if (event.data.type === 'CHECK_EXTENSION_INSTALLED') {
      console.log('[Cookie Extension] Installation check received');
      // Get version from manifest if available
      let version = '2.0.0';
      try {
        if (chrome.runtime && chrome.runtime.getManifest) {
          version = chrome.runtime.getManifest().version;
        }
      } catch (e) {
        console.log('[Cookie Extension] Could not get version, using default');
      }
      
      window.postMessage({
        type: 'EXTENSION_INSTALLED',
        extensionId: chrome.runtime.id || 'cookie-helper',
        version: version
      }, '*');
      console.log('[Cookie Extension] Response sent');
    }
  });

  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  } else {
    startMonitoring();
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });

})();