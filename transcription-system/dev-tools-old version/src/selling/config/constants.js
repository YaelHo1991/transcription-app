/**
 * Application Constants
 */
export const PRICING = {
    ADMIN: 299,
    CRM_PERMISSION: 99,
    TRANSCRIPTION_PERMISSION: 79
};

export const PERMISSIONS = {
    CRM: {
        A: { code: 'A', name: 'ניהול לקוחות', price: PRICING.CRM_PERMISSION },
        B: { code: 'B', name: 'ניהול עבודות', price: PRICING.CRM_PERMISSION },
        C: { code: 'C', name: 'ניהול מתמללים', price: PRICING.CRM_PERMISSION }
    },
    TRANSCRIPTION: {
        D: { code: 'D', name: 'תמלול', price: PRICING.TRANSCRIPTION_PERMISSION },
        E: { code: 'E', name: 'הגהה', price: PRICING.TRANSCRIPTION_PERMISSION },
        F: { code: 'F', name: 'ייצוא', price: PRICING.TRANSCRIPTION_PERMISSION }
    }
};

export const FORM_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
};

export const MESSAGE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
};