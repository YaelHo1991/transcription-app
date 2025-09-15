// Background Service Worker for Cookie Export Extension

class ExtensionManager {
  constructor() {
    this.init();
  }

  init() {
    // Handle extension installation and updates
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle messages from popup or content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Monitor download progress
    chrome.downloads.onCreated.addListener((downloadItem) => {
      this.handleDownloadCreated(downloadItem);
    });

    chrome.downloads.onChanged.addListener((delta) => {
      this.handleDownloadChanged(delta);
    });
  }

  handleInstallation(details) {
    console.log('Extension installed/updated:', details);
    
    if (details.reason === 'install') {
      // First-time installation
      this.showWelcomeNotification();
      this.initializeStorage();
    } else if (details.reason === 'update') {
      // Extension updated
      this.handleUpdate(details.previousVersion);
    }
  }

  handleStartup() {
    console.log('Extension started');
    // Any startup initialization can go here
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      // Handle messages from content script
      if (message.action) {
        switch (message.action) {
          case 'EXPORT_YOUTUBE_COOKIES':
            const youtubeCookies = await this.exportYouTubeCookiesForContent(message.data);
            sendResponse({ success: true, data: youtubeCookies });
            break;

          case 'CHECK_EXTENSION_STATUS':
            sendResponse({ 
              success: true, 
              installed: true,
              version: chrome.runtime.getManifest().version
            });
            break;

          default:
            // Fall through to original message handling
        }
      }

      // Original message handling
      switch (message.type) {
        case 'GET_CURRENT_TAB':
          const tab = await this.getCurrentTab();
          sendResponse({ success: true, data: tab });
          break;

        case 'GET_COOKIES':
          const cookies = await this.getCookies(message.domain, message.url);
          sendResponse({ success: true, data: cookies });
          break;

        case 'EXPORT_COOKIES':
          const result = await this.exportCookies(message.cookies, message.filename);
          sendResponse({ success: true, data: result });
          break;

        case 'GET_EXTENSION_INFO':
          const info = await this.getExtensionInfo();
          sendResponse({ success: true, data: info });
          break;

        default:
          if (!message.action) {
            sendResponse({ success: false, error: 'Unknown message type' });
          }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async exportYouTubeCookiesForContent(data) {
    try {
      console.log('[Background] Exporting YouTube cookies for automatic handling...');
      
      // Get YouTube cookies
      const youtubeDomains = ['youtube.com', '.youtube.com', 'www.youtube.com'];
      const allCookies = [];
      
      for (const domain of youtubeDomains) {
        try {
          const domainCookies = await chrome.cookies.getAll({ domain: domain });
          allCookies.push(...domainCookies);
        } catch (e) {
          console.warn(`Failed to get cookies for ${domain}:`, e);
        }
      }

      if (allCookies.length === 0) {
        throw new Error('No YouTube cookies found. Please log in to YouTube first.');
      }

      // Remove duplicates
      const uniqueCookies = Array.from(new Map(
        allCookies.map(cookie => [`${cookie.domain}-${cookie.name}`, cookie])
      ).values());

      console.log(`[Background] Found ${uniqueCookies.length} unique YouTube cookies`);

      return {
        cookies: uniqueCookies,
        batchId: data.batchId,
        mediaIndex: data.mediaIndex,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[Background] Error exporting YouTube cookies:', error);
      throw error;
    }
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async getCookies(domain, url) {
    try {
      let cookies = [];
      
      if (url) {
        cookies = await chrome.cookies.getAll({ url: url });
      } else if (domain) {
        cookies = await chrome.cookies.getAll({ domain: domain });
      }
      
      return cookies;
    } catch (error) {
      console.error('Error getting cookies:', error);
      throw error;
    }
  }

  async exportCookies(cookies, filename) {
    try {
      // Convert cookies to Netscape format
      const netscapeContent = this.convertToNetscapeFormat(cookies);
      
      // Create blob and download
      const blob = new Blob([netscapeContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      });
      
      // Clean up the blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
      return { downloadId, filename };
    } catch (error) {
      console.error('Error exporting cookies:', error);
      throw error;
    }
  }

  convertToNetscapeFormat(cookies) {
    let content = '# Netscape HTTP Cookie File\n';
    content += '# Generated by Transcription System Cookie Exporter\n';
    content += '# This file contains cookies in Netscape format for use with yt-dlp\n\n';

    cookies.forEach(cookie => {
      // Format: domain, domainFlag, path, secure, expiration, name, value
      const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
      const domainFlag = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expiration = cookie.expirationDate ? Math.floor(cookie.expirationDate) : '0';
      const name = cookie.name;
      const value = cookie.value;

      // Tab-separated format
      content += `${domain}\t${domainFlag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
    });

    return content;
  }

  handleDownloadCreated(downloadItem) {
    // Track downloads created by our extension
    if (downloadItem.byExtensionName === chrome.runtime.getManifest().name) {
      console.log('Cookie file download started:', downloadItem.filename);
    }
  }

  handleDownloadChanged(delta) {
    // Monitor download progress and completion
    if (delta.state && delta.state.current === 'complete') {
      // Download completed
      this.handleDownloadComplete(delta.id);
    } else if (delta.state && delta.state.current === 'interrupted') {
      // Download failed
      this.handleDownloadFailed(delta.id);
    }
  }

  async handleDownloadComplete(downloadId) {
    try {
      const download = await chrome.downloads.search({ id: downloadId });
      if (download.length > 0 && download[0].filename.includes('cookies')) {
        console.log('Cookie file download completed:', download[0].filename);
        
        // Optionally show a notification
        this.showNotification('הורדה הושלמה', `קובץ הcookies נשמר בהצלחה: ${download[0].filename}`);
      }
    } catch (error) {
      console.error('Error handling download completion:', error);
    }
  }

  async handleDownloadFailed(downloadId) {
    try {
      const download = await chrome.downloads.search({ id: downloadId });
      if (download.length > 0 && download[0].filename.includes('cookies')) {
        console.error('Cookie file download failed:', download[0].filename);
        
        // Show error notification
        this.showNotification('שגיאה בהורדה', 'ההורדה נכשלה. נסה שוב.', 'error');
      }
    } catch (error) {
      console.error('Error handling download failure:', error);
    }
  }

  showWelcomeNotification() {
    this.showNotification(
      'ברוך הבא למייצא ה-Cookies!',
      'התוסף מוכן לשימוש. לחץ על האייקון כדי להתחיל.'
    );
  }

  showNotification(title, message, type = 'basic') {
    // Show notification if permissions allow
    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      }, function(notificationId) {
        if (chrome.runtime.lastError) {
          console.log('Notification error:', chrome.runtime.lastError);
        }
      });
    }
  }

  async initializeStorage() {
    // Initialize default storage values
    const defaultSettings = {
      autoSave: true,
      defaultExportType: 'youtube',
      showNotifications: true,
      exportHistory: []
    };

    const stored = await chrome.storage.sync.get(Object.keys(defaultSettings));
    
    // Set defaults for any missing keys
    const toSet = {};
    for (const [key, defaultValue] of Object.entries(defaultSettings)) {
      if (!(key in stored)) {
        toSet[key] = defaultValue;
      }
    }

    if (Object.keys(toSet).length > 0) {
      await chrome.storage.sync.set(toSet);
    }
  }

  async handleUpdate(previousVersion) {
    console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Handle any migration logic here if needed in future versions
    this.showNotification(
      'התוסף עודכן',
      `התוסף עודכן לגרסה ${chrome.runtime.getManifest().version}`
    );
  }

  async getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description
    };
  }

  // Utility method to save export history
  async saveExportHistory(exportData) {
    try {
      const { exportHistory = [] } = await chrome.storage.sync.get(['exportHistory']);
      
      const historyEntry = {
        timestamp: Date.now(),
        domain: exportData.domain,
        cookieCount: exportData.cookieCount,
        filename: exportData.filename,
        type: exportData.type
      };
      
      // Keep only last 50 exports
      exportHistory.unshift(historyEntry);
      if (exportHistory.length > 50) {
        exportHistory.splice(50);
      }
      
      await chrome.storage.sync.set({ exportHistory });
    } catch (error) {
      console.error('Error saving export history:', error);
    }
  }

  // Clean up old data periodically
  async cleanupOldData() {
    try {
      const { exportHistory = [] } = await chrome.storage.sync.get(['exportHistory']);
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const filteredHistory = exportHistory.filter(entry => entry.timestamp > oneWeekAgo);
      
      if (filteredHistory.length !== exportHistory.length) {
        await chrome.storage.sync.set({ exportHistory: filteredHistory });
        console.log('Cleaned up old export history');
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }
}

// Initialize the extension manager
const extensionManager = new ExtensionManager();

// Periodic cleanup (run once per day)
if (chrome.alarms) {
  chrome.alarms.create('cleanup', { delayInMinutes: 1440, periodInMinutes: 1440 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
      extensionManager.cleanupOldData();
    }
  });
}

// Handle extension errors
self.addEventListener('error', (event) => {
  console.error('Extension error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});