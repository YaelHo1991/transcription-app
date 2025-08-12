<?php
// Start output buffering to handle includes properly
ob_start();

$pageTitle = "ניהול עבודות - מערכת CRM";

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
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Get user permissions
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'] ?? false;
$hasB = strpos($userPermissions, 'B') !== false;

if (!$hasB) {
    header("Location: ../index.php");
    exit;
}

// Handle status updates
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_status'])) {
    $project_id = intval($_POST['project_id']);
    $new_status = $_POST['status'];
    
    $stmt = $pdo->prepare("UPDATE projects SET status = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$new_status, $project_id, $_SESSION['user_id']]);
    
    $success_message = "סטטוס הפרויקט עודכן בהצלחה";
}

// Get projects with transcriber information
try {
    if ($isDevelopmentMode) {
        // In dev mode, show all projects
        $stmt = $pdo->prepare("
            SELECT p.*, 
                   t.name as transcriber_name,
                   COUNT(pf.id) as file_count,
                   GROUP_CONCAT(DISTINCT pa.assignment_type) as assignment_types
            FROM projects p 
            LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
            LEFT JOIN project_files pf ON p.id = pf.project_id
            LEFT JOIN project_assignments pa ON p.id = pa.project_id
            GROUP BY p.id 
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT p.*, 
                   t.name as transcriber_name,
                   COUNT(pf.id) as file_count,
                   GROUP_CONCAT(DISTINCT pa.assignment_type) as assignment_types
            FROM projects p 
            LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
            LEFT JOIN project_files pf ON p.id = pf.project_id
            LEFT JOIN project_assignments pa ON p.id = pa.project_id
            WHERE p.user_id = ?
            GROUP BY p.id 
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $projects = $stmt->fetchAll();
} catch (Exception $e) {
    $projects = [];
    $db_error = "טבלת הפרויקטים עדיין לא קיימת. אנא הרץ את סקריפט יצירת הטבלאות.";
}

include '../components/header.php';
?>

<style>
.project-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    border-left: 4px solid #b85042;
}

.project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
}

.project-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 5px;
}

.project-client {
    color: #6c757d;
    font-size: 14px;
}

.project-status {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.status-pending {
    background: #fff3cd;
    color: #856404;
}

.status-assigned {
    background: #cce7ff;
    color: #004085;
}

.status-in_progress {
    background: #d4edda;
    color: #155724;
}

.status-completed {
    background: #e8f5e8;
    color: #155724;
}

.status-cancelled {
    background: #f8d7da;
    color: #721c24;
}

.project-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
    min-width: 100px;
}

.project-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
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
    color: #b85042;
    margin-bottom: 5px;
}

.stat-label {
    font-size: 12px;
    color: #6c757d;
    text-transform: uppercase;
}

.assignment-badges {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 5px;
}

.assignment-badge {
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
}

.assignment-transcription {
    background: #e8f5e8;
    color: #155724;
}

.assignment-proofreading {
    background: #e6f3ff;
    color: #004085;
}

.assignment-export {
    background: #fff3e0;
    color: #e65100;
}

.filter-section {
    background: white;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.filter-row {
    display: flex;
    gap: 15px;
    align-items: end;
    flex-wrap: wrap;
}

.filter-group {
    flex: 1;
    min-width: 150px;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 5px;
}
</style>

<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>ניהול עבודות</h2>
    <div class="d-flex gap-2">
        <a href="create.php" class="btn btn-primary">➕ צור עבודה חדשה</a>
        <a href="assign.php" class="btn btn-secondary">📋 הקצאת עבודות</a>
        <a href="../index.php" class="btn btn-outline">🔙 חזרה לבית</a>
    </div>
</div>

<!-- Success Message -->
<?php if (isset($success_message)): ?>
    <div class="alert alert-success">
        ✅ <?php echo $success_message; ?>
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

<?php if (!empty($projects)): ?>
    <!-- Statistics -->
    <div class="stats-grid">
        <?php
        $stats = [
            'total' => count($projects),
            'pending' => count(array_filter($projects, fn($p) => $p['status'] === 'pending')),
            'in_progress' => count(array_filter($projects, fn($p) => in_array($p['status'], ['assigned', 'in_progress']))),
            'completed' => count(array_filter($projects, fn($p) => $p['status'] === 'completed'))
        ];
        ?>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['total']; ?></div>
            <div class="stat-label">סה"כ פרויקטים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['pending']; ?></div>
            <div class="stat-label">ממתינים</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['in_progress']; ?></div>
            <div class="stat-label">בתהליך</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $stats['completed']; ?></div>
            <div class="stat-label">הושלמו</div>
        </div>
    </div>

    <!-- Filters -->
    <div class="filter-section">
        <h4>סינון פרויקטים</h4>
        <div class="filter-row">
            <div class="filter-group">
                <label>סטטוס:</label>
                <select id="statusFilter" onchange="filterProjects()">
                    <option value="">הכל</option>
                    <option value="pending">ממתין</option>
                    <option value="assigned">מוקצה</option>
                    <option value="in_progress">בתהליך</option>
                    <option value="completed">הושלם</option>
                    <option value="cancelled">מבוטל</option>
                </select>
            </div>
            <div class="filter-group">
                <label>לקוח:</label>
                <input type="text" id="clientFilter" placeholder="שם לקוח..." onkeyup="filterProjects()">
            </div>
            <div class="filter-group">
                <button onclick="clearFilters()" class="btn btn-outline btn-sm">נקה סינון</button>
            </div>
        </div>
    </div>

    <!-- Projects List -->
    <div class="projects-list">
        <?php foreach ($projects as $project): ?>
            <div class="project-card" data-status="<?php echo $project['status']; ?>" data-client="<?php echo strtolower($project['client_name']); ?>">
                <div class="project-header">
                    <div style="flex: 1;">
                        <div class="project-title"><?php echo htmlspecialchars($project['title']); ?></div>
                        <div class="project-client">לקוח: <?php echo htmlspecialchars($project['client_name']); ?></div>
                        
                        <?php if ($project['transcriber_name']): ?>
                            <div style="margin-top: 5px; color: #155724; font-size: 14px;">
                                <strong>מוקצה ל:</strong> <?php echo htmlspecialchars($project['transcriber_name']); ?>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($project['assignment_types']): ?>
                            <div class="assignment-badges">
                                <?php
                                $types = explode(',', $project['assignment_types']);
                                foreach ($types as $type):
                                    $type_info = [
                                        'transcription' => ['icon' => '✍️', 'label' => 'תמלול', 'class' => 'transcription'],
                                        'proofreading' => ['icon' => '🔍', 'label' => 'הגהה', 'class' => 'proofreading'],
                                        'export' => ['icon' => '📤', 'label' => 'ייצוא', 'class' => 'export']
                                    ];
                                    if (isset($type_info[$type])):
                                ?>
                                    <span class="assignment-badge assignment-<?php echo $type_info[$type]['class']; ?>">
                                        <?php echo $type_info[$type]['icon']; ?> <?php echo $type_info[$type]['label']; ?>
                                    </span>
                                <?php endif; endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                    <div>
                        <span class="project-status status-<?php echo $project['status']; ?>">
                            <?php
                            $status_labels = [
                                'pending' => 'ממתין',
                                'assigned' => 'מוקצה',
                                'in_progress' => 'בתהליך',
                                'completed' => 'הושלם',
                                'cancelled' => 'מבוטל'
                            ];
                            echo $status_labels[$project['status']] ?? $project['status'];
                            ?>
                        </span>
                    </div>
                </div>

                <div class="project-details">
                    <div class="detail-item">
                        <span class="detail-label">💰 מחיר לעמוד:</span>
                        <span>₪<?php echo number_format($project['pricing_per_page'], 2); ?></span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">📄 הערכת עמודים:</span>
                        <span><?php echo $project['estimated_pages'] ?: 'לא צוין'; ?></span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">📁 קבצים:</span>
                        <span><?php echo $project['file_count']; ?> קבצים</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">📅 נוצר:</span>
                        <span><?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?></span>
                    </div>
                    
                    <?php if ($project['actual_pages']): ?>
                        <div class="detail-item">
                            <span class="detail-label">📊 עמודים בפועל:</span>
                            <span><?php echo $project['actual_pages']; ?></span>
                        </div>
                    <?php endif; ?>
                    
                    <div class="detail-item">
                        <span class="detail-label">🔄 עדכון אחרון:</span>
                        <span><?php echo date('d/m/Y H:i', strtotime($project['updated_at'])); ?></span>
                    </div>
                </div>

                <?php if ($project['description']): ?>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <strong>תיאור:</strong> <?php echo nl2br(htmlspecialchars($project['description'])); ?>
                    </div>
                <?php endif; ?>

                <?php if ($project['notes']): ?>
                    <div style="margin-top: 10px;">
                        <strong>הערות:</strong> <?php echo nl2br(htmlspecialchars($project['notes'])); ?>
                    </div>
                <?php endif; ?>

                <div class="project-actions">
                    <a href="view.php?id=<?php echo $project['id']; ?>" class="btn btn-outline btn-sm">👁️ צפה</a>
                    <a href="edit.php?id=<?php echo $project['id']; ?>" class="btn btn-secondary btn-sm">✏️ עריכה</a>
                    <a href="assign.php?project_id=<?php echo $project['id']; ?>" class="btn btn-secondary btn-sm">📋 הקצה</a>
                    <button onclick="changeStatus(<?php echo $project['id']; ?>)" class="btn btn-outline btn-sm">🔄 שנה סטטוס</button>
                    
                    <?php if ($project['file_count'] > 0): ?>
                        <a href="files.php?id=<?php echo $project['id']; ?>" class="btn btn-outline btn-sm">📁 קבצים</a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

<?php else: ?>
    <!-- Empty State -->
    <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>אין פרויקטים במערכת</h3>
        <p>התחל בהוספת הפרויקט הראשון כדי לנהל את עבודות התמלול שלך</p>
        <a href="create.php" class="btn btn-primary">➕ צור פרויקט ראשון</a>
    </div>
<?php endif; ?>

<!-- Status Change Form (Hidden) -->
<form id="statusForm" method="POST" style="display: none;">
    <input type="hidden" name="project_id" id="statusProjectId">
    <input type="hidden" name="status" id="statusValue">
    <input type="hidden" name="update_status" value="1">
</form>

<script>
function changeStatus(projectId) {
    const statuses = {
        'pending': 'ממתין',
        'assigned': 'מוקצה',
        'in_progress': 'בתהליך',
        'completed': 'הושלם',
        'cancelled': 'מבוטל'
    };
    
    const newStatus = prompt(`בחר סטטוס חדש:\n\n${Object.entries(statuses).map(([key, label], i) => `${i+1}. ${label}`).join('\n')}\n\nהכנס מספר (1-5):`);
    
    if (newStatus) {
        const statusKeys = Object.keys(statuses);
        const selectedStatus = statusKeys[parseInt(newStatus) - 1];
        
        if (selectedStatus) {
            document.getElementById('statusProjectId').value = projectId;
            document.getElementById('statusValue').value = selectedStatus;
            document.getElementById('statusForm').submit();
        }
    }
}

function filterProjects() {
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    const clientFilter = document.getElementById('clientFilter').value.toLowerCase();
    
    document.querySelectorAll('.project-card').forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardClient = card.getAttribute('data-client');
        
        let showCard = true;
        
        if (statusFilter && cardStatus !== statusFilter) {
            showCard = false;
        }
        
        if (clientFilter && !cardClient.includes(clientFilter)) {
            showCard = false;
        }
        
        card.style.display = showCard ? 'block' : 'none';
    });
}

function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('clientFilter').value = '';
    filterProjects();
}

// Auto-refresh stats every 5 minutes
setTimeout(() => {
    location.reload();
}, 300000);
</script>

<?php include '../components/footer.php'; ?>