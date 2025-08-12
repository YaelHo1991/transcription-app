/**
 * Statistics Component
 */
import { API_CONFIG } from '../../config/api.js';

export class StatisticsComponent {
    constructor() {
        this.element = null;
        this.data = null;
        this.init();
    }

    init() {
        this.render();
        this.loadData();
    }

    async render() {
        const response = await fetch('./components/statistics/statistics.html');
        const html = await response.text();
        
        const temp = document.createElement('div');
        temp.innerHTML = html;
        this.element = temp.firstElementChild;
        
        this.loadStyles();
        
        return this.element;
    }

    loadStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './components/statistics/statistics.css';
        document.head.appendChild(link);
    }

    async loadData() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STATISTICS}`);
            const data = await response.json();
            
            if (data.success) {
                this.data = data.data.overview;
                this.updateDisplay();
            } else {
                this.showFallbackData();
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
            this.showFallbackData();
        }
    }

    updateDisplay() {
        if (!this.element || !this.data) return;
        
        const elements = {
            totalUsers: this.element.querySelector('#stat-total-users'),
            companies: this.element.querySelector('#stat-companies'),
            transcribers: this.element.querySelector('#stat-transcribers'),
            projects: this.element.querySelector('#stat-projects')
        };
        
        if (elements.totalUsers) {
            elements.totalUsers.textContent = this.data.totalUsers || 0;
        }
        
        if (elements.companies) {
            elements.companies.textContent = this.data.companyOwners || 0;
        }
        
        if (elements.transcribers) {
            elements.transcribers.textContent = this.data.transcriberCount || 0;
        }
        
        if (elements.projects) {
            // Mock project data as it's not in the API yet
            elements.projects.textContent = Math.floor(Math.random() * 500) + 100;
        }
        
        this.animateCounters();
    }

    showFallbackData() {
        const fallbackData = {
            totalUsers: '50+',
            companyOwners: '15+',
            transcriberCount: '30+',
            projects: '200+'
        };
        
        if (this.element) {
            const elements = {
                totalUsers: this.element.querySelector('#stat-total-users'),
                companies: this.element.querySelector('#stat-companies'),
                transcribers: this.element.querySelector('#stat-transcribers'),
                projects: this.element.querySelector('#stat-projects')
            };
            
            if (elements.totalUsers) elements.totalUsers.textContent = fallbackData.totalUsers;
            if (elements.companies) elements.companies.textContent = fallbackData.companyOwners;
            if (elements.transcribers) elements.transcribers.textContent = fallbackData.transcriberCount;
            if (elements.projects) elements.projects.textContent = fallbackData.projects;
        }
    }

    animateCounters() {
        const counters = this.element.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent) || 0;
            const increment = target / 50;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current);
            }, 30);
        });
    }

    mount(container) {
        if (this.element && container) {
            container.appendChild(this.element);
        }
    }

    unmount() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    refresh() {
        this.loadData();
    }
}