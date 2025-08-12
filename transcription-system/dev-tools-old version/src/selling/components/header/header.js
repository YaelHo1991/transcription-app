/**
 * Header Component
 */
export class HeaderComponent {
    constructor() {
        this.element = null;
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    async render() {
        const response = await fetch('./components/header/header.html');
        const html = await response.text();
        
        // Create a temporary container to hold the HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        this.element = temp.firstElementChild;
        
        // Load and apply styles
        this.loadStyles();
        
        return this.element;
    }

    loadStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './components/header/header.css';
        document.head.appendChild(link);
    }

    bindEvents() {
        // Add any header-specific event listeners here
        if (this.element) {
            const navLinks = this.element.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('mouseenter', this.handleLinkHover.bind(this));
                link.addEventListener('mouseleave', this.handleLinkLeave.bind(this));
            });
        }
    }

    handleLinkHover(event) {
        event.target.style.transform = 'translateY(-2px)';
    }

    handleLinkLeave(event) {
        event.target.style.transform = 'translateY(0)';
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
}