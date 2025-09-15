// Popup JavaScript for Cookie Export Extension

class CookieExporter {
  constructor() {
    this.currentTab = null;
    this.currentUrl = null;
    this.currentDomain = null;
    this.init();
  }

  async init() {
    try {
      // Get current tab information
      await this.getCurrentTab();
      await this.displaySiteInfo();
      await this.countCookies();
      this.bindEvents();
      this.showStatus('מוכן ליצוא', 'info');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showStatus('שגיאה באתחול התוסף', 'error');
    }
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      this.currentTab = tabs[0];
      this.currentUrl = new URL(this.currentTab.url);
      this.currentDomain = this.currentUrl.hostname;
    }
  }

  async displaySiteInfo() {
    const siteUrlElement = document.getElementById('currentSite');
    const currentSite = this.currentDomain || 'לא זוהה';
    siteUrlElement.textContent = currentSite;
  }

  async countCookies() {
    try {
      const cookieCountElement = document.getElementById('cookieCount');
      
      if (!this.currentDomain) {
        cookieCountElement.textContent = 'לא ניתן לספור cookies';
        return;
      }

      // Get cookies for current domain
      const cookies = await chrome.cookies.getAll({ domain: this.currentDomain });
      const count = cookies.length;
      
      cookieCountElement.textContent = `${count} cookies נמצאו`;
    } catch (error) {
      console.error('Error counting cookies:', error);
      document.getElementById('cookieCount').textContent = 'שגיאה בספירת cookies';
    }
  }

  bindEvents() {
    // Export buttons
    document.getElementById('exportCurrentSite').addEventListener('click', () => {
      this.exportCookies('currentSite');
    });

    document.getElementById('exportDomain').addEventListener('click', () => {
      this.exportCookies('domain');
    });

    document.getElementById('exportYouTube').addEventListener('click', () => {
      this.exportCookies('youtube');
    });

    // Help and about buttons
    document.getElementById('helpButton').addEventListener('click', () => {
      this.showHelpModal();
    });

    document.getElementById('aboutButton').addEventListener('click', () => {
      this.showAboutModal();
    });

    // Modal close buttons
    document.getElementById('helpClose').addEventListener('click', () => {
      this.hideModal('helpModal');
    });

    // Close modal when clicking outside
    document.getElementById('helpModal').addEventListener('click', (e) => {
      if (e.target.id === 'helpModal') {
        this.hideModal('helpModal');
      }
    });
  }

  async exportCookies(type) {
    try {
      // Disable all export buttons during export
      this.disableExportButtons();
      this.showStatus('מייצא cookies...', 'info');
      this.showProgressBar(0);
      
      let cookies = [];
      let filename = '';

      switch (type) {
        case 'currentSite':
          if (!this.currentTab?.url) {
            throw new Error('לא ניתן לגשת לאתר הנוכחי');
          }
          cookies = await chrome.cookies.getAll({ url: this.currentTab.url });
          filename = `cookies_${this.currentDomain}.txt`;
          break;
          
        case 'domain':
          if (!this.currentDomain) {
            throw new Error('לא ניתן לזהות דומיין');
          }
          cookies = await chrome.cookies.getAll({ domain: this.currentDomain });
          filename = `cookies_${this.currentDomain}_all.txt`;
          break;
          
        case 'youtube':
          // Get cookies for YouTube domains with better error handling
          const youtubedomains = ['youtube.com', '.youtube.com', 'www.youtube.com'];
          const youtubeCookies = [];
          let domainErrors = [];
          
          for (const domain of youtubedomains) {
            try {
              const domainCookies = await chrome.cookies.getAll({ domain: domain });
              youtubeCookies.push(...domainCookies);
            } catch (e) {
              domainErrors.push(domain);
              console.warn(`Failed to get cookies for ${domain}:`, e);
            }
          }
          
          if (domainErrors.length === youtubedomains.length) {
            throw new Error('לא ניתן לגשת ל-cookies של YouTube');
          }
          
          cookies = youtubeCookies;
          filename = 'youtube_cookies.txt';
          break;
          
        default:
          throw new Error('סוג יצוא לא חוקי');
      }

      this.showProgressBar(40);

      if (cookies.length === 0) {
        this.showStatus('לא נמצאו cookies לייצוא', 'warning');
        this.hideProgressBar();
        this.enableExportButtons();
        return;
      }

      // Validate cookies before conversion
      const validCookies = cookies.filter(cookie => {
        return cookie && cookie.name && cookie.domain;
      });

      if (validCookies.length === 0) {
        throw new Error('לא נמצאו cookies תקינים');
      }

      if (validCookies.length < cookies.length) {
        console.warn(`Filtered out ${cookies.length - validCookies.length} invalid cookies`);
      }

      this.showProgressBar(60);

      // Convert cookies to Netscape format
      const netscapeFormat = this.convertToNetscapeFormat(validCookies);
      
      if (!netscapeFormat || netscapeFormat.trim().length === 0) {
        throw new Error('שגיאה ביצירת קובץ cookies');
      }

      this.showProgressBar(80);

      // Download the file with enhanced error handling
      await this.downloadFile(netscapeFormat, filename);
      
      this.showProgressBar(100);
      this.showStatus(`יוצאו ${validCookies.length} cookies בהצלחה`, 'success');
      
      // Save to export history
      await this.saveExportToHistory({
        type,
        domain: this.currentDomain,
        cookieCount: validCookies.length,
        filename,
        timestamp: Date.now()
      });

      setTimeout(() => {
        this.hideProgressBar();
        this.enableExportButtons();
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      
      // Enhanced error messages
      let errorMessage = 'שגיאה בייצוא cookies';
      
      if (error.message.includes('permission')) {
        errorMessage = 'אין הרשאה לגשת ל-cookies. בדוק הגדרות התוסף';
      } else if (error.message.includes('network')) {
        errorMessage = 'שגיאת רשת. בדוק חיבור לאינטרנט';
      } else if (error.message.includes('download')) {
        errorMessage = 'שגיאה בהורדת הקובץ. בדוק הרשאות הורדה';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      this.showStatus(errorMessage, 'error');
      this.hideProgressBar();
      this.enableExportButtons();
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

  async downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Use Chrome downloads API
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false // Automatically save to downloads folder
    });

    // Clean up the blob URL
    URL.revokeObjectURL(url);
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    statusElement.className = `status-message ${type}`;
    statusElement.classList.remove('hidden');

    // Set appropriate icon based on type
    switch (type) {
      case 'success':
        statusIcon.textContent = '✅';
        break;
      case 'error':
        statusIcon.textContent = '❌';
        break;
      case 'warning':
        statusIcon.textContent = '⚠️';
        break;
      case 'info':
      default:
        statusIcon.textContent = 'ℹ️';
        break;
    }

    statusText.textContent = message;

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusElement.classList.add('hidden');
      }, 3000);
    }
  }

  showProgressBar(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    progressBar.classList.remove('hidden');
    progressFill.style.width = `${progress}%`;
  }

  hideProgressBar() {
    const progressBar = document.getElementById('progressBar');
    progressBar.classList.add('hidden');
  }

  showHelpModal() {
    document.getElementById('helpModal').classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  disableExportButtons() {
    const buttons = document.querySelectorAll('.btn-export');
    buttons.forEach(button => {
      button.disabled = true;
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.5';
    });
  }

  enableExportButtons() {
    const buttons = document.querySelectorAll('.btn-export');
    buttons.forEach(button => {
      button.disabled = false;
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
    });
  }

  async saveExportToHistory(exportData) {
    try {
      // Get current history from storage
      const result = await chrome.storage.sync.get(['exportHistory']);
      const history = result.exportHistory || [];
      
      // Add new entry
      history.unshift(exportData);
      
      // Keep only last 20 entries
      if (history.length > 20) {
        history.splice(20);
      }
      
      // Save back to storage
      await chrome.storage.sync.set({ exportHistory: history });
    } catch (error) {
      console.warn('Could not save export history:', error);
    }
  }

  // Enhanced error detection for cookie-related issues
  isCookieError(error) {
    const cookieKeywords = [
      'permission', 'access', 'cookie', 'blocked', 
      'restricted', 'policy', 'security'
    ];
    
    const message = error.message.toLowerCase();
    return cookieKeywords.some(keyword => message.includes(keyword));
  }

  // Validate domain before processing
  isValidDomain(domain) {
    if (!domain) return false;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain.replace(/^\./, ''));
  }

  showAboutModal() {
    // Create about modal content dynamically
    const aboutContent = `
      <div class="modal" id="aboutModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>אודות התוסף</h2>
            <button class="modal-close" id="aboutClose">×</button>
          </div>
          <div class="modal-body">
            <div style="text-align: center; margin-bottom: 16px;">
              <div style="font-size: 48px; margin-bottom: 8px;">🍪</div>
              <h3>מייצא Cookies למערכת התמלול</h3>
              <p style="color: #666; font-size: 12px;">גרסה 1.0.0</p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <h4 style="font-size: 14px; margin-bottom: 6px;">מה עושה התוסף?</h4>
              <p style="font-size: 12px; color: #666; line-height: 1.4;">
                התוסף מייצא cookies מהדפדפן בפורמט Netscape המתאים לשימוש במערכת התמלול 
                לגישה לתוכן מוגן ב-YouTube ובאתרים אחרים.
              </p>
            </div>
            
            <div style="margin-bottom: 12px;">
              <h4 style="font-size: 14px; margin-bottom: 6px;">אבטחה ופרטיות</h4>
              <p style="font-size: 12px; color: #666; line-height: 1.4;">
                כל העיבוד נעשה במחשב שלך. אף מידע לא נשלח לשרתים חיצוניים.
                הקבצים נשמרים בתיקיית ההורדות שלך.
              </p>
            </div>
            
            <div style="text-align: center; padding-top: 12px; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 11px; color: #999;">
                פותח עבור מערכת התמלול | קוד פתוח
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page if it doesn't exist
    if (!document.getElementById('aboutModal')) {
      document.body.insertAdjacentHTML('beforeend', aboutContent);
      
      // Bind close event
      document.getElementById('aboutClose').addEventListener('click', () => {
        this.hideModal('aboutModal');
      });

      document.getElementById('aboutModal').addEventListener('click', (e) => {
        if (e.target.id === 'aboutModal') {
          this.hideModal('aboutModal');
        }
      });
    }

    document.getElementById('aboutModal').classList.remove('hidden');
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CookieExporter();
});

// Handle extension errors
window.addEventListener('error', (event) => {
  console.error('Extension error:', event.error);
});