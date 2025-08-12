/**
 * Pricing Service
 */
import { PRICING, PERMISSIONS } from '../../config/constants.js';

export class PricingService {
    constructor() {
        this.pricing = PRICING;
        this.permissions = PERMISSIONS;
    }

    calculateLicensePrice(permissions, isAdmin) {
        if (isAdmin) {
            return {
                total: this.pricing.ADMIN,
                breakdown: [
                    { item: 'מנהל מערכת', price: this.pricing.ADMIN, quantity: 1 }
                ]
            };
        }

        const breakdown = [];
        let total = 0;

        // Calculate CRM permissions
        const crmPermissions = permissions.filter(p => ['A', 'B', 'C'].includes(p));
        if (crmPermissions.length > 0) {
            const crmPrice = crmPermissions.length * this.pricing.CRM_PERMISSION;
            total += crmPrice;
            breakdown.push({
                item: `מערכת CRM (${crmPermissions.length} הרשאות)`,
                price: crmPrice,
                quantity: crmPermissions.length,
                unitPrice: this.pricing.CRM_PERMISSION
            });
        }

        // Calculate transcription permissions
        const transcriptionPermissions = permissions.filter(p => ['D', 'E', 'F'].includes(p));
        if (transcriptionPermissions.length > 0) {
            const transcriptionPrice = transcriptionPermissions.length * this.pricing.TRANSCRIPTION_PERMISSION;
            total += transcriptionPrice;
            breakdown.push({
                item: `אפליקציית תמלול (${transcriptionPermissions.length} הרשאות)`,
                price: transcriptionPrice,
                quantity: transcriptionPermissions.length,
                unitPrice: this.pricing.TRANSCRIPTION_PERMISSION
            });
        }

        return { total, breakdown };
    }

    getPermissionDetails(permissionCode) {
        // Check CRM permissions
        for (const [key, permission] of Object.entries(this.permissions.CRM)) {
            if (permission.code === permissionCode) {
                return {
                    ...permission,
                    category: 'CRM'
                };
            }
        }

        // Check transcription permissions
        for (const [key, permission] of Object.entries(this.permissions.TRANSCRIPTION)) {
            if (permission.code === permissionCode) {
                return {
                    ...permission,
                    category: 'TRANSCRIPTION'
                };
            }
        }

        return null;
    }

    formatPrice(amount) {
        return `₪${amount.toLocaleString('he-IL')}`;
    }

    validatePermissions(permissions, isAdmin) {
        const errors = [];

        if (!isAdmin && (!permissions || permissions.length === 0)) {
            errors.push('יש לבחור לפחות הרשאה אחת או להגדיר כמנהל מערכת');
        }

        return errors;
    }

    validateCompanyPermissions(permissions, companyName) {
        const errors = [];

        if (companyName && !permissions.some(p => ['A', 'B', 'C'].includes(p))) {
            errors.push('בעלי חברה חייבים להיות בעלי הרשאות CRM');
        }

        return errors;
    }

    applyDiscount(amount, discountPercent) {
        const discount = (amount * discountPercent) / 100;
        return {
            original: amount,
            discount: discount,
            final: amount - discount
        };
    }

    getPermissionsByCategory() {
        return {
            crm: Object.values(this.permissions.CRM),
            transcription: Object.values(this.permissions.TRANSCRIPTION)
        };
    }
}

export const pricingService = new PricingService();