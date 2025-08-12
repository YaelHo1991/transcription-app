/*
 * =========================================
 * Transcription System - Main JavaScript
 * assets/js/main.js
 * =========================================
 * Shared functionality for all pages
 */

// Global variables
let currentProject = null;
let autoSaveInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeCommon();
    initializePageSpecific();
});

// Common initialization
function initializeCommon() {
    // Auto-hide messages after 5 seconds
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        setTimeout(() => {
            message.style.transition = 'all 0.3s ease';
            message.style.opacity = '0';
            message.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });

    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form validation
    initializeFormValidation();
}

// Page-specific initialization
function initializePageSpecific() {
    const currentPage = document.body.getAttribute('data-page');
    
    switch(currentPage) {
        case 'dashboard':
            initializeDashboard();
            break;
        case 'transcription':
            initializeTranscription();
            break;
        case 'proofreading':
            initializeProofreading();
            break;
        case 'export':
            initializeExport();
            break;
        case 'records':
            initializeRecords();
            break;
    }
}

// Tooltip initialization
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

// Show tooltip
function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.getAttribute('title');
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
    
    e.target.setAttribute('data-original-title', e.target.getAttribute('title'));
    e.target.removeAttribute('title');
}

// Hide tooltip
function hideTooltip(e) {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }
    
    const originalTitle = e.target.getAttribute('data-original-title');
    if (originalTitle) {
        e.target.setAttribute('title', originalTitle);
        e.target.removeAttribute('data-original-title');
    }
}

// Form validation initialization
function initializeFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', validateForm);
    });
}

// Validate form
function validateForm(e) {
    const form = e.target;
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'שדה זה הוא חובה');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Email validation
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'כתובת אימייל לא תקינה');
            isValid = false;
        }
    });
    
    if (!isValid) {
        e.preventDefault();
    }
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '5px';
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#dc3545';
}

// Clear field error
function clearFieldError(field) {
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    field.style.borderColor = '';
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show loading state
function showLoading(element) {
    element.innerHTML = '<div class="loading-spinner"></div>';
    element.disabled = true;
}

// Hide loading state
function hideLoading(element, originalContent) {
    element.innerHTML = originalContent;
    element.disabled = false;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '300px';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// AJAX helper
function ajaxRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        
        if (method === 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error('Request failed: ' + xhr.status));
                }
            }
        };
        
        if (data) {
            const params = new URLSearchParams(data);
            xhr.send(params.toString());
        } else {
            xhr.send();
        }
    });
}

// Format time helper
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Format file size helper
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Auto-save functionality
function startAutoSave(saveFunction, interval = 60000) {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(() => {
        saveFunction();
    }, interval);
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Page-specific initialization functions (to be implemented in each page)
function initializeDashboard() {
    console.log('Dashboard initialized');
}

function initializeTranscription() {
    console.log('Transcription initialized');
}

function initializeProofreading() {
    console.log('Proofreading initialized');
}

function initializeExport() {
    console.log('Export initialized');
}

function initializeRecords() {
    console.log('Records initialized');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const saveButton = document.querySelector('.btn-save, .btn-primary');
        if (saveButton && !saveButton.disabled) {
            saveButton.click();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }
});

// Prevent accidental page reload
window.addEventListener('beforeunload', function(e) {
    if (document.querySelector('.unsaved-changes')) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Export functions for use in other files
window.TranscriptionSystem = {
    showNotification,
    ajaxRequest,
    formatTime,
    formatFileSize,
    startAutoSave,
    stopAutoSave,
    showLoading,
    hideLoading
};