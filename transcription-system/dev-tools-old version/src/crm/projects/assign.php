<?php
$pageTitle = "הקצאת עבודות - מערכת CRM";

// Direct database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

session_name('CRM_SESSION');
session_start();

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

if (!$hasB && !$isAdmin) {
    header("Location: ../index.php");
    exit;
}

// Handle assignment submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['assign_project'])) {
    $project_id = intval($_POST['project_id']);
    $transcriber_id = intval($_POST['transcriber_id']);
    $assignment_type = $_POST['assignment_type'];
    
    $errors = [];
    
    // Validation
    if (!$project_id || !$transcriber_id || !$assignment_type) {
        $errors[] = "כל השדות הם חובה";
    }
    
    // Check if assignment already exists
    if (empty($errors)) {
        $stmt = $pdo->prepare("SELECT id FROM project_assignments WHERE project_id = ? AND assignment_type = ?");
        $stmt->execute([$project_id, $assignment_type]);
        if ($stmt->fetch()) {
            $errors[] = "כבר קיימת הקצאה מסוג זה לפרויקט זה";
        }
    }
    
    if (empty($errors)) {
        try {
            // Insert assignment
            $stmt = $pdo->prepare("
                INSERT INTO project_assignments (project_id, transcriber_id, assignment_type, status, notes)
                VALUES (?, ?, ?, 'assigned', ?)
            ");
            
            $notes = "הוקצה על ידי " . $_SESSION['username'] . " ב-" . date('d/m/Y H:i');
            $result = $stmt->execute([$project_id, $transcriber_id, $assignment_type, $notes]);
            
            if ($result) {
                // Update project status and assigned transcriber
                if ($assignment_type === 'transcription') {
                    $updateStmt = $pdo->prepare("UPDATE projects SET assigned_transcriber_id = ?, status = 'assigned' WHERE id = ?");
                    $updateStmt->execute([$transcriber_id, $project_id]);
                }
                
                $success_message = "ההקצאה בוצעה בהצלחה!";
            }
            
        } catch (Exception $e) {
            $errors[] = "שגיאה בביצוע ההקצאה: " . $e->getMessage();
        }
    }
}

