/**
 * Main Application
 */
import { HeaderComponent } from '../components/header/header.js';
import { StatisticsComponent } from '../components/statistics/statistics.js';
import { apiService } from './services/api.js';
import { pricingService } from './services/pricing.js';

class SellingApp {
    constructor() {
        this.components = {};
        this.state = {
            loading: false,
            error: null
        };
        this.init();
    }

    async init() {
        try {
            await this.loadStyles();
            await this.initializeComponents();
            this.bindGlobalEvents();
            console.log('Selling app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize selling app:', error);
            this.handleError(error);
        }
    }

    async loadStyles() {
        const mainStyles = document.createElement('link');
        mainStyles.rel = 'stylesheet';
        mainStyles.href = './styles/main.css';
        document.head.appendChild(mainStyles);
    }

    async initializeComponents() {
        // Initialize header
        this.components.header = new HeaderComponent();
        const headerElement = await this.components.header.render();
        document.body.insertBefore(headerElement, document.body.firstChild);

        // Initialize statistics
        this.components.statistics = new StatisticsComponent();
        const statsElement = await this.components.statistics.render();
        
        // Find or create hero section to mount statistics
        let heroSection = document.querySelector('.hero-section');
        if (!heroSection) {
            heroSection = document.createElement('div');
            heroSection.className = 'hero-section';
            heroSection.innerHTML = `
                <h1>🚀 הצטרפו למערכת התמלול המתקדמת</h1>
                <p>פתרון מקצועי לתמלול, ניהול לקוחות ועיבוד אודיו</p>
                <div id="statistics-container"></div>
            `;
            
            const mainContainer = document.querySelector('.main-container') || document.body;
            mainContainer.appendChild(heroSection);
        }
        
        const statsContainer = heroSection.querySelector('#statistics-container') || heroSection;
        statsContainer.appendChild(statsElement);
    }

    bindGlobalEvents() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshComponents();
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.id === 'purchase-form') {
                this.handlePurchaseSubmit(event);
            }
        });
    }

    async handlePurchaseSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            isAdmin: formData.has('isAdmin'),
            permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                          .map(cb => cb.value),
            companyName: formData.get('companyName') || '',
            parentCompanyId: formData.get('parentCompanyId') ? 
                            parseInt(formData.get('parentCompanyId')) : null
        };

        try {
            this.setLoading(true);
            
            // Validate data
            const validationErrors = this.validatePurchaseData(data);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // Calculate pricing
            const pricing = pricingService.calculateLicensePrice(data.permissions, data.isAdmin);
            data.pricing = pricing;

            // Submit purchase
            const response = await apiService.post('/admin_licenses.php', data);
            
            if (response.success) {
                this.handlePurchaseSuccess(response.data);
            } else {
                throw new Error(response.error || 'Purchase failed');
            }
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    validatePurchaseData(data) {
        const errors = [];

        if (!data.fullName || data.fullName.trim().length < 2) {
            errors.push('שם מלא חובה');
        }

        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('כתובת אימייל לא תקינה');
        }

        const permissionErrors = pricingService.validatePermissions(data.permissions, data.isAdmin);
        errors.push(...permissionErrors);

        const companyErrors = pricingService.validateCompanyPermissions(data.permissions, data.companyName);
        errors.push(...companyErrors);

        return errors;
    }

    handlePurchaseSuccess(data) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            const successMessage = `
                <div class="message success">
                    <h3>🎉 רישיון נרכש בהצלחה!</h3>
                    <p><strong>שם משתמש:</strong> ${data.username}</p>
                    <p><strong>קוד מתמלל:</strong> ${data.transcriberCode}</p>
                    <p><strong>עלות חודשית:</strong> ${pricingService.formatPrice(data.price)}</p>
                    ${data.company ? `<p><strong>חברה:</strong> ${data.company.name}</p>` : ''}
                    <p>פרטי הכניסה נשלחו לאימייל שלכם</p>
                </div>
            `;
            messageContainer.innerHTML = successMessage;
        }

        // Reset form
        const form = document.getElementById('purchase-form');
        if (form) {
            form.reset();
        }

        // Refresh statistics
        this.refreshComponents();
    }

    setLoading(isLoading) {
        this.state.loading = isLoading;
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.toggle('show', isLoading);
        }

        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.textContent = isLoading ? 'מעבד...' : '🛒 רכישת רישיון';
        }
    }

    handleError(error) {
        console.error('Application error:', error);
        
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            const errorMessage = `
                <div class="message error">
                    <h4>שגיאה</h4>
                    <p>${error.message || 'אירעה שגיאה לא צפויה'}</p>
                </div>
            `;
            messageContainer.innerHTML = errorMessage;
        }

        // Clear error message after 5 seconds
        setTimeout(() => {
            const messageContainer = document.getElementById('message-container');
            if (messageContainer) {
                messageContainer.innerHTML = '';
            }
        }, 5000);
    }

    refreshComponents() {
        // Refresh statistics
        if (this.components.statistics) {
            this.components.statistics.refresh();
        }
    }

    getState() {
        return { ...this.state };
    }

    destroy() {
        // Clean up components
        Object.values(this.components).forEach(component => {
            if (component.unmount) {
                component.unmount();
            }
        });
        
        this.components = {};
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sellingApp = new SellingApp();
});

export default SellingApp;