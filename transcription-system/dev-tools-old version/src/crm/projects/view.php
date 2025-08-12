<?php
/*
 * =========================================
 * מערכת CRM - צפייה בפרויקט
 * crm_system/projects/view.php
 * =========================================
 * עמוד צפייה מפורט בפרויקט וקבצי התמלול
 * מאפשר הורדה, העתקה והדפסה של תמלולים
 * נגיש למשתמשים עם הרשאה B
 */

session_name('CRM_SESSION');
session_start();

// Function to preserve development navigation parameters
function preserveDevParams($url) {
    $params = [];
    if (isset($_GET['devnav'])) $params[] = 'devnav=' . $_GET['devnav'];
    if (isset($_GET['dev'])) $params[] = 'dev=' . $_GET['dev'];
    
    if (empty($params)) {
        return $url;
    }
    
    $separator = (strpos($url, '?') !== false) ? '&' : '?';
    return $url . $separator . implode('&', $params);
}

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // **UTF-8 encoding settings**
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
    
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Login check
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

// Check permissions
$userPermissions = $_SESSION['permissions'];
$hasA = strpos($userPermissions, 'A') !== false;
$hasB = strpos($userPermissions, 'B') !== false;
$hasC = strpos($userPermissions, 'C') !== false;

if (!$hasB) {
    header("Location: ../index.php");
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    die("Company not found");
}

// Handle downloads
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action']) && $_POST['action'] == 'download') {
    $projectId = $_POST['project_id'];
    $contentType = $_POST['content_type'];
    
    $projectStmt = $pdo->prepare("SELECT * FROM projects WHERE id = ? AND company_id = ?");
    $projectStmt->execute([$projectId, $company['id']]);
    $project = $projectStmt->fetch();
    
    if ($project) {
        $fileName = '';
        $content = '';
        $mimeType = 'text/plain; charset=utf-8';
        
        if ($contentType == 'transcription') {
            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
            if (file_exists($transcriptionFile)) {
                $content = file_get_contents($transcriptionFile);
                $fileName = $project['title'] . '_תמלול_' . date('Y-m-d') . '.txt';
            }
        } elseif ($contentType == 'proofread') {
            $proofreadFile = $project['folder_path'] . '/proofread.txt';
            if (file_exists($proofreadFile)) {
                $content = file_get_contents($proofreadFile);
                $fileName = $project['title'] . '_הגהה_' . date('Y-m-d') . '.txt';
            }
        } elseif ($contentType == 'export') {
            $exportFile = $project['folder_path'] . '/export.docx';
            if (file_exists($exportFile)) {
                $content = file_get_contents($exportFile);
                $fileName = $project['title'] . '_סופי_' . date('Y-m-d') . '.docx';
                $mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            }
        }
        
        if ($content) {
            $fileName = preg_replace('/[^a-zA-Z0-9א-ת._-]/', '_', $fileName);
            
            header('Content-Type: ' . $mimeType);
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Content-Length: ' . strlen($content));
            echo $content;
            exit;
        }
    }
}

// Get project info
$projectId = isset($_GET['project']) ? (int)$_GET['project'] : null;

if (!$projectId) {
    header("Location: index.php");
    exit;
}

