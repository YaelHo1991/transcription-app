<?php
// Check if we're in developer mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';

// Always show navigation on development page
$showDevNav = true;
include 'includes/dev-nav.php';
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>לוח בקרה למפתחים</title>
    <link rel="stylesheet" href="styles/main.css">
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

        .mode-toggle {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .mode-toggle.dev-mode {
            background: var(--dev-danger);
            color: white;
        }

        .mode-toggle.regular-mode {
            background: var(--dev-success);
            color: white;
        }

        .mode-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
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

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
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
    <div class="development-container">

        <div class="dev-header">
            <h1>⚙️ לוח בקרה למפתחים</h1>
            <div class="mode-controls">
                <span>מצב נוכחי: <?php echo $isDevelopmentMode ? 'פיתוח' : 'רגיל'; ?></span>
            </div>
        </div>

        <div class="dev-content">
            <div class="stats-section" id="stats-container">
                <div class="stat-card">
                    <div class="stat-number">5</div>
                    <div class="stat-label">סה"כ משתמשים</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">1</div>
                    <div class="stat-label">מנהלי מערכת</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">2</div>
                    <div class="stat-label">משתמשי CRM</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">3</div>
                    <div class="stat-label">מתמללים</div>
                </div>
            </div>

            <div class="users-section">
                <h3>👥 טבלת משתמשים והרשאות</h3>
                <div id="loading-users" class="loading">טוען משתמשים...</div>
                <div id="users-container">
                    <div class="table-container">
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
                                    <th>סטטוס</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                // Database connection
                                $host = 'database';
                                $db = 'transcription_system';
                                $user = 'appuser';
                                $pass = 'apppassword';
                                
                                try {
                                    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
                                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                                    
                                    // Fetch users from database
                                    $stmt = $pdo->query("SELECT id, username, email, plain_password, password, permissions, full_name, transcriber_code, is_admin FROM users ORDER BY id");
                                    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                                    
                                    foreach ($users as $user) {
                                        echo '<tr>';
                                        echo '<td>' . htmlspecialchars($user['id']) . '</td>';
                                        echo '<td>' . htmlspecialchars($user['full_name'] ?? 'לא מוגדר');
                                        if ($user['is_admin'] == 1) {
                                            echo ' <span class="admin-badge">מנהל</span>';
                                        }
                                        echo '</td>';
                                        echo '<td>' . htmlspecialchars($user['username']) . '</td>';
                                        echo '<td>' . htmlspecialchars($user['email'] ?? 'לא מוגדר') . '</td>';
                                        
                                        // Show plain password if available, otherwise show "encrypted"
                                        if (!empty($user['plain_password'])) {
                                            echo '<td><code>' . htmlspecialchars($user['plain_password']) . '</code></td>';
                                        } else {
                                            echo '<td><code>מוצפן</code></td>';
                                        }
                                        
                                        // Determine role based on permissions
                                        $role = 'משתמש';
                                        if ($user['is_admin'] == 1) {
                                            $role = 'מנהל מערכת';
                                        } else if (strpos($user['permissions'], 'A') !== false) {
                                            $role = 'מנהל CRM';
                                        } else if (strpos($user['permissions'], 'D') !== false) {
                                            $role = 'מתמלל';
                                        } else if (strpos($user['permissions'], 'E') !== false) {
                                            $role = 'מגיה';
                                        } else if (strpos($user['permissions'], 'F') !== false) {
                                            $role = 'מייצא';
                                        }
                                        
                                        echo '<td>' . htmlspecialchars($role) . '</td>';
                                        echo '<td><code>' . htmlspecialchars($user['permissions'] ?? 'ללא') . '</code></td>';
                                        echo '<td><code>' . htmlspecialchars($user['transcriber_code'] ?? 'לא מוגדר') . '</code></td>';
                                        echo '<td>פעיל</td>';
                                        echo '<td>';
                                        if ($user['username'] !== 'admin') { // Don't allow deleting admin
                                            echo '<button class="tool-btn danger" style="padding: 4px 12px; font-size: 12px;" onclick="deleteUser(' . $user['id'] . ', \'' . htmlspecialchars($user['username']) . '\')">🗑️ מחק</button>';
                                        }
                                        echo '</td>';
                                        echo '</tr>';
                                    }
                                } catch(PDOException $e) {
                                    echo '<tr><td colspan="10">שגיאה בטעינת משתמשים: ' . htmlspecialchars($e->getMessage()) . '</td></tr>';
                                }
                                ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="tools-section">
                <div class="tool-card">
                    <h4>🔧 כלי מערכת</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="testNewAPI()">בדוק API</button>
                        <button class="tool-btn success" onclick="loadAPIStatus()">סטטוס API</button>
                        <button class="tool-btn warning" onclick="exportUsers()">ייצא משתמשים</button>
                        <button class="tool-btn danger" onclick="clearSessions()">נקה סשנים</button>
                    </div>
                </div>

                <div class="tool-card">
                    <h4>📊 ניהול נתונים</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="window.open('http://' + window.location.hostname + ':8081', '_blank')">phpMyAdmin</button>
                        <button class="tool-btn success" onclick="showDatabaseInfo()">בדוק טבלאות</button>
                        <button class="tool-btn warning" onclick="showPHPInfo()">מידע PHP</button>
                        <button class="tool-btn danger" onclick="showDemoMessage('בנה מחדש')">בנה מחדש</button>
                    </div>
                </div>

                <div class="tool-card">
                    <h4>🚀 פיתוח</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn primary" onclick="refreshPage()">רענן נתונים</button>
                        <button class="tool-btn success" onclick="window.location.href='/src/selling/index.php?devnav=1'">הוסף משתמשים</button>
                        <button class="tool-btn warning" onclick="testConnections()">בדוק חיבורים</button>
                        <button class="tool-btn danger" onclick="showDemoMessage('איפוס מערכת')">איפוס מערכת</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- <script src="assets/js/development.js"></script> -->
    <script>
        // Mode switching confirmation
        function confirmModeSwitch(mode) {
            const message = mode === 'dev' ? 'לעבור למצב פיתוח?' : 'לעבור למצב רגיל?';
            if (confirm(message)) {
                document.body.style.cursor = 'wait';
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 999999; font-size: 18px;';
                loadingMsg.textContent = 'מנקה סשנים ועובר מצב...';
                document.body.appendChild(loadingMsg);
                return true;
            }
            return false;
        }

        // Demo functions
        function showDemoMessage(toolName) {
            alert(`כלי "${toolName}" זמין במצב הדגמה בלבד.\n\nבמצב פיתוח מלא, הכלי יבצע את הפעולה הנדרשת.`);
        }
        
        function showDatabaseInfo() {
            window.open('api/database-info.php', '_blank');
        }
        
        function showPHPInfo() {
            window.open('api/phpinfo.php', '_blank');
        }
        
        function testConnections() {
            const connections = [
                { name: 'Database', url: 'api/test-connection.php?service=database' },
                { name: 'Server API', url: 'http://' + window.location.hostname + ':8080/api/health' },
                { name: 'phpMyAdmin', url: 'http://' + window.location.hostname + ':8081' }
            ];
            
            let results = 'בדיקת חיבורים:\n\n';
            let completed = 0;
            
            connections.forEach(conn => {
                fetch(conn.url, { mode: 'no-cors' })
                    .then(() => {
                        results += `✅ ${conn.name}: מחובר\n`;
                    })
                    .catch(() => {
                        results += `❌ ${conn.name}: לא זמין\n`;
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
            window.location.reload();
        }

        // Initialize loading state
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                document.getElementById('loading-users').style.display = 'none';
            }, 1000);
        });

        // Override the loadUsers function to prevent API calls that show hashed passwords
        function loadUsers() {
            document.getElementById('loading-users').style.display = 'none';
            // Keep the static table - don't load from API
        }

        // Override other functions to prevent API calls
        function loadStats() {
            // Keep static stats
        }

        function loadUserInfo() {
            // Keep static user info
        }

        function testNewAPI() {
            alert('API Testing - Development Mode\n\nThis would test the connection to the backend API.');
        }

        function loadAPIStatus() {
            alert('API Status - Development Mode\n\nThis would show the current API connection status.');
        }

        function exportUsers() {
            // Create CSV content
            const table = document.querySelector('.user-table');
            if (!table) {
                alert('לא נמצאה טבלת משתמשים');
                return;
            }
            
            let csv = '\ufeff'; // UTF-8 BOM for Hebrew
            
            // Get headers
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            csv += headers.slice(0, -1).join(',') + '\n'; // Exclude the last column (actions)
            
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
                csv += rowData.join(',') + '\n';
            });
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'users_' + new Date().toISOString().slice(0,10) + '.csv';
            link.click();
        }
        
        function deleteUser(userId, username) {
            if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${username}"?\n\nפעולה זו לא ניתנת לביטול!`)) {
                return;
            }
            
            const API_BASE = window.location.hostname === 'localhost' 
                ? 'http://localhost:8080/api'
                : `http://${window.location.hostname}:8080/api`;
            
            fetch(`${API_BASE}/admin_users.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'delete_user',
                    user_id: userId 
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('המשתמש נמחק בהצלחה');
                    window.location.reload();
                } else {
                    alert('שגיאה במחיקת המשתמש: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                alert('שגיאת רשת: ' + error.message);
            });
        }
        
        function clearSessions() {
            if (!confirm('האם אתה בטוח שברצונך לנקות את כל הסשנים?\n\nכל המשתמשים המחוברים יצטרכו להתחבר מחדש.')) {
                return;
            }
            
            fetch('api/clear-sessions.php', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('כל הסשנים נוקו בהצלחה');
                    // Don't reload - let user stay logged in
                } else {
                    alert('שגיאה בניקוי סשנים: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                alert('שגיאת רשת: ' + error.message);
            });
        }
    </script>
</body>
</html>