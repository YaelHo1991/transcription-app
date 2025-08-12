/**
 * API Configuration
 */
export const API_CONFIG = {
    BASE_URL: 'http://localhost:8080/api',
    ENDPOINTS: {
        PURCHASE: '/selling/purchase',
        PRICING: '/selling/pricing',
        STATISTICS: '/admin/statistics/overview',
        COMPANIES: '/admin/companies',
        VALIDATION: '/selling/validation'
    },
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
};

export const API_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};