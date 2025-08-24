export const developmentHTML = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>לוח בקרה למפתחים</title>
    <style>
        /* Professional Development Page Styling */
        :root {
            --dev-primary: #2c3e50;
            --dev-secondary: #34495e;
            --dev-accent: #3498db;
            --dev-success: #27ae60;
            --dev-warning: #f39c12;
            --dev-danger: #e74c3c;
            --dev-light: #ecf0f1;
            --dev-dark: #2c3e50;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            margin: 0;
            padding: 0;
            padding-top: 50px; /* Account for fixed navigation */
            color: #2c3e50;
            background: #f8f9fa;
        }

        /* Developer Navigation Bar */
        #dev-navigation-bar {
            background: #34495e !important;
            padding: 0 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 2147483647 !important;
            margin: 0 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            height: 50px !important;
        }

        #dev-navigation-bar .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 100%;
        }

        #dev-navigation-bar a {
            display: inline-flex;
            align-items: center;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            transition: background 0.3s;
            font-size: 14px !important;
        }

        #dev-navigation-bar a:hover {
            background: #3d566e !important;
        }

        #dev-navigation-bar .home-link {
            background: #2c3e50;
        }

        #dev-navigation-bar .nav-links {
            display: flex;
            flex: 1;
        }

        #dev-navigation-bar .mode-toggle {
            padding: 10px 20px;
            margin-left: 10px;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }

        #dev-navigation-bar .mode-toggle.dev-mode {
            background: #e74c3c;
        }

        #dev-navigation-bar .mode-toggle.regular-mode {
            background: #27ae60;
        }

        .development-container {
            width: 100%;
            min-height: 100vh;
            background: white;
            display: flex;
            flex-direction: column;
        }

        .dev-header {
            background: var(--dev-primary);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .dev-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .mode-controls {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .dev-content {
            flex: 1;
            padding: 30px;
            overflow-x: auto;
        }

        .stats-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e3e6f0;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--dev-accent);
            margin-bottom: 5px;
        }

        .stat-label {
            color: #5a5c69;
            font-size: 14px;
        }

        .users-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-x: auto;
        }

        .users-section h3 {
            color: var(--dev-primary);
            margin-bottom: 20px;
            font-size: 18px;
        }

        .table-container {
            overflow-x: auto;
            margin-top: 10px;
        }

        .user-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            min-width: 1000px;
        }

        .user-table th,
        .user-table td {
            padding: 12px 8px;
            text-align: right;
            border-bottom: 1px solid #dee2e6;
            white-space: nowrap;
        }

        .user-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: var(--dev-primary);
            position: sticky;
            top: 0;
        }

        .user-table tr:hover {
            background: #f8f9fa;
        }

        .user-table code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', monospace;
            color: #e74c3c;
            font-size: 12px;
        }

        .admin-badge {
            background: var(--dev-danger);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-right: 5px;
        }

        .tools-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .tool-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .tool-card h4 {
            color: var(--dev-primary);
            margin-bottom: 15px;
        }

        .tool-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .tool-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            text-align: right;
        }

        .tool-btn.primary {
            background: var(--dev-accent);
            color: white;
        }

        .tool-btn.success {
            background: var(--dev-success);
            color: white;
        }

        .tool-btn.warning {
            background: var(--dev-warning);
            color: white;
        }

        .tool-btn.danger {
            background: var(--dev-danger);
            color: white;
        }

        .tool-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #6c757d;
        }

        @media (max-width: 768px) {
            .dev-header {
                flex-direction: column;
                gap: 15px;
            }

            .user-table {
                font-size: 12px;
            }

            .user-table th,
            .user-table td {
                padding: 8px 4px;
            }
        }
    </style>
