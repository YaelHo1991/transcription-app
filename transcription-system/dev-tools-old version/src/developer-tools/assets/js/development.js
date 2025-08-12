/**
 * Development Page JavaScript
 * Handles admin tools, user management, and system monitoring
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080/api'
    : `http://${window.location.hostname}:8080/api`;

// State
let users = [];
let stats = {};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Development page loaded');
    
    loadUserInfo();
    loadStats();
    loadUsers();
});

// Load current user info
async function loadUserInfo() {
    try {
        // For development, we'll show a default admin user
        document.getElementById('user-name').textContent = 'מפתח מערכת';
    } catch (error) {
        console.error('Failed to load user info:', error);
        document.getElementById('user-name').textContent = 'משתמש לא מזוהה';
    }
}

// Load system statistics
async function loadStats() {
    const loadingStats = document.getElementById('loading-stats');
    const statsContainer = document.getElementById('stats-container');
    
    loadingStats.classList.add('show');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin_licenses.php?action=stats`);
        const data = await response.json();
        
        if (data.success) {
            stats = data.data.overview;
            displayStats(stats);
        } else {
            throw new Error(data.error || 'Failed to load stats');
        }
        
    } catch (error) {
        console.error('Failed to load stats:', error);
        
        // Show fallback stats
        const fallbackStats = {
            totalUsers: 5,
            adminCount: 1,
            crmUsers: 2,
            transcriberCount: 3,
            proofreaderCount: 2,
            exporterCount: 1,
            companyOwners: 1,
            companyEmployees: 2,
            individualUsers: 2
        };
        displayStats(fallbackStats);
        
        statsContainer.innerHTML += '<div class="error">⚠️ לא ניתן להתחבר ל-API החדש. מציג נתונים דמה.</div>';
    } finally {
        loadingStats.classList.remove('show');
    }
}

// Display statistics
function displayStats(stats) {
    const statsContainer = document.getElementById('stats-container');
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.totalUsers}</div>
            <div class="stat-label">סה"כ משתמשים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.adminCount}</div>
            <div class="stat-label">מנהלי מערכת</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.crmUsers}</div>
            <div class="stat-label">משתמשי CRM</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.transcriberCount}</div>
            <div class="stat-label">מתמללים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.proofreaderCount}</div>
            <div class="stat-label">מגיהים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.exporterCount}</div>
            <div class="stat-label">מייצאים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.companyOwners}</div>
            <div class="stat-label">בעלי חברות</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.companyEmployees}</div>
            <div class="stat-label">עובדי חברות</div>
        </div>
    `;
}

// Load users list
async function loadUsers() {
    const loadingUsers = document.getElementById('loading-users');
    const usersContainer = document.getElementById('users-container');
    
    loadingUsers.classList.add('show');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin_users.php`);
        const data = await response.json();
        
        if (data.success) {
            users = data.data.users;
            stats = data.data.stats; // Also update stats from the same call
            displayUsers(users);
            displayStats(stats); // Update stats display
        } else {
            throw new Error(data.error || 'Failed to load users');
        }
        
    } catch (error) {
        console.error('Failed to load users:', error);
        
        // Show fallback users
        const fallbackUsers = [
            {
                id: 1,
                username: 'admin',
                email: 'admin@system.com',
                password: 'admin123',
                fullName: 'מנהל מערכת',
                permissions: '',
                transcriberCode: 'TR10001',
                isAdmin: true,
                role: 'מנהל מערכת',
                company: null,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                username: 'transcriber',
                email: 'transcriber@test.com',
                password: 'transcriber123',
                fullName: 'מתמלל בדיקה',
                permissions: 'D',
                transcriberCode: 'TR10002',
                isAdmin: false,
                role: 'מתמלל',
                company: null,
                createdAt: new Date().toISOString()
            }
        ];
        
        displayUsers(fallbackUsers);
        usersContainer.innerHTML += '<div class="error">⚠️ לא ניתן להתחבר ל-API החדש. מציג נתונים דמה.</div>';
    } finally {
        loadingUsers.classList.remove('show');
    }
}

// Display users table
function displayUsers(usersList) {
    const usersContainer = document.getElementById('users-container');
    
    if (!usersList || usersList.length === 0) {
        usersContainer.innerHTML = '<p>אין משתמשים במערכת</p>';
        return;
    }
    
    let tableHTML = `
        <table class="user-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>שם מלא</th>
                    <th>שם משתמש</th>
                    <th>אימייל</th>
                    <th>סיסמה</th>
                    <th>תפקיד</th>
                    <th>הרשאות</th>
                    <th>קוד מתמלל</th>
                    <th>חברה</th>
                    <th>תאריך יצירה</th>
                    <th>פעולות</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    usersList.forEach(user => {
        const companyInfo = user.company ? `${user.company.name} (${user.company.role})` : '-';
        const adminBadge = user.isAdmin ? '<span class="admin-badge">מנהל</span>' : '';
        const companyBadge = user.company ? '<span class="company-badge">חברה</span>' : '';
        
        const deleteButton = user.username === 'admin' ? 
            '<span style="color: #666; font-size: 11px;">מוגן</span>' : 
            `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')">🗑️ מחק</button>`;

        tableHTML += `
            <tr>
                <td title="${user.id}">${user.id}</td>
                <td title="${escapeHtml(user.fullName)}">
                    ${escapeHtml(user.fullName)}
                    ${adminBadge}
                    ${companyBadge}
                </td>
                <td title="${escapeHtml(user.username)}">${escapeHtml(user.username)}</td>
                <td title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</td>
                <td title="${escapeHtml(user.password || '••••••••')}"><code>${escapeHtml(user.password || '••••••••')}</code></td>
                <td title="${escapeHtml(user.role)}">${escapeHtml(user.role)}</td>
                <td title="${escapeHtml(user.permissions)}"><code>${escapeHtml(user.permissions)}</code></td>
                <td title="${escapeHtml(user.transcriberCode)}">${escapeHtml(user.transcriberCode)}</td>
                <td title="${escapeHtml(companyInfo)}">${escapeHtml(companyInfo)}</td>
                <td title="${formatDate(user.createdAt)}">${formatDate(user.createdAt)}</td>
                <td>${deleteButton}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    usersContainer.innerHTML = tableHTML;
}

// Test new API functionality
async function testNewAPI() {
    try {
        // Test health endpoint
        const healthResponse = await fetch(`${API_BASE_URL}/../health`);
        const healthData = await healthResponse.json();
        
        if (healthData.status === 'OK') {
            alert('✅ API החדש עובד!\n\nסטטוס: ' + healthData.status + '\nגרסה: ' + healthData.version);
        } else {
            alert('⚠️ API החדש לא עובד כראוי');
        }
        
    } catch (error) {
        console.error('API test failed:', error);
        alert('❌ לא ניתן להתחבר ל-API החדש\n\nודא שהשרת רץ על פורט 8080');
    }
}

// Load API status
async function loadAPIStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin_licenses.php?action=stats`);
        const data = await response.json();
        
        const statusInfo = `
            סטטוס API:
            • מצב: ${data.success ? 'OK' : 'Error'}
            • URL: ${API_BASE_URL}
            • נתונים: ${data.data ? 'זמינים' : 'לא זמינים'}
        `;
        
        alert(statusInfo);
        
    } catch (error) {
        console.error('Failed to load API status:', error);
        alert('❌ לא ניתן להתחבר ל-API\n\nבדוק שהשרת רץ על פורט 8080');
    }
}

// Export users to CSV
function exportUsers() {
    if (!users || users.length === 0) {
        alert('אין משתמשים לייצוא');
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'שם מלא', 'שם משתמש', 'אימייל', 'סיסמה', 'תפקיד', 'הרשאות', 'קוד מתמלל', 'מנהל', 'חברה', 'תאריך יצירה'];
    const csvContent = [
        headers.join(','),
        ...users.map(user => [
            user.id,
            `"${user.fullName}"`,
            user.username,
            user.email,
            user.password || '••••••••',
            `"${user.role}"`,
            user.permissions,
            user.transcriberCode,
            user.isAdmin ? 'כן' : 'לא',
            user.company ? `"${user.company.name} (${user.company.role})"` : '',
            formatDate(user.createdAt)
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Logout function
async function logout() {
    try {
        // In a real app, you would call the logout API
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '../index.html';
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Development helper functions
// Delete user function
async function deleteUser(userId, username) {
    // Confirm deletion
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש '${username}'?\n\nפעולה זו לא ניתנת לביטול!`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin_users.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete_user',
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ המשתמש נמחק בהצלחה!');
            // Refresh the users list
            loadUsers();
        } else {
            throw new Error(data.error || 'שגיאה במחיקת המשתמש');
        }
        
    } catch (error) {
        console.error('Failed to delete user:', error);
        alert('❌ שגיאה במחיקת המשתמש: ' + error.message);
    }
}

window.devTools = {
    // Quick access to API testing
    testAPI: testNewAPI,
    
    // Quick access to data
    getUsers: () => users,
    getStats: () => stats,
    
    // Quick actions
    refreshAll: () => {
        loadStats();
        loadUsers();
    },
    
    // Delete user function
    deleteUser: deleteUser,
    
    // API endpoints for manual testing
    endpoints: {
        health: `${API_BASE_URL}/../health`,
        users: `${API_BASE_URL}/users`,
        stats: `${API_BASE_URL}/licenses/stats`,
        companies: `${API_BASE_URL}/companies`
    }
};

console.log('Development tools loaded. Use window.devTools for quick access.');