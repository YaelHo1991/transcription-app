import { buildApiUrl } from '@/utils/api';

let loginPopupCallback: (() => void) | null = null;
let popupDebounceTimer: NodeJS.Timeout | null = null;
let lastPopupTrigger = 0;
const POPUP_DEBOUNCE_MS = 2000; // 2 second debounce

export function setLoginPopupCallback(callback: () => void) {
  loginPopupCallback = callback;
}

// Check if user has valid authentication state
function hasValidAuthState(): boolean {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');
  
  // More comprehensive validation
  const hasValidToken = token && typeof token === 'string' && token.length > 10 && token.split('.').length === 3;
  const hasUserData = userId || userEmail;
  
  console.log('[Auth] Checking auth state - token valid:', !!hasValidToken, 'user data:', !!hasUserData, 'userId:', userId, 'userEmail:', userEmail);
  
  return !!(hasValidToken && hasUserData);
}

// Debounced popup trigger
function triggerLoginPopupDebounced() {
  const now = Date.now();
  
  // Clear any existing timer
  if (popupDebounceTimer) {
    clearTimeout(popupDebounceTimer);
  }
  
  // If we triggered recently, just reset the timer
  if (now - lastPopupTrigger < POPUP_DEBOUNCE_MS) {
    console.log('[Auth] Popup trigger debounced - waiting for quiet period');
    popupDebounceTimer = setTimeout(triggerLoginPopupDebounced, POPUP_DEBOUNCE_MS);
    return;
  }
  
  // Check if we actually need to show popup
  if (!hasValidAuthState()) {
    console.warn('[Auth] No valid auth state found - showing login popup');
    lastPopupTrigger = now;
    if (loginPopupCallback) {
      loginPopupCallback();
    }
  } else {
    console.log('[Auth] Valid auth state found - skipping popup');
  }
}

export function setupAuthInterceptor() {
  // Store the original fetch
  const originalFetch = window.fetch;

  // Override fetch
  window.fetch = async (...args) => {
    const [resource, config] = args;
    
    // Add auth token to API requests
    let token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Validate JWT token format - should have 3 parts separated by dots
    if (token && (typeof token !== 'string' || token.split('.').length !== 3)) {
      console.warn('[Auth] Invalid JWT token format detected, clearing tokens');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      token = null;
    }
    
    const modifiedConfig = { ...config };
    
    // Check if this is an API request
    const url = typeof resource === 'string' ? resource : resource.url;
    const apiUrl = buildApiUrl('');
    
    if (url && (url.includes('/api/') || url.startsWith(apiUrl))) {
      modifiedConfig.headers = {
        ...modifiedConfig.headers,
        'Authorization': token ? `Bearer ${token}` : '',
      };
    }

    try {
      const response = await originalFetch(resource, modifiedConfig);
      
      // Check for 401 Unauthorized
      if (response.status === 401) {
        console.log('[Auth] 401 detected for URL:', url);
        console.log('[Auth] Current auth state - token exists:', !!localStorage.getItem('auth_token'), 'userId exists:', !!localStorage.getItem('userId'));
        
        // Don't show popup for these endpoints or operations
        const shouldSkipPopup = url?.includes('/api/auth/login') ||
                               url?.includes('/backup') || 
                               url?.includes('/auto-save') ||
                               url?.includes('/template/export-template') ||
                               url?.includes('/transcription/shortcuts/public') ||
                               url?.includes('/projects/orphaned/transcriptions') ||
                               url?.includes('/projects/list') || 
                               url?.includes('/projects') || // All project endpoints
                               url?.includes('/api/transcription') || // All transcription endpoints
                               url?.includes('/media') || // Media endpoints
                               url?.includes('/sessions') || // Session endpoints
                               (config?.headers?.['X-Background-Request']) || // All background requests
                               // Emergency: Skip popup if user has ANY auth data in localStorage
                               (localStorage.getItem('userId') || localStorage.getItem('userEmail'));
        
        console.log('[Auth] Should skip popup:', shouldSkipPopup, 'for URL:', url);
        
        if (!shouldSkipPopup) {
          console.warn('[Auth] 401 on critical endpoint - clearing tokens and triggering debounced popup for:', url);
          // Clear invalid token
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          
          // Trigger debounced login popup
          triggerLoginPopupDebounced();
        } else {
          console.log('[Auth] Skipping popup for background/excluded endpoint:', url);
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
}

// Setup interceptor for XMLHttpRequest (for older code that might use it)
export function setupXHRInterceptor() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    this._url = url.toString();
    this._method = method;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(data?: any) {
    let token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Validate JWT token format - should have 3 parts separated by dots
    if (token && (typeof token !== 'string' || token.split('.').length !== 3)) {
      console.warn('[Auth] Invalid JWT token format detected in XHR, clearing tokens');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      token = null;
    }
    
    // Skip interceptor for axios backup requests (they handle their own auth)
    const isBackupRequest = this._url?.includes('/backup') || this._url?.includes('/auto-save');
    
    // Add auth token to API requests (except for axios backup requests which handle their own)
    if (!isBackupRequest && this._url && (this._url.includes('/api/') || this._url.startsWith(buildApiUrl('')))) {
      if (token) {
        this.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    }

    // Listen for response
    this.addEventListener('load', function() {
      const shouldSkipPopup = this._url?.includes('/api/auth/login') ||
                             this._url?.includes('/backup') || 
                             this._url?.includes('/auto-save') ||
                             this._url?.includes('/template/export-template') ||
                             this._url?.includes('/transcription/shortcuts/public') ||
                             this._url?.includes('/projects/orphaned/transcriptions') ||
                             this._url?.includes('/projects/list') || 
                             this._url?.includes('/projects') || // All project endpoints
                             this._url?.includes('/api/transcription') || // All transcription endpoints
                             this._url?.includes('/media') || // Media endpoints
                             this._url?.includes('/sessions') || // Session endpoints
                             // Emergency: Skip popup if user has ANY auth data in localStorage
                             (localStorage.getItem('userId') || localStorage.getItem('userEmail'));
      
      if (this.status === 401 && !shouldSkipPopup) {
        console.warn('[Auth XHR] 401 on critical endpoint - clearing tokens and triggering debounced popup for:', this._url);
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        
        // Trigger debounced login popup
        triggerLoginPopupDebounced();
      } else if (this.status === 401) {
        console.log('[Auth XHR] Skipping popup for background/excluded endpoint:', this._url);
      }
    });

    return originalSend.apply(this, [data]);
  };
}