</head>
<body>
    <!-- Developer Navigation Bar -->
    <nav id="dev-navigation-bar">
        <div class="nav-container">
            <a href="javascript:void(0)" onclick="navigateTo('/dev-portal')" class="home-link">
                <span style="font-size: 20px; margin-left: 8px;">🏠</span>
                <span>דף הבית</span>
            </a>
            <div class="nav-links">
                <a href="/dev" style="background: rgba(255,255,255,0.1); border-radius: 4px;">
                    🔧 לוח פיתוח
                </a>
                <a href="javascript:void(0)" onclick="navigateTo('/licenses')">
                    📋 מכירת רישיונות
                </a>
                <a href="javascript:void(0)" onclick="navigateTo('/crm')">
                    👥 CRM
                </a>
                <a href="javascript:void(0)" onclick="navigateTo('/transcription')">
                    🎯 תמלול
                </a>
                <a href="javascript:void(0)" onclick="window.location.href = window.location.protocol + '//' + window.location.hostname + '/dev-portal/shortcuts-admin'; return false;">
                    ⌨️ קיצורים
                </a>
                <a href="/api" target="_blank">
                    🖥️ שרת
                </a>
            </div>
            <a href="#" class="mode-toggle dev-mode" onclick="toggleMode(); return false;">
                🔓 מצב פיתוח
            </a>
        </div>
    </nav>

    <div class="development-container">
        <div class="dev-header">
            <h1>⚙️ לוח בקרה למפתחים</h1>
            <div class="mode-controls">
                <span>מצב נוכחי: פיתוח</span>
            </div>
        </div>

        <div class="dev-content">
            <div class="stats-section" id="stats-container">
                <div class="stat-card">
                    <div class="stat-number" id="total-users">0</div>
                    <div class="stat-label">סה"כ משתמשים</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="admin-users">0</div>
                    <div class="stat-label">מנהלי מערכת</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="crm-users">0</div>
                    <div class="stat-label">משתמשי CRM</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="transcribers">0</div>
                    <div class="stat-label">מתמללים</div>
                </div>
            </div>

            <div class="users-section">
                <h3>👥 טבלת משתמשים והרשאות</h3>
                <div id="loading-users" class="loading">טוען משתמשים...</div>
                <div id="users-container" style="display: none;">
                    <div class="table-container">
                        <table class="user-table">
                            <thead>
                                <tr>
                                    <th>שם מלא</th>
                                    <th>שם משתמש / אימייל</th>
                                    <th>סיסמה</th>
                                    <th>הרשאות</th>
                                    <th>קוד מתמלל</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="users-tbody">
                                <!-- Users will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="tools-section">
                <div class="tool-card">
                    <h4>🔧 כלי מערכת</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="testAPI()">בדוק API</button>
                        <button class="tool-btn success" onclick="loadAPIStatus()">סטטוס API</button>
                        <button class="tool-btn warning" onclick="exportUsers()">ייצא משתמשים</button>
                        <button class="tool-btn danger" onclick="clearSessions()">נקה סשנים</button>
                    </div>
                </div>

                <div class="tool-card">
                    <h4>📊 ניהול נתונים</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="showDatabaseInfo()">בדוק טבלאות</button>
                        <button class="tool-btn success" onclick="showSystemInfo()">מידע מערכת</button>
                        <button class="tool-btn warning" onclick="backupData()">גיבוי נתונים</button>
                        <button class="tool-btn danger" onclick="showDemoMessage('בנה מחדש')">בנה מחדש</button>
                    </div>
                </div>

                <div class="tool-card">
                    <h4>🚀 פיתוח</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="refreshPage()">רענן נתונים</button>
                        <button class="tool-btn success" onclick="navigateTo('/licenses')">הוסף משתמשים</button>
                        <button class="tool-btn warning" onclick="testConnections()">בדוק חיבורים</button>
                        <button class="tool-btn danger" onclick="showDemoMessage('איפוס מערכת')">איפוס מערכת</button>
                    </div>
                </div>

                <div class="tool-card">
                    <h4>📝 ניהול קיצורים</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="window.location.href = window.location.protocol + '//' + window.location.hostname + '/dev-portal/shortcuts-admin'">ניהול קיצורי מערכת</button>
                        <button class="tool-btn success" onclick="showShortcutsStats()">סטטיסטיקות קיצורים</button>
                        <button class="tool-btn warning" onclick="exportSystemShortcuts()">ייצא קיצורי מערכת</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Load users and stats on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadUsers();
            loadStats();
        });

        async function loadUsers() {
            try {
                console.log('Loading users from /dev/api/users...');
                const response = await fetch('/dev/api/users');
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const users = await response.json();
                console.log('Loaded users:', users);
                
                const tbody = document.getElementById('users-tbody');
                if (!tbody) {
                    console.error('Could not find users-tbody element');
                    return;
                }
                tbody.innerHTML = '';
                
                if (!Array.isArray(users)) {
                    console.error('Users is not an array:', users);
                    throw new Error('Invalid response format');
                }
                
                users.forEach(user => {
                    console.log('User:', user.username, 'Permissions:', user.permissions, 'Type:', typeof user.permissions);
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td>
                            <strong>\${user.full_name || 'לא מוגדר'}</strong>
                            \${user.is_admin ? '<span class="admin-badge">מנהל</span>' : ''}
                        </td>
                        <td>\${user.email || user.username}</td>
                        <td><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 14px;">\${user.plain_password || user.password_hint || 'Password123!'}</code></td>
                        <td><code style="color: #b85042; font-weight: bold;">\${user.permissions && user.permissions.trim() !== '' ? user.permissions : 'ללא הרשאות'}</code></td>
                        <td><code style="color: #2196F3;">\${user.transcriber_code || '-'}</code></td>
                        <td>
                            \${user.username !== 'admin' ? 
                                \`<button class="tool-btn danger" style="padding: 4px 12px; font-size: 12px;" onclick="deleteUser('\${user.id}', '\${user.username}')">🗑️ מחק</button>\` 
                                : ''}
                        </td>
                    \`;
                    tbody.appendChild(row);
                });
                
                document.getElementById('loading-users').style.display = 'none';
                document.getElementById('users-container').style.display = 'block';
            } catch (error) {
                console.error('Error loading users:', error);
                const errorMsg = (error && error.message) || 'Unknown error';
                document.getElementById('loading-users').innerHTML = 'שגיאה בטעינת משתמשים: ' + errorMsg;
            }
        }

        async function loadStats() {
            try {
                const response = await fetch('/dev/api/stats');
                const stats = await response.json();
                
                document.getElementById('total-users').textContent = stats.totalUsers;
                document.getElementById('admin-users').textContent = stats.adminUsers;
                document.getElementById('crm-users').textContent = stats.crmUsers;
                document.getElementById('transcribers').textContent = stats.transcribers;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        function getRoleFromPermissions(user) {
            if (user.is_admin) return 'מנהל מערכת';
            if (user.permissions?.includes('A')) return 'מנהל CRM';
            if (user.permissions?.includes('D')) return 'מתמלל';
            if (user.permissions?.includes('E')) return 'מגיה';
            if (user.permissions?.includes('F')) return 'מייצא';
            return 'משתמש';
        }

        async function deleteUser(userId, username) {
            if (!confirm(\`האם אתה בטוח שברצונך למחוק את המשתמש "\${username}"?\\n\\nפעולה זו לא ניתנת לביטול!\`)) {
                return;
            }

            try {
                const response = await fetch(\`/dev/api/users/\${userId}\`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('המשתמש נמחק בהצלחה');
                    loadUsers();
                    loadStats();
                } else {
                    alert('שגיאה במחיקת המשתמש');
                }
            } catch (error) {
                alert('שגיאת רשת: ' + error.message);
            }
        }

        async function clearSessions() {
            if (!confirm('האם אתה בטוח שברצונך לנקות את כל הסשנים?\\n\\nכל המשתמשים המחוברים יצטרכו להתחבר מחדש.')) {
                return;
            }

            try {
                const response = await fetch('/dev/api/clear-sessions', {
                    method: 'POST'
                });

                if (response.ok) {
                    alert('כל הסשנים נוקו בהצלחה');
                } else {
                    alert('שגיאה בניקוי סשנים');
                }
            } catch (error) {
                alert('שגיאת רשת: ' + error.message);
            }
        }

        function exportUsers() {
            // Create CSV content
            const table = document.querySelector('.user-table');
            if (!table) {
                alert('לא נמצאה טבלת משתמשים');
                return;
            }
            
            let csv = '\\ufeff'; // UTF-8 BOM for Hebrew
            
            // Get headers
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            csv += headers.slice(0, -1).join(',') + '\\n'; // Exclude the last column (actions)
            
            // Get rows
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).slice(0, -1); // Exclude actions column
                const rowData = cells.map(cell => {
                    let text = cell.textContent.trim();
                    // Quote fields that contain commas or quotes
                    if (text.includes(',') || text.includes('"')) {
                        text = '"' + text.replace(/"/g, '""') + '"';
                    }
                    return text;
                });
                csv += rowData.join(',') + '\\n';
            });
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'users_' + new Date().toISOString().slice(0,10) + '.csv';
            link.click();
        }

        function testAPI() {
            fetch('/dev/api/test-connection')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('API Testing - Success\\n\\nDatabase connected: ' + new Date(data.timestamp).toLocaleString('he-IL'));
                    } else {
                        alert('API Testing - Failed\\n\\nError: ' + data.error);
                    }
                })
                .catch(error => {
                    alert('API Testing - Network Error\\n\\n' + error.message);
                });
        }

        function loadAPIStatus() {
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    alert(\`API Status\\n\\nStatus: \${data.status}\\nDatabase: \${data.database}\\nEnvironment: \${data.environment}\\nTime: \${new Date(data.timestamp).toLocaleString('he-IL')}\`);
                })
                .catch(error => {
                    alert('Failed to get API status: ' + error.message);
                });
        }

        function showDatabaseInfo() {
            fetch('/dev/api/system-info')
                .then(response => response.json())
                .then(data => {
                    alert(\`Database Info\\n\\nHost: \${data.database.host}\\nPort: \${data.database.port}\\nDatabase: \${data.database.database}\\nNode: \${data.node_version}\\nPlatform: \${data.platform}\`);
                })
                .catch(error => {
                    alert('Failed to get database info: ' + error.message);
                });
        }

        function showSystemInfo() {
            fetch('/dev/api/system-info')
                .then(response => response.json())
                .then(data => {
                    const memory = data.memory;
                    const memoryUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
                    const memoryTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
                    const uptimeHours = Math.round(data.uptime / 3600);
                    
                    alert(\`System Info\\n\\nNode Version: \${data.node_version}\\nPlatform: \${data.platform}\\nEnvironment: \${data.env}\\nMemory: \${memoryUsedMB}MB / \${memoryTotalMB}MB\\nUptime: \${uptimeHours} hours\`);
                })
                .catch(error => {
                    alert('Failed to get system info: ' + error.message);
                });
        }

        function testConnections() {
            const connections = [
                { name: 'Database', url: '/dev/api/test-connection' },
                { name: 'Server API', url: '/health' },
                { name: 'Frontend', url: '/' }
            ];
            
            let results = 'בדיקת חיבורים:\\n\\n';
            let completed = 0;
            
            connections.forEach(conn => {
                fetch(conn.url, { mode: 'no-cors' })
                    .then(() => {
                        results += \`✅ \${conn.name}: מחובר\\n\`;
                    })
                    .catch(() => {
                        results += \`❌ \${conn.name}: לא זמין\\n\`;
                    })
                    .finally(() => {
                        completed++;
                        if (completed === connections.length) {
                            alert(results);
                        }
                    });
            });
        }

        function refreshPage() {
            loadUsers();
            loadStats();
        }

        function backupData() {
            alert('גיבוי נתונים - Development Mode\\n\\nThis would backup all data to a secure location.');
        }

        function showDemoMessage(toolName) {
            alert(\`כלי "\${toolName}" זמין במצב הדגמה בלבד.\\n\\nבמצב פיתוח מלא, הכלי יבצע את הפעולה הנדרשת.\`);
        }

        function showShortcutsStats() {
            // Mock data for now
            alert(\`סטטיסטיקות קיצורים\\n\\n🔤 קיצורי מערכת: 45\\n👤 קיצורים אישיים (ממוצע): 12\\n📊 קטגוריות: 7\\n🔥 הכי נפוץ: ע'ד (עורך דין)\\n\\n📈 סה"כ שימושים החודש: 1,234\`);
        }

        function exportSystemShortcuts() {
            // Mock export for now
            const csv = 'קיצור,טקסט מלא,קטגוריה\\n' +
                       'ע\\'ד,עורך דין,משפטי\\n' +
                       'ביהמ\\'ש,בית המשפט,משפטי\\n' +
                       'ב\\'ר,בריא,רפואי\\n';
            
            const blob = new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'system_shortcuts_' + new Date().toISOString().slice(0,10) + '.csv';
            link.click();
        }

        function navigateTo(path) {
            // Get the current host
            const currentHost = window.location.host;
            const protocol = window.location.protocol;
            
            // Frontend routes that should go to the frontend server
            const frontendRoutes = ['/dev-portal', '/licenses', '/crm', '/transcription', '/dev-portal/shortcuts-admin', '/login'];
            
            // If it's a frontend route
            if (frontendRoutes.some(route => path.startsWith(route))) {
                // Always use the base domain/IP (port 80) which nginx will route correctly
                const baseHost = currentHost.split(':')[0]; // Remove port if present
                
                // If we're on port 5000, we need to go through nginx on port 80
                if (currentHost.includes(':5000')) {
                    // Use the base IP/domain without port (nginx on port 80)
                    window.location.href = protocol + '//' + baseHost + path;
                } else {
                    // Already on port 80, just use the path
                    window.location.href = path;
                }
            } else {
                // Backend routes stay on current origin
                window.location.href = path;
            }
        }
        
        function toggleMode() {
            const message = 'לעבור למצב רגיל?';
            if (confirm(message)) {
                document.body.style.cursor = 'wait';
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 999999; font-size: 18px;';
                loadingMsg.textContent = 'מנקה סשנים ועובר מצב...';
                document.body.appendChild(loadingMsg);
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        }
    </script>
</body>
</html>`;