// Get projects that need assignment
try {
    $stmt = $pdo->query("
        SELECT p.*, 
               GROUP_CONCAT(DISTINCT pa.assignment_type) as assigned_types,
               t.name as assigned_transcriber_name
        FROM projects p 
        LEFT JOIN project_assignments pa ON p.id = pa.project_id 
        LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
        WHERE p.user_id = " . $_SESSION['user_id'] . "
        GROUP BY p.id 
        ORDER BY p.created_at DESC
    ");
    $projects = $stmt->fetchAll();
} catch (Exception $e) {
    $projects = [];
    $db_error = "שגיאה בטעינת הפרויקטים: " . $e->getMessage();
}

// Get available transcribers
try {
    $stmt = $pdo->prepare("
        SELECT * FROM transcribers 
        WHERE status = 'active' AND user_id = ?
        ORDER BY name ASC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $transcribers = $stmt->fetchAll();
} catch (Exception $e) {
    $transcribers = [];
}

include '../components/header.php';
?>

<style>
.assignment-section {
    background: white;
    border-radius: 10px;
    padding: 25px;
    margin-bottom: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

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
    justify-content: between;
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
    background: #f8d7da;
    color: #721c24;
}

.assignment-info {
    background: #f8f9fa;
    border-radius: 5px;
    padding: 15px;
    margin: 15px 0;
}

.assignment-badges {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 15px;
}

.assignment-badge {
    padding: 4px 8px;
    border-radius: 15px;
    font-size: 11px;
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

.assignment-form {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-top: 15px;
}

.form-inline {
    display: flex;
    gap: 15px;
    align-items: end;
    flex-wrap: wrap;
}

.form-inline .form-group {
    flex: 1;
    min-width: 200px;
}

.transcriber-info {
    font-size: 12px;
    color: #6c757d;
    margin-top: 5px;
}

.no-assignments {
    text-align: center;
    color: #6c757d;
    padding: 40px;
}

.assignment-type-icons {
    margin-right: 5px;
}
</style>

<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>הקצאת עבודות למתמללים</h2>
    <div class="d-flex gap-2">
        <a href="create.php" class="btn btn-outline">➕ צור עבודה חדשה</a>
        <a href="index.php" class="btn btn-outline">🔙 חזרה לרשימה</a>
    </div>
</div>

<!-- Success Message -->
<?php if (isset($success_message)): ?>
    <div class="alert alert-success">
        ✅ <?php echo $success_message; ?>
    </div>
<?php endif; ?>

<!-- Error Messages -->
<?php if (!empty($errors)): ?>
    <div class="alert alert-danger">
        ❌ <strong>שגיאות:</strong>
        <ul style="margin: 10px 0 0 20px;">
            <?php foreach ($errors as $error): ?>
                <li><?php echo $error; ?></li>
            <?php endforeach; ?>
        </ul>
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

<!-- Assignment Instructions -->
<div class="assignment-section">
    <h3>הנחיות הקצאת עבודות</h3>
    <p>בחר פרויקט ומתמלל להקצאת העבודה. כל פרויקט יכול לעבור דרך שלושה שלבים:</p>
    <div class="assignment-badges">
        <span class="assignment-badge assignment-transcription">
            <span class="assignment-type-icons">✍️</span> תמלול (Transcription)
        </span>
        <span class="assignment-badge assignment-proofreading">
            <span class="assignment-type-icons">🔍</span> הגהה (Proofreading)
        </span>
        <span class="assignment-badge assignment-export">
            <span class="assignment-type-icons">📤</span> ייצוא (Export)
        </span>
    </div>
</div>

<?php if (!empty($projects)): ?>
    <!-- Projects List -->
    <div class="projects-list">
        <?php foreach ($projects as $project): ?>
            <div class="project-card">
                <div class="project-header">
                    <div style="flex: 1;">
                        <div class="project-title"><?php echo htmlspecialchars($project['title']); ?></div>
                        <div class="project-client">לקוח: <?php echo htmlspecialchars($project['client_name']); ?></div>
                        
                        <?php if ($project['assigned_transcriber_name']): ?>
                            <div style="margin-top: 8px; color: #155724;">
                                <strong>מוקצה ל:</strong> <?php echo htmlspecialchars($project['assigned_transcriber_name']); ?>
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

                <!-- Current Assignments -->
                <?php if ($project['assigned_types']): ?>
                    <div class="assignment-info">
                        <strong>הקצאות קיימות:</strong>
                        <div class="assignment-badges" style="margin-top: 10px;">
                            <?php
                            $assigned_types = explode(',', $project['assigned_types']);
                            foreach ($assigned_types as $type):
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
                    </div>
                <?php endif; ?>

                <!-- Assignment Form -->
                <div class="assignment-form">
                    <h4>הקצה עבודה חדשה</h4>
                    <form method="POST" class="form-inline">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        
                        <div class="form-group">
                            <label>בחר מתמלל:</label>
                            <select name="transcriber_id" required>
                                <option value="">-- בחר מתמלל --</option>
                                <?php foreach ($transcribers as $transcriber): ?>
                                    <option value="<?php echo $transcriber['id']; ?>">
                                        <?php echo htmlspecialchars($transcriber['name']); ?>
                                        (₪<?php echo number_format($transcriber['pricing_per_page'], 2); ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <?php if (empty($transcribers)): ?>
                                <div class="transcriber-info">
                                    אין מתמללים פעילים במערכת. <a href="../transcribers/add.php">הוסף מתמלל</a>
                                </div>
                            <?php endif; ?>
                        </div>
                        
                        <div class="form-group">
                            <label>סוג הקצאה:</label>
                            <select name="assignment_type" required>
                                <option value="">-- בחר סוג --</option>
                                <?php
                                $assigned_array = $project['assigned_types'] ? explode(',', $project['assigned_types']) : [];
                                ?>
                                <?php if (!in_array('transcription', $assigned_array)): ?>
                                    <option value="transcription">✍️ תמלול</option>
                                <?php endif; ?>
                                <?php if (!in_array('proofreading', $assigned_array)): ?>
                                    <option value="proofreading">🔍 הגהה</option>
                                <?php endif; ?>
                                <?php if (!in_array('export', $assigned_array)): ?>
                                    <option value="export">📤 ייצוא</option>
                                <?php endif; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <button type="submit" name="assign_project" class="btn btn-primary" 
                                    <?php echo empty($transcribers) ? 'disabled' : ''; ?>>
                                ✅ הקצה עבודה
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Project Details -->
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; font-size: 14px; color: #6c757d;">
                    <strong>פרטים:</strong>
                    מחיר לעמוד: ₪<?php echo number_format($project['pricing_per_page'], 2); ?> |
                    הערכת עמודים: <?php echo $project['estimated_pages'] ?: 'לא צוין'; ?> |
                    נוצר: <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                    
                    <?php if ($project['description']): ?>
                        <div style="margin-top: 10px;">
                            <strong>תיאור:</strong> <?php echo nl2br(htmlspecialchars($project['description'])); ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

<?php else: ?>
    <!-- Empty State -->
    <div class="no-assignments">
        <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
        <h3>אין פרויקטים להקצאה</h3>
        <p>צור פרויקט חדש כדי להתחיל להקצות עבודות למתמללים</p>
        <a href="create.php" class="btn btn-primary">➕ צור פרויקט ראשון</a>
    </div>
<?php endif; ?>

<script>
// Form validation
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const transcriberId = this.querySelector('select[name="transcriber_id"]').value;
        const assignmentType = this.querySelector('select[name="assignment_type"]').value;
        
        if (!transcriberId) {
            alert('יש לבחור מתמלל');
            e.preventDefault();
            return;
        }
        
        if (!assignmentType) {
            alert('יש לבחור סוג הקצאה');
            e.preventDefault();
            return;
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[name="assign_project"]');
        submitBtn.innerHTML = '<span class="loading"></span> מקצה...';
        submitBtn.disabled = true;
    });
});

// Auto-refresh page every 2 minutes to show updated assignments
setTimeout(() => {
    location.reload();
}, 120000);
</script>

<?php include '../components/footer.php'; ?>