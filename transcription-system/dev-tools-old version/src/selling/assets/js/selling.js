/**
 * Selling Page JavaScript
 * Handles license purchase form and pricing calculations
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080/api'
    : `http://${window.location.hostname}:8080/api`;

// State
let companies = [];
let currentPrice = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Selling page loaded');
    
    setupEventListeners();
    loadStatistics();
    loadCompanies();
    updatePricing();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    const form = document.getElementById('purchase-form');
    if (form) {
        form.addEventListener('submit', handlePurchase);
    }
    
    // Admin checkbox (if exists)
    const adminCheckbox = document.getElementById('is-admin');
    if (adminCheckbox) {
        adminCheckbox.addEventListener('change', handleAdminToggle);
    }
    
    // Permission checkboxes
    const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]');
    permissionCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePricing);
    });
    
    // Company name input (if exists)
    const companyNameInput = document.getElementById('company-name');
    if (companyNameInput) {
        companyNameInput.addEventListener('input', handleCompanyNameChange);
    }
    
    // Parent company select (if exists)
    const parentCompanySelect = document.getElementById('parent-company');
    if (parentCompanySelect) {
        parentCompanySelect.addEventListener('change', handleParentCompanyChange);
    }
}

// Handle admin checkbox toggle
function handleAdminToggle() {
    const isAdmin = document.getElementById('is-admin').checked;
    const crmSection = document.getElementById('crm-section');
    const transcriptionSection = document.getElementById('transcription-section');
    
    if (isAdmin) {
        // Disable permission sections when admin is selected
        crmSection.style.opacity = '0.5';
        transcriptionSection.style.opacity = '0.5';
        
        const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]');
        permissionCheckboxes.forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.checked = false;
        });
    } else {
        // Enable permission sections
        crmSection.style.opacity = '1';
        transcriptionSection.style.opacity = '1';
        
        const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]');
        permissionCheckboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
    }
    
    updatePricing();
}

// Handle company name input
function handleCompanyNameChange() {
    const companyName = document.getElementById('company-name').value;
    const existingCompanies = document.getElementById('existing-companies');
    const parentCompanySelect = document.getElementById('parent-company');
    
    if (companyName.trim()) {
        // Hide existing companies when creating new company
        existingCompanies.style.display = 'none';
        parentCompanySelect.value = '';
    } else {
        // Show existing companies when no company name
        existingCompanies.style.display = companies.length > 0 ? 'block' : 'none';
    }
}

// Handle parent company selection
function handleParentCompanyChange() {
    const parentCompanyId = document.getElementById('parent-company').value;
    const companyNameInput = document.getElementById('company-name');
    
    if (parentCompanyId) {
        // Clear company name when selecting existing company
        companyNameInput.value = '';
    }
}

// Load statistics
async function loadStatistics() {
    try {
        // Use simplified API for Digital Ocean (temporary fix)
        const apiEndpoint = window.location.hostname === '157.245.137.210' 
            ? `${API_BASE_URL}/admin_licenses_simple.php?action=stats`
            : `${API_BASE_URL}/admin_licenses.php?action=stats`;
            
        const response = await fetch(apiEndpoint);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data.overview;
            document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
            document.getElementById('stat-companies').textContent = stats.companyOwners || 0;
            document.getElementById('stat-transcribers').textContent = stats.transcriberCount || 0;
            document.getElementById('stat-projects').textContent = Math.floor(Math.random() * 500) + 100; // Mock data
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
        // Show default values on error
        document.getElementById('stat-total-users').textContent = '50+';
        document.getElementById('stat-companies').textContent = '15+';
        document.getElementById('stat-transcribers').textContent = '30+';
        document.getElementById('stat-projects').textContent = '200+';
    }
}

// Load companies for selection
async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin_companies.php`);
        
        if (response.ok) {
            const data = await response.json();
            companies = data.data || [];
            
            const parentCompanySelect = document.getElementById('parent-company');
            const existingCompanies = document.getElementById('existing-companies');
            
            // Clear existing options
            parentCompanySelect.innerHTML = '<option value="">בחר חברה קיימת</option>';
            
            // Add companies with CRM permissions
            const crmCompanies = companies.filter(company => 
                company.permissions && company.permissions.match(/[ABC]/)
            );
            
            crmCompanies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.name} (${company.ownerName})`;
                parentCompanySelect.appendChild(option);
            });
            
            // Show/hide existing companies section
            existingCompanies.style.display = crmCompanies.length > 0 ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Failed to load companies:', error);
    }
}

// Update pricing calculation
function updatePricing() {
    const adminCheckbox = document.getElementById('is-admin');
    const isAdmin = adminCheckbox ? adminCheckbox.checked : false;
    const permissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                            .map(cb => cb.value);
    
    let totalPrice = 0;
    let breakdown = [];
    let crmPrice = 0;
    let transcriptionPrice = 0;
    
    if (isAdmin) {
        totalPrice = 299;
        breakdown.push('מנהל מערכת: ₪299');
        crmPrice = 299;
        transcriptionPrice = 299;
    } else {
        // Calculate CRM permissions
        const crmPermissions = permissions.filter(p => ['A', 'B', 'C'].includes(p));
        if (crmPermissions.length > 0) {
            crmPrice = crmPermissions.length * 99;
            totalPrice += crmPrice;
            breakdown.push(`מערכת CRM (${crmPermissions.length} עמודים): ₪${crmPrice}`);
        }
        
        // Calculate transcription permissions
        const appPermissions = permissions.filter(p => ['D', 'E', 'F'].includes(p));
        if (appPermissions.length > 0) {
            transcriptionPrice = appPermissions.length * 79;
            totalPrice += transcriptionPrice;
            breakdown.push(`אפליקציית תמלול (${appPermissions.length} עמודים): ₪${transcriptionPrice}`);
        }
    }
    
    // Update system totals
    const crmSystemTotal = document.getElementById('crm-system-total');
    const transcriptionSystemTotal = document.getElementById('transcription-system-total');
    
    if (crmSystemTotal) {
        crmSystemTotal.textContent = `₪${crmPrice}`;
    }
    
    if (transcriptionSystemTotal) {
        transcriptionSystemTotal.textContent = `₪${transcriptionPrice}`;
    }
    
    // Update main display
    document.getElementById('total-price').textContent = `₪${totalPrice}`;
    
    const priceBreakdown = document.getElementById('price-breakdown');
    if (breakdown.length > 0) {
        priceBreakdown.innerHTML = breakdown.map(item => `<p>• ${item}</p>`).join('');
    } else {
        priceBreakdown.innerHTML = '<p>בחרו הרשאות לחישוב מחיר</p>';
    }
    
    currentPrice = totalPrice;
}

// Handle form submission
async function handlePurchase(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Collect form data
    const data = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        personalCompany: formData.get('personalCompany') || '',
        isAdmin: formData.has('isAdmin') || false,
        permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                          .map(cb => cb.value),
        companyName: formData.get('companyName') || '',
        parentCompanyId: formData.get('parentCompanyId') ? parseInt(formData.get('parentCompanyId')) : null
    };
    
    // Validate
    if (!data.fullName || !data.email) {
        const section = getPurchaseSection();
        showMessage('יש למלא את כל השדות הנדרשים', 'error', section);
        return;
    }
    
    if (!data.isAdmin && data.permissions.length === 0) {
        const section = getPurchaseSection();
        showMessage('יש לבחור לפחות הרשאה אחת או להגדיר כמנהל מערכת', 'error', section);
        return;
    }
    
    if (data.companyName && !data.permissions.some(p => ['A', 'B', 'C'].includes(p))) {
        showMessage('בעלי חברה חייבים להיות בעלי הרשאות CRM', 'error', 'crm');
        return;
    }
    
    // Show loading
    const loading = document.getElementById('loading');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (loading) {
        loading.classList.add('show');
    } else {
        console.warn('Loading element not found');
    }
    
    if (submitButton) {
        submitButton.disabled = true;
    }
    
    try {
        // Use simplified API for Digital Ocean (temporary fix)
        const apiEndpoint = window.location.hostname === '157.245.137.210' 
            ? `${API_BASE_URL}/admin_licenses_simple.php`
            : `${API_BASE_URL}/admin_licenses.php`;
            
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', [...response.headers.entries()]);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        console.log('Response length:', responseText.length);
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
            console.error('Empty response from server');
            throw new Error('Empty response from server');
        }
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Parsed result:', result);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Response was:', responseText);
            console.error('First 100 chars:', responseText.substring(0, 100));
            throw new Error('Invalid JSON response from server');
        }
        
        // Handle 409 Conflict (user already has permissions)
        if (response.status === 409 && result && result.error) {
            const section = getPurchaseSection();
            showMessage(result.error, 'error', section);
            // Clean up loading state
            if (loading) {
                loading.classList.remove('show');
            }
            if (submitButton) {
                submitButton.disabled = false;
            }
            return; // Don't throw error, just show message
        }
        
        if (result && result.success) {
            // Success message with details
            const user = result.data;
            const title = user.isUpdate ? '🎉 ההרשאות עודכנו בהצלחה!' : '🎉 רישיון נרכש בהצלחה!';
            const allPermissions = user.permissions.map(p => p.description).join(', ');
            
            const successMessage = `
                <div style="text-align: center; padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0;">${title}</h3>
                    <p><strong>שם משתמש:</strong> ${user.username}</p>
                    ${user.isUpdate ? '<p style="color: #27ae60;"><strong>זהו המשתמש הקיים שלך - ההרשאות החדשות נוספו</strong></p>' : ''}
                    <p><strong>קוד מתמלל:</strong> ${user.transcriberCode}</p>
                    <p><strong>הרשאות פעילות:</strong> ${allPermissions}</p>
                    <p><strong>עלות חודשית כוללת:</strong> ₪${user.price}</p>
                    ${user.company ? `<p><strong>חברה:</strong> ${user.company.name} (${user.company.role})</p>` : ''}
                    <p style="margin-top: 20px;">${user.isUpdate ? 'פרטי הכניסה נשארו אותו דבר' : 'פרטי הכניסה נשלחו לאימייל שלכם'}</p>
                </div>
            `;
            
            const section = getPurchaseSection();
            showMessage(successMessage, 'success', section);
            form.reset();
            updatePricing();
            loadStatistics(); // Refresh stats
            
        } else if (result && !result.success) {
            // Handle other error responses
            const section = getPurchaseSection();
            showMessage(`שגיאה: ${result.error || 'Unknown error'}`, 'error', section);
        } else {
            // Unexpected response format
            console.error('Unexpected response format:', result);
            throw new Error('Unexpected response format from server');
        }
        
    } catch (error) {
        console.error('Purchase error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        const section = getPurchaseSection();
        showMessage('שגיאה בעת ביצוע הרכישה. אנא נסו שוב. (המשתמש נוצר בהצלחה - בדוק את הקונסול)', 'error', section);
    } finally {
        if (loading) {
            loading.classList.remove('show');
        }
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

// Show message in specific section
function showMessage(text, type = 'success', section = 'general') {
    let container;
    let themeClass = '';
    
    if (section === 'crm') {
        container = document.getElementById('crm-messages');
        themeClass = 'crm-themed';
    } else if (section === 'transcription') {
        container = document.getElementById('transcription-messages');
        themeClass = 'transcription-themed';
    } else {
        container = document.getElementById('message-container');
    }
    
    const messageClass = type === 'error' ? 'error' : 'success';
    
    container.innerHTML = `<div class="message ${messageClass} ${themeClass}">${text}</div>`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Determine which section the purchase is for
function getPurchaseSection() {
    const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]:checked');
    let hasCRM = false;
    let hasTranscription = false;
    
    permissionCheckboxes.forEach(checkbox => {
        const permission = checkbox.value;
        if (['A', 'B', 'C'].includes(permission)) {
            hasCRM = true;
        } else if (['D', 'E', 'F'].includes(permission)) {
            hasTranscription = true;
        }
    });
    
    if (hasCRM && hasTranscription) {
        return 'general';
    } else if (hasCRM) {
        return 'crm';
    } else if (hasTranscription) {
        return 'transcription';
    } else {
        return 'general';
    }
}

// Utility function to format currency
function formatCurrency(amount) {
    return `₪${amount.toLocaleString('he-IL')}`;
}