$projectStmt = $pdo->prepare("
    SELECT p.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.company as client_company,
           t1.name as transcriber_name, t1.email as transcriber_email, t1.transcriber_code,
           t2.name as proofreader_name, t2.email as proofreader_email,
           t3.name as exporter_name, t3.email as exporter_email
    FROM projects p 
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN transcribers t1 ON p.assigned_transcriber_id = t1.id
    LEFT JOIN transcribers t2 ON p.assigned_proofreader_id = t2.id
    LEFT JOIN transcribers t3 ON p.assigned_exporter_id = t3.id
    WHERE p.id = ? AND p.company_id = ?
");
$projectStmt->execute([$projectId, $company['id']]);
$project = $projectStmt->fetch();

if (!$project) {
    die("Project not found");
}

// Get project files
$filesStmt = $pdo->prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY file_category, filename");
$filesStmt->execute([$projectId]);
$files = $filesStmt->fetchAll();

$mediaFiles = array_filter($files, function($file) { 
    return isset($file['file_category']) && $file['file_category'] == 'media'; 
});
$helperFiles = array_filter($files, function($file) { 
    return isset($file['file_category']) && $file['file_category'] == 'helper'; 
});

// Check file existence
$transcriptionFile = $project['folder_path'] . '/transcription.txt';
$proofreadFile = $project['folder_path'] . '/proofread.txt';
$exportFile = $project['folder_path'] . '/export.docx';

$hasTranscription = file_exists($transcriptionFile);
$hasProofread = file_exists($proofreadFile);
$hasExport = file_exists($exportFile);

$transcriptionContent = '';
$proofreadContent = '';

// קריאה נכונה של קבצי התמלול
if ($hasTranscription) {
    $transcriptionContent = file_get_contents($transcriptionFile);
} elseif (!empty($project['transcription_backup'])) {
    // אם יש גיבוי במסד הנתונים, השתמש בו
    $transcriptionContent = $project['transcription_backup'];
    $hasTranscription = true; // מעדכן שיש תמלול זמין
}

if ($hasProofread) {
    $proofreadContent = file_get_contents($proofreadFile);
} elseif (!empty($transcriptionContent)) {
    // אם אין קובץ הגהה אבל יש תמלול, השתמש בו כבסיס
    $proofreadContent = $transcriptionContent;
}
?>

<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>צפייה בפרויקט: <?php echo htmlspecialchars($project['title']); ?></title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: #007cba; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .nav { background: #005a8b; padding: 10px; }
        .nav a { color: white; text-decoration: none; margin-left: 20px; padding: 8px 15px; border-radius: 4px; }
        .nav a:hover, .nav a.active { background: #007cba; }
        .container { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .project-header { background: linear-gradient(135deg, #007cba, #005a8b); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
        .project-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .info-section { background: #f8f9fa; padding: 15px; border-radius: 8px; border-right: 4px solid #007cba; }
        .info-section h4 { margin-top: 0; color: #007cba; }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-pending { background: #ffeaa7; color: #2d3436; }
        .status-in_progress { background: #74b9ff; color: white; }
        .status-completed { background: #00b894; color: white; }
        .status-exported { background: #6c5ce7; color: white; }
        .workflow-pending { background: #e9ecef; color: #495057; }
        .workflow-ready_for_transcription { background: #fff3cd; color: #856404; }
        .workflow-ready_for_proofreading { background: #cff4fc; color: #055160; }
        .workflow-ready_for_export { background: #d1ecf1; color: #0c5460; }
        .workflow-exported { background: #d4edda; color: #155724; }
        .files-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .file-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
        .file-item:hover { background: #e9ecef; }
        .content-viewer { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .content-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
        .content-box.transcription { border-right: 4px solid #28a745; }
        .content-box.proofread { border-right: 4px solid #007cba; }
        .content-text { max-height: 400px; overflow-y: auto; line-height: 1.6; white-space: pre-wrap; font-family: 'Courier New', monospace; }
        .download-section { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .btn-primary { background: #007cba; color: white; }
        .btn-primary:hover { background: #005a8b; }
        .btn-success { background: #28a745; color: white; }
        .btn-success:hover { background: #218838; }
        .btn-info { background: #17a2b8; color: white; }
        .btn-info:hover { background: #138496; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #5a6268; }
        .workflow-progress { display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
        .progress-step { flex: 1; text-align: center; padding: 10px; position: relative; }
        .progress-step::after { content: '→'; position: absolute; right: -20px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #ddd; }
        .progress-step:last-child::after { display: none; }
        .progress-step.completed { color: #28a745; font-weight: bold; }
        .progress-step.active { color: #007cba; font-weight: bold; background: #f0f8ff; border-radius: 8px; }
        .no-content { text-align: center; padding: 40px; color: #666; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1>מערכת CRM לתמלול - צפייה בפרויקט</h1>
        <div>
            <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
            <a href="../index.php?logout=1" style="color: white; margin-right: 20px;">התנתק</a>
        </div>
    </div>
    
    <div class="nav">
        <a href="<?php echo preserveDevParams('../index.php'); ?>">דף הבית</a>
        <?php if ($hasA): ?>
            <a href="<?php echo preserveDevParams('../clients/'); ?>">ניהול לקוחות</a>
        <?php endif; ?>
        <a href="<?php echo preserveDevParams('index.php'); ?>">ניהול עבודות</a>
        <?php if ($hasC): ?>
            <a href="<?php echo preserveDevParams('../transcribers/'); ?>">ניהול מתמללים</a>
        <?php endif; ?>
    </div>
    
    <div class="container">
        <!-- כותרת הפרויקט -->
        <div class="project-header">
            <h1><?php echo htmlspecialchars($project['title']); ?></h1>
            <div style="display: flex; gap: 15px; margin-top: 15px;">
                <span class="status-badge status-<?php echo $project['status']; ?>">
                    <?php 
                    $statusHebrew = [
                        'pending' => 'ממתין',
                        'in_progress' => 'בעבודה',
                        'completed' => 'הושלם',
                        'exported' => 'יוצא'
                    ];
                    echo $statusHebrew[$project['status']] ?? $project['status'];
                    ?>
                </span>
                <span class="status-badge workflow-<?php echo $project['workflow_status'] ?? 'pending'; ?>">
                    <?php 
                    $workflowHebrew = [
                        'pending' => 'ממתין',
                        'ready_for_transcription' => 'מוכן לתמלול',
                        'ready_for_proofreading' => 'מוכן להגהה',
                        'ready_for_export' => 'מוכן לייצוא',
                        'exported' => 'יוצא',
                        'awaiting_payment' => 'ממתין לתשלום'
                    ];
                    $currentWorkflow = !empty($project['workflow_status']) ? $project['workflow_status'] : 'pending';
                    echo $workflowHebrew[$currentWorkflow] ?? $currentWorkflow;
                    ?>
                </span>
            </div>
        </div>
        
        <!-- התקדמות שלבי העבודה -->
        <div class="card">
            <h3>התקדמות שלבי העבודה</h3>
            <div class="workflow-progress">
                <div class="progress-step <?php echo (!empty($transcriptionContent)) ? 'completed' : (($project['workflow_status'] ?? '') == 'ready_for_transcription' ? 'active' : ''); ?>">
                    <div>1. תמלול</div>
                    <small><?php echo (!empty($transcriptionContent)) ? '✅ הושלם' : 'ממתין'; ?></small>
                </div>
                <div class="progress-step <?php echo (!empty($proofreadContent) && $hasProofread) ? 'completed' : (($project['workflow_status'] ?? '') == 'ready_for_proofreading' ? 'active' : ''); ?>">
                    <div>2. הגהה</div>
                    <small><?php echo (!empty($proofreadContent) && $hasProofread) ? '✅ הושלם' : 'ממתין'; ?></small>
                </div>
                <div class="progress-step <?php echo $hasExport ? 'completed' : (($project['workflow_status'] ?? '') == 'ready_for_export' ? 'active' : ''); ?>">
                    <div>3. ייצוא</div>
                    <small><?php echo $hasExport ? '✅ הושלם' : 'ממתין'; ?></small>
                </div>
            </div>
        </div>
        
        <!-- מידע כללי -->
        <div class="project-info">
            <div class="info-section">
                <h4>פרטי פרויקט</h4>
                <p><strong>תיאור:</strong> <?php echo htmlspecialchars($project['description']); ?></p>
                <p><strong>תאריך יצירה:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?></p>
                <p><strong>דוברים:</strong></p>
                <div style="background: white; padding: 10px; border-radius: 4px; white-space: pre-line;">
                    <?php echo htmlspecialchars($project['speakers']); ?>
                </div>
                <p><strong>הערות למתמלל:</strong></p>
                <div style="background: white; padding: 10px; border-radius: 4px; white-space: pre-line;">
                    <?php echo htmlspecialchars($project['notes']); ?>
                </div>
            </div>
            
            <div class="info-section">
                <h4>פרטי לקוח</h4>
                <?php if ($project['client_name']): ?>
                    <p><strong>שם:</strong> <?php echo htmlspecialchars($project['client_name']); ?></p>
                    <p><strong>חברה:</strong> <?php echo htmlspecialchars($project['client_company']); ?></p>
                    <p><strong>אימייל:</strong> <?php echo htmlspecialchars($project['client_email']); ?></p>
                    <p><strong>טלפון:</strong> <?php echo htmlspecialchars($project['client_phone']); ?></p>
                <?php else: ?>
                    <p>לא נבחר לקוח לפרויקט זה</p>
                <?php endif; ?>
            </div>
            
            <div class="info-section">
                <h4>צוות הפרויקט</h4>
                <p><strong>מתמלל:</strong> 
                    <?php echo $project['transcriber_name'] ? htmlspecialchars($project['transcriber_name']) : 'לא מוקצה'; ?>
                    <?php if ($project['transcriber_code']): ?>
                        <br><small>קוד: <?php echo htmlspecialchars($project['transcriber_code']); ?></small>
                    <?php endif; ?>
                </p>
                <p><strong>מגיה:</strong> 
                    <?php echo $project['proofreader_name'] ? htmlspecialchars($project['proofreader_name']) : 'לא מוקצה'; ?>
                </p>
                <p><strong>מייצא:</strong> 
                    <?php echo $project['exporter_name'] ? htmlspecialchars($project['exporter_name']) : 'לא מוקצה'; ?>
                </p>
            </div>
        </div>
        
        <!-- קבצי מדיה -->
        <?php if (!empty($mediaFiles)): ?>
        <div class="card">
            <h3>קבצי מדיה (<?php echo count($mediaFiles); ?>)</h3>
            <div class="files-grid">
                <?php foreach ($mediaFiles as $file): ?>
                    <div class="file-item">
                        <div>
                            <strong><?php echo htmlspecialchars($file['filename']); ?></strong><br>
                            <small><?php echo htmlspecialchars($file['file_type']); ?></small>
                        </div>
                        <a href="../<?php echo htmlspecialchars($file['file_path']); ?>" target="_blank" class="btn btn-info">פתח</a>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
        
        <!-- דפי עזר -->
        <?php if (!empty($helperFiles)): ?>
        <div class="card">
            <h3>דפי עזר (<?php echo count($helperFiles); ?>)</h3>
            <div class="files-grid">
                <?php foreach ($helperFiles as $file): ?>
                    <div class="file-item">
                        <div>
                            <strong><?php echo htmlspecialchars($file['filename']); ?></strong><br>
                            <small><?php echo htmlspecialchars($file['file_type']); ?></small>
                        </div>
                        <a href="../<?php echo htmlspecialchars($file['file_path']); ?>" target="_blank" class="btn btn-info">הורד</a>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
        
        <!-- תוכן התמלול והגהה -->
        <div class="card">
            <h3>תוכן התמלול</h3>
            
            <?php if (!empty($transcriptionContent) || !empty($proofreadContent)): ?>
                
                <?php if (!empty($transcriptionContent) && !empty($proofreadContent) && $hasProofread): ?>
                    <!-- השוואה בין תמלול מקורי להגהה -->
                    <div class="content-viewer">
                        <div class="content-box transcription">
                            <h4>תמלול מקורי</h4>
                            <div class="content-text"><?php echo htmlspecialchars($transcriptionContent); ?></div>
                        </div>
                        <div class="content-box proofread">
                            <h4>אחרי הגהה (סופי)</h4>
                            <div class="content-text"><?php echo htmlspecialchars($proofreadContent); ?></div>
                        </div>
                    </div>
                    
                <?php elseif (!empty($transcriptionContent)): ?>
                    <!-- תמלול בלבד -->
                    <div class="content-box transcription">
                        <h4>תמלול</h4>
                        <div class="content-text"><?php echo htmlspecialchars($transcriptionContent); ?></div>
                    </div>
                    
                <?php elseif (!empty($proofreadContent)): ?>
                    <!-- הגהה בלבד -->
                    <div class="content-box proofread">
                        <h4>תמלול מוגה</h4>
                        <div class="content-text"><?php echo htmlspecialchars($proofreadContent); ?></div>
                    </div>
                    
                <?php endif; ?>
                
            <?php else: ?>
                <div class="no-content">
                    <h4>אין תוכן תמלול זמין</h4>
                    <p>התמלול עדיין לא הושלם או לא הועלה למערכת</p>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- הורדות -->
        <div class="download-section">
            <h3>הורדת קבצים</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <?php if (!empty($transcriptionContent)): ?>
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="download">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="content_type" value="transcription">
                        <button type="submit" class="btn btn-success">הורד תמלול מקורי</button>
                    </form>
                <?php endif; ?>
                
                <?php if (!empty($proofreadContent) && $hasProofread): ?>
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="download">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="content_type" value="proofread">
                        <button type="submit" class="btn btn-info">הורד אחרי הגהה</button>
                    </form>
                <?php endif; ?>
                
                <?php if ($hasExport): ?>
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="download">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="content_type" value="export">
                        <button type="submit" class="btn btn-primary">הורד קובץ סופי (Word)</button>
                    </form>
                <?php endif; ?>
                
                <a href="<?php echo preserveDevParams('workflow.php?project=' . $project['id']); ?>" class="btn btn-secondary">
                    ניהול שלבי עבודה
                </a>
                
                <a href="<?php echo preserveDevParams('index.php'); ?>" class="btn btn-secondary">
                    חזור לרשימת פרויקטים
                </a>
            </div>
        </div>
    </div>
</body>
</html>