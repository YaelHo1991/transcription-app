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
        // Don't show popup for login endpoint itself
        if (!url?.includes('/api/auth/login')) {
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
    
    // Add auth token to API requests
    if (this._url && (this._url.includes('/api/') || this._url.startsWith(buildApiUrl('')))) {
      if (token) {
        this.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    }

    // Listen for response
    this.addEventListener('load', function() {
      if (this.status === 401 && !this._url?.includes('/api/auth/login')) {
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