import { buildApiUrl } from '@/utils/api';

let loginPopupCallback: (() => void) | null = null;

export function setLoginPopupCallback(callback: () => void) {
  loginPopupCallback = callback;
}

export function setupAuthInterceptor() {
  // Store the original fetch
  const originalFetch = window.fetch;

  // Override fetch
  window.fetch = async (...args) => {
    const [resource, config] = args;
    
    // Add auth token to API requests
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
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
        // Don't show popup for login endpoint itself or background operations
        const isBackgroundOperation = url?.includes('/backup') || 
                                     url?.includes('/auto-save') || 
                                     url?.includes('/projects') && config?.headers?.['X-Background-Request'];
        
        if (!url?.includes('/api/auth/login') && !isBackgroundOperation) {
          // Clear invalid token
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Trigger login popup
          if (loginPopupCallback) {
            loginPopupCallback();
          }
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
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
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
      const isBackgroundOperation = this._url?.includes('/backup') || 
                                   this._url?.includes('/auto-save') || 
                                   this._url?.includes('/projects');
      
      if (this.status === 401 && !this._url?.includes('/api/auth/login') && !isBackgroundOperation) {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Trigger login popup
        if (loginPopupCallback) {
          loginPopupCallback();
        }
      }
    });

    return originalSend.apply(this, [data]);
  };
}