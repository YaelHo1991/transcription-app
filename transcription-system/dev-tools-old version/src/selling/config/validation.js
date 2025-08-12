/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
    fullName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Zא-ת\s\-']+$/
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    companyName: {
        required: false,
        minLength: 2,
        maxLength: 100
    },
    permissions: {
        required: true,
        minItems: 1
    }
};

export const ERROR_MESSAGES = {
    REQUIRED: 'שדה חובה',
    INVALID_EMAIL: 'כתובת אימייל לא תקינה',
    INVALID_NAME: 'שם לא תקין',
    MIN_LENGTH: 'שדה קצר מדי',
    MAX_LENGTH: 'שדה ארוך מדי',
    NO_PERMISSIONS: 'יש לבחור לפחות הרשאה אחת',
    COMPANY_REQUIRES_CRM: 'בעלי חברה חייבים להיות בעלי הרשאות CRM'
};