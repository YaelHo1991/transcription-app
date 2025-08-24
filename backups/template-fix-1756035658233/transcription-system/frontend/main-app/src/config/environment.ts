/**
 * Environment Configuration
 * Auto-detects environment and provides correct URLs
 * Works on both localhost and production without code changes
 */

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  
  private constructor() {}

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Determine if we're running in development
   */
  isDevelopment(): boolean {
    if (typeof window === 'undefined') {
      // Server-side rendering
      return process.env.NODE_ENV !== 'production';
    }
    
    // Client-side
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname.startsWith('192.168.') ||
           hostname.endsWith('.local');
  }

  /**
   * Get the API base URL
   * Auto-detects based on environment
   */
  getApiUrl(): string {
    // First check for explicit environment variable
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // If we're on the server (SSR), use environment variable or default
    if (typeof window === 'undefined') {
      return process.env.API_URL || 'http://localhost:5000';
    }

    // Client-side detection
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Development environment
    if (this.isDevelopment()) {
      return 'http://localhost:5000';
    }

    // Production environment
    // Assumes API is on same domain at /api or on subdomain
    if (hostname.includes('digitalocean') || hostname.includes('your-domain')) {
      // If your API is on a subdomain
      if (process.env.NEXT_PUBLIC_API_SUBDOMAIN) {
        return `${protocol}//api.${hostname}`;
      }
      // If API is on same domain with /api prefix
      return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
    }

    // Default fallback
    return `${protocol}//${hostname}:5000`;
  }

  /**
   * Get WebSocket URL for real-time features
   */
  getWsUrl(): string {
    const apiUrl = this.getApiUrl();
    return apiUrl.replace(/^http/, 'ws');
  }

  /**
   * Get media upload URL
   */
  getMediaUrl(): string {
    return `${this.getApiUrl()}/media`;
  }

  /**
   * Get environment name for logging
   */
  getEnvironment(): 'development' | 'production' | 'staging' {
    if (this.isDevelopment()) {
      return 'development';
    }
    
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('staging')) {
        return 'staging';
      }
    }
    
    return 'production';
  }

  /**
   * Check if IndexedDB should be used
   */
  shouldUseIndexedDB(): boolean {
    // Always use IndexedDB if available for better performance
    if (typeof window === 'undefined') {
      return false;
    }
    
    return 'indexedDB' in window;
  }

  /**
   * Get configuration summary for debugging
   */
  getConfig(): Record<string, any> {
    return {
      environment: this.getEnvironment(),
      isDevelopment: this.isDevelopment(),
      apiUrl: this.getApiUrl(),
      wsUrl: this.getWsUrl(),
      mediaUrl: this.getMediaUrl(),
      indexedDB: this.shouldUseIndexedDB(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    };
  }

  /**
   * Log configuration (useful for debugging deployment issues)
   */
  logConfig(): void {
    console.log('🔧 Environment Configuration:', this.getConfig());
  }
}

// Export singleton instance
const environmentConfig = EnvironmentConfig.getInstance();
export default environmentConfig;

// Export convenience functions
export const getApiUrl = () => environmentConfig.getApiUrl();
export const isDevelopment = () => environmentConfig.isDevelopment();
export const getEnvironment = () => environmentConfig.getEnvironment();
export const shouldUseIndexedDB = () => environmentConfig.shouldUseIndexedDB();