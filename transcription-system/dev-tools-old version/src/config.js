/**
 * Global configuration for API endpoints
 */

// Detect if we're running locally or on production
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API base URL - automatically uses the current host
const API_BASE_URL = isLocal 
    ? 'http://localhost:8080/api'
    : `http://${window.location.hostname}:8080/api`;

// Export for use in other files
window.API_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    isLocal: isLocal
};