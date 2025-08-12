<?php
// Start output buffering to handle includes properly
ob_start();

header('Content-Type: text/html; charset=utf-8');
$pageTitle = "ניהול מתמללים - מערכת CRM";

// Direct database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

// Development mode check
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';

session_name('CRM_SESSION');
session_start();

// Include developer navigation if needed (after session start)
include_once '../../developer-tools/includes/dev-nav.php';

// Development mode - set session if not exists
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION = [
        'user_id' => 999,
        'username' => 'Developer',
        'permissions' => 'ABCDEFG',
        'is_admin' => true
    ];
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // **UTF-8 encoding settings**
    $pdo->exec("SET NAMES utf8mb4");
    $pdo->exec("SET CHARACTER SET utf8mb4");
    $pdo->exec("SET character_set_connection=utf8mb4");
    $pdo->exec("SET character_set_client=utf8mb4");
    $pdo->exec("SET character_set_results=utf8mb4");
    
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Get user permissions
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'] ?? false;
$hasC = strpos($userPermissions, 'C') !== false;

if (!$hasC) {
    header("Location: ../index.php");
    exit;
}

// Handle status updates
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_status'])) {
    $transcriber_id = intval($_POST['transcriber_id']);
    $new_status = $_POST['status'];
    
    $stmt = $pdo->prepare("UPDATE transcribers SET status = ? WHERE id = ?");
    $stmt->execute([$new_status, $transcriber_id]);
    
    $success_message = "סטטוס המתמלל עודכן בהצלחה";
}

// Handle transcriber code attachment
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['attach_code'])) {
    $transcriber_id = intval($_POST['transcriber_id']);
    $transcriber_code = trim($_POST['transcriber_code']);
    
    if (!empty($transcriber_code)) {
        // First check if the code exists in users table and verify permissions
        $stmt = $pdo->prepare("SELECT username, full_name, email, permissions FROM users WHERE transcriber_code = ?");
        $stmt->execute([$transcriber_code]);
        $user = $stmt->fetch();
        
        if (!$user) {
            $error_message = "קוד המתמלל לא קיים במערכת";
        } else {
            $permissions = $user['permissions'] ?: '';
            
            // Check if user has app permissions (D=Transcriber, E=Proofreader, F=Exporter)
            $hasAppAccess = strpos($permissions, 'D') !== false || 
                           strpos($permissions, 'E') !== false || 
                           strpos($permissions, 'F') !== false;
            
            if (!$hasAppAccess) {
                $error_message = "המשתמש הזה הוא משתמש CRM ולא משתמש אפליקציה. רק משתמשי אפליקציה יכולים להיות מתמללים.";
            } else {
                // Check if code already exists in transcribers table
                $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE transcriber_code = ? AND id != ?");
                $stmt->execute([$transcriber_code, $transcriber_id]);
                
                if ($stmt->fetch()) {
                    $error_message = "קוד המתמלל כבר קיים במערכת המתמללים";
                } else {
                    // Determine user type
                    $userType = 'מתמלל'; // default
                    if (strpos($permissions, 'E') !== false && strpos($permissions, 'D') === false) {
                        $userType = 'מגיה';
                    } elseif (strpos($permissions, 'F') !== false) {
                        $userType = 'מייצא';
                    } elseif (strpos($permissions, 'D') !== false && strpos($permissions, 'E') !== false) {
                        $userType = 'מתמלל ומגיה';
                    }
                    
                    $stmt = $pdo->prepare("UPDATE transcribers SET transcriber_code = ?, has_app = 1 WHERE id = ?");
                    $stmt->execute([$transcriber_code, $transcriber_id]);
                    $success_message = "קוד המתמלל צורף בהצלחה! סוג משתמש: {$userType} ({$user['full_name']} - {$user['email']})";
                }
            }
        }
    } else {
        $error_message = "יש להזין קוד מתמלל תקין";
    }
}

// Get all transcribers
try {
    $stmt = $pdo->prepare("
        SELECT t.*, u.username as linked_username 
        FROM transcribers t 
        LEFT JOIN users u ON t.user_id = u.id 
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $transcribers = $stmt->fetchAll();
} catch (Exception $e) {
    $transcribers = [];
    $db_error = "טבלת המתמללים עדיין לא קיימת. אנא הרץ את סקריפט יצירת הטבלאות.";
}

// Auto-attach current CRM user if they have app permissions
function autoAttachCrmUser($pdo, $userId) {
    try {
        // Check if user already exists in transcribers table
        $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE user_id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            return; // User already exists
        }
        
        // Get user details
        $stmt = $pdo->prepare("SELECT username, email, full_name, permissions, transcriber_code FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) return;
        
        $permissions = $user['permissions'] ?: '';
        
        // Check if user has app permissions (D=Transcriber, E=Proofreader, F=Exporter)
        $hasAppAccess = strpos($permissions, 'D') !== false || 
                       strpos($permissions, 'E') !== false || 
                       strpos($permissions, 'F') !== false;
        
        if ($hasAppAccess && $user['transcriber_code']) {
            // Auto-attach this CRM user as a transcriber
            $stmt = $pdo->prepare("
                INSERT INTO transcribers (user_id, transcriber_code, name, email, has_app, notes)
                VALUES (?, ?, ?, ?, 1, ?)
            ");
            
            $name = $user['full_name'] ?: $user['username'];
            $notes = 'מתמלל CRM שצורף אוטומטית';
            
            $result = $stmt->execute([
                $userId,
                $user['transcriber_code'],
                $name,
                $user['email'],
                $notes
            ]);
            
            if ($result) {
                // Reload the page to show the newly added transcriber
                header("Location: " . $_SERVER['PHP_SELF'] . "?auto_attached=1");
                exit;
            }
        }
    } catch (Exception $e) {
        // Silent fail for auto-attachment
    }
}

// Auto-attach current user if they have app permissions
autoAttachCrmUser($pdo, $_SESSION['user_id']);

// Check for success message from add.php
if (isset($_GET['success']) && $_GET['success'] == '1' && isset($_GET['code'])) {
    $success_message = "המתמלל נוסף בהצלחה! קוד מתמלל: " . htmlspecialchars($_GET['code']);
}

// Check for auto-attachment success
if (isset($_GET['auto_attached']) && $_GET['auto_attached'] == '1') {
    $success_message = "נוספת אוטומטית כמתמלל! כעת תוכל להקצות לעצמך עבודות.";
}

include '../components/header.php';
?>

<style>
/* Internal Navigation Bar */
.transcriber-nav {
    background: white;
    border-radius: 15px;
    padding: 20px 30px;
    margin-bottom: 30px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    border-top: 4px solid #a7beae;
}

.transcriber-nav-title {
    font-size: 20px;
    font-weight: 600;
    color: #6b7f73;
    margin-bottom: 20px;
}

.transcriber-nav-items {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.transcriber-nav-item {
    background: linear-gradient(135deg, #a7beae, #95a69b);
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;
    font-size: 14px;
    border: none;
    cursor: pointer;
}

.transcriber-nav-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(167, 190, 174, 0.3);
}

.transcriber-nav-item.active {
    background: linear-gradient(135deg, #6b7f73, #5a6b61);
}

/* Green theme for transcribers */
.transcriber-card {
    background: white;
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 20px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    border-left: 4px solid #a7beae;
    transition: all 0.3s ease;
}

.transcriber-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.12);
}

/* Different types of workers */
.transcriber-card.type-transcriber {
    border-left-color: #a7beae;
    background: linear-gradient(135deg, #f8faf9 0%, #f4f7f5 100%);
}

.transcriber-card.type-proofreader {
    border-left-color: #7a8ea3;
    background: linear-gradient(135deg, #f7f8fa 0%, #f2f4f7 100%);
}

.transcriber-card.type-exporter {
    border-left-color: #d9726a;
    background: linear-gradient(135deg, #fef9f8 0%, #fbf3f2 100%);
}

.transcriber-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.transcriber-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.transcriber-code {
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    color: #6c757d;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.status-active {
    background: #d4edda;
    color: #155724;
}

.status-inactive {
    background: #f8d7da;
    color: #721c24;
}

.status-busy {
    background: #fff3cd;
    color: #856404;
}

.transcriber-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.detail-label {
    font-weight: 500;
    color: #6c757d;
    min-width: 80px;
}

.quick-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 5px;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
}

.empty-state-icon {
    font-size: 64px;
    margin-bottom: 20px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    text-align: center;
}

.stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #a7beae;
    margin-bottom: 5px;
}

/* Type badges */
.type-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    margin-left: 8px;
}

.type-badge.transcriber {
    background: rgba(167, 190, 174, 0.2);
    color: #6b7f73;
}

.type-badge.proofreader {
    background: rgba(122, 142, 163, 0.2);
    color: #4a5562;
}

.type-badge.exporter {
    background: rgba(217, 114, 106, 0.2);
    color: #b85042;
}

/* Attach code section */
.attach-code-section {
    background: rgba(167, 190, 174, 0.1);
    border: 1px solid rgba(167, 190, 174, 0.2);
    border-radius: 10px;
    padding: 15px;
    margin-top: 15px;
}

.attach-code-form {
    display: flex;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
}

.attach-code-form input[type="text"] {
    padding: 8px 12px;
    border: 2px solid rgba(167, 190, 174, 0.3);
    border-radius: 8px;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-weight: 500;
    letter-spacing: 0.5px;
    min-width: 150px;
}

.attach-code-form input[type="text"]:focus {
    outline: none;
    border-color: #a7beae;
}

.stat-label {
    font-size: 12px;
    color: #6c757d;
    text-transform: uppercase;
}

.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-toggle {
    cursor: pointer;
}

.dropdown-menu {
    display: none;
    position: absolute;
    background-color: white;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
    border-radius: 5px;
    left: 0;
    top: 100%;
}

.dropdown-menu.show {
    display: block;
}

.dropdown-item {
    color: #333;
    padding: 8px 16px;
    text-decoration: none;
    display: block;
    border-bottom: 1px solid #eee;
}

.dropdown-item:hover {
    background-color: #f8f9fa;
}
</style>

<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>ניהול מתמללים</h2>
    <div class="d-flex gap-2">
        <a href="add.php" class="btn btn-primary">➕ הוסף מתמלל חדש</a>
        <a href="../dashboard/index.php" class="btn btn-outline">🔙 חזרה לבית</a>
    </div>
</div>

<!-- Internal Navigation Bar -->
<div class="transcriber-nav">
    <div class="transcriber-nav-title">🎧 ניהול צוות התמלול</div>
    <div class="transcriber-nav-items">
        <a href="index.php" class="transcriber-nav-item active">👥 רשימת מתמללים</a>
        <a href="add.php" class="transcriber-nav-item">➕ הוסף מתמלל</a>
        <a href="reports.php" class="transcriber-nav-item">📊 דוחות ביצועים</a>
        <a href="assignments.php" class="transcriber-nav-item">📋 הקצאות פעילות</a>
        <a href="team.php" class="transcriber-nav-item">🏆 ניהול צוותים</a>
        <button onclick="filterByType('all')" class="transcriber-nav-item">🔍 הכל</button>
        <button onclick="filterByType('transcriber')" class="transcriber-nav-item">✍️ מתמללים</button>
        <button onclick="filterByType('proofreader')" class="transcriber-nav-item">🔍 מגיהים</button>
        <button onclick="filterByType('exporter')" class="transcriber-nav-item">📤 מייצאים</button>
    </div>
</div>

<!-- Success Message -->
<?php if (isset($success_message)): ?>
    <div class="alert alert-success">
        ✅ <?php echo $success_message; ?>
    </div>
<?php endif; ?>

<!-- Error Message -->
<?php if (isset($error_message)): ?>
    <div class="alert alert-danger">
        ❌ <?php echo $error_message; ?>
    </div>
<?php endif; ?>

<!-- Database Error -->
<?php if (isset($db_error)): ?>
    <div class="alert alert-warning">
        ⚠️ <?php echo $db_error; ?>
        <br><br>
        <a href="../../server/src/setup_phase1_tables.php" class="btn btn-primary btn-sm" target="_blank">
            🔧 צור טבלאות Phase 1
        </a>
    </div>
<?php endif; ?>

<?php if (!empty($transcribers)): ?>
    <!-- Statistics -->
    <div class="stats-grid">
        <?php
        $stats = [
            'total' => count($transcribers),
            'active' => count(array_filter($transcribers, fn($t) => $t['status'] === 'active')),
            'busy' => count(array_filter($transcribers, fn($t) => $t['status'] === 'busy')),
            'with_app' => count(array_filter($transcribers, fn($t) => $t['has_app']))
        ];
        ?>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['total']; ?></div>
            <div class="stat-label">סה"כ מתמללים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['active']; ?></div>
            <div class="stat-label">מתמללים פעילים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['busy']; ?></div>
            <div class="stat-label">מתמללים עסוקים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['with_app']; ?></div>
            <div class="stat-label">עם אפליקציה</div>
        </div>
    </div>

    <!-- Transcribers List -->
    <div class="transcribers-list">
        <?php foreach ($transcribers as $transcriber): ?>
            <?php
            // Determine transcriber type based on specializations
            $specializations = $transcriber['specializations'] ? json_decode($transcriber['specializations'], true) : [];
            $specializations = is_array($specializations) ? $specializations : [];
            $transcriber_type = 'transcriber'; // default
            
            if (in_array('proofreading', $specializations) || in_array('הגהה', $specializations)) {
                $transcriber_type = 'proofreader';
            } elseif (in_array('export', $specializations) || in_array('ייצוא', $specializations)) {
                $transcriber_type = 'exporter';
            }
            
            $type_icons = [
                'transcriber' => '✍️',
                'proofreader' => '🔍', 
                'exporter' => '📤'
            ];
            
            $type_labels = [
                'transcriber' => 'מתמלל',
                'proofreader' => 'מגיה',
                'exporter' => 'מייצא'
            ];
            ?>
            <div class="transcriber-card type-<?php echo $transcriber_type; ?>" data-type="<?php echo $transcriber_type; ?>">
                <div class="transcriber-header">
                    <div>
                        <div class="transcriber-name">
                            <?php echo $type_icons[$transcriber_type]; ?>
                            <?php echo htmlspecialchars($transcriber['name']); ?>
                            <span class="type-badge <?php echo $transcriber_type; ?>">
                                <?php echo $type_labels[$transcriber_type]; ?>
                            </span>
                            <?php if ($transcriber['has_app']): ?>
                                <span style="color: #a7beae; margin-right: 8px;" title="יש אפליקציה">📱</span>
                            <?php endif; ?>
                        </div>
                        <span class="transcriber-code">
                            קוד: <?php echo htmlspecialchars($transcriber['transcriber_code']); ?>
                        </span>
                    </div>
                    <div class="quick-actions">
                        <span class="status-badge status-<?php echo $transcriber['status']; ?>">
                            <?php
                            $status_labels = [
                                'active' => 'פעיל',
                                'inactive' => 'לא פעיל', 
                                'busy' => 'עסוק'
                            ];
                            echo $status_labels[$transcriber['status']] ?? $transcriber['status'];
                            ?>
                        </span>
                        <div class="dropdown">
                            <button class="btn btn-outline btn-sm dropdown-toggle" onclick="toggleDropdown(this)">
                                פעולות
                            </button>
                            <div class="dropdown-menu">
                                <a class="dropdown-item" href="edit.php?id=<?php echo $transcriber['id']; ?>">✏️ עריכה</a>
                                <a class="dropdown-item" href="#" onclick="changeStatus(<?php echo $transcriber['id']; ?>)">🔄 שנה סטטוס</a>
                                <a class="dropdown-item" href="assignments.php?transcriber_id=<?php echo $transcriber['id']; ?>">📋 הקצאות</a>
                                <?php if ($transcriber['has_app']): ?>
                                    <a class="dropdown-item" href="app_access.php?id=<?php echo $transcriber['id']; ?>">📱 גישה לאפליקציה</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="transcriber-details">
                    <div class="detail-item">
                        <span class="detail-label">📧 אימייל:</span>
                        <span><?php echo htmlspecialchars($transcriber['email']); ?></span>
                    </div>
                    
                    <?php if ($transcriber['phone']): ?>
                        <div class="detail-item">
                            <span class="detail-label">📞 טלפון:</span>
                            <span><?php echo htmlspecialchars($transcriber['phone']); ?></span>
                        </div>
                    <?php endif; ?>
                    
                    <div class="detail-item">
                        <span class="detail-label">💰 תעריף:</span>
                        <span>₪<?php echo number_format($transcriber['pricing_per_page'], 2); ?> לעמוד</span>
                    </div>
                    
                    <?php if ($transcriber['specializations']): ?>
                        <div class="detail-item">
                            <span class="detail-label">🎯 התמחויות:</span>
                            <span><?php 
                                $specs = json_decode($transcriber['specializations'], true);
                                echo is_array($specs) ? implode(', ', $specs) : $transcriber['specializations'];
                            ?></span>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($transcriber['linked_username']): ?>
                        <div class="detail-item">
                            <span class="detail-label">👤 משתמש:</span>
                            <span><?php echo htmlspecialchars($transcriber['linked_username']); ?></span>
                        </div>
                    <?php endif; ?>
                    
                    <div class="detail-item">
                        <span class="detail-label">📅 נוצר:</span>
                        <span><?php echo date('d/m/Y H:i', strtotime($transcriber['created_at'])); ?></span>
                    </div>
                </div>

                <?php if ($transcriber['notes']): ?>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <strong>הערות:</strong> <?php echo nl2br(htmlspecialchars($transcriber['notes'])); ?>
                    </div>
                <?php endif; ?>

                <!-- Code Attachment Section -->
                <?php if (!$transcriber['has_app']): ?>
                    <div class="attach-code-section">
                        <h4 style="color: #6b7f73; margin-bottom: 10px;">📱 צירוף קוד מתמלל לאפליקציה</h4>
                        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                            הזן קוד מתמלל כדי לאפשר לו גישה לאפליקציית המתמללים
                        </p>
                        <form method="POST" class="attach-code-form">
                            <input type="hidden" name="transcriber_id" value="<?php echo $transcriber['id']; ?>">
                            <div>
                                <label style="font-size: 12px; color: #6b7f73; margin-bottom: 5px; display: block;">קוד מתמלל:</label>
                                <input type="text" name="transcriber_code" placeholder="הזן קוד מתמלל..." required>
                            </div>
                            <button type="submit" name="attach_code" class="btn btn-primary btn-sm">
                                📱 צרף קוד
                            </button>
                        </form>
                    </div>
                <?php else: ?>
                    <div style="margin-top: 15px; padding: 10px; background: rgba(167, 190, 174, 0.1); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #6b7f73;">
                            <span>📱</span>
                            <strong>מחובר לאפליקציה</strong>
                            <span style="font-size: 12px; color: #666;">
                                (קוד: <?php echo htmlspecialchars($transcriber['transcriber_code']); ?>)
                            </span>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>

<?php else: ?>
    <!-- Empty State -->
    <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3>אין מתמללים רשומים במערכת</h3>
        <p>התחל בהוספת המתמלל הראשון כדי לנהל את צוות התמלול שלך</p>
        <a href="add.php" class="btn btn-primary">➕ הוסף מתמלל ראשון</a>
    </div>
<?php endif; ?>

<!-- Status Change Form (Hidden) -->
<form id="statusForm" method="POST" style="display: none;">
    <input type="hidden" name="transcriber_id" id="statusTranscriberId">
    <input type="hidden" name="status" id="statusValue">
    <input type="hidden" name="update_status" value="1">
</form>

<script>
function toggleDropdown(button) {
    const menu = button.nextElementSibling;
    const isOpen = menu.classList.contains('show');
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    
    // Toggle current dropdown
    if (!isOpen) {
        menu.classList.add('show');
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.matches('.dropdown-toggle')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

function changeStatus(transcriberId) {
    const statuses = {
        'active': 'פעיל',
        'inactive': 'לא פעיל',
        'busy': 'עסוק'
    };
    
    let options = '';
    for (const [value, label] of Object.entries(statuses)) {
        options += `<option value="${value}">${label}</option>`;
    }
    
    const newStatus = prompt(`בחר סטטוס חדש:\n\n${Object.values(statuses).map((label, i) => `${i+1}. ${label}`).join('\n')}\n\nהכנס 1, 2 או 3:`);
    
    if (newStatus) {
        const statusKeys = Object.keys(statuses);
        const selectedStatus = statusKeys[parseInt(newStatus) - 1];
        
        if (selectedStatus) {
            document.getElementById('statusTranscriberId').value = transcriberId;
            document.getElementById('statusValue').value = selectedStatus;
            document.getElementById('statusForm').submit();
        }
    }
}

// Auto-refresh stats
setTimeout(() => {
    location.reload();
}, 300000); // Refresh every 5 minutes

// Filter transcribers by type
function filterByType(type) {
    const cards = document.querySelectorAll('.transcriber-card');
    const buttons = document.querySelectorAll('.transcriber-nav-item');
    
    // Remove active class from all filter buttons
    buttons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes('filterByType')) {
            btn.classList.remove('active');
        }
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Show/hide cards based on type
    cards.forEach(card => {
        if (type === 'all') {
            card.style.display = 'block';
        } else {
            const cardType = card.getAttribute('data-type');
            card.style.display = cardType === type ? 'block' : 'none';
        }
    });
}
</script>

<?php include '../components/footer.php'; ?>