<?php
/*
 * =========================================
 * אפליקציית התמלול - דף הבית מתוקן
 * transcription_app/main/index.php
 * =========================================
 * תיקונים:
 * 1. תיקון נתיבי uploads
 * 2. הודעות באזור הפרויקטים העצמאיים
 * 3. תיקון יישור הקוביות
 * 4. הוספת גלילה וקישורים
 * 5. הוספת מידע על מדיה ושעות
 * 6. הסרת הודעות מיותרות
 */

// Fix: session_name() must be called BEFORE session_start()
session_name('TRANSCRIPTION_SESSION');
session_start();

// Database connection
$host = 'localhost';
$db = 'transcription_system';
$user = 'root';
$pass = '';

try {
    // First connect without database to create it
    $pdo = new PDO("mysql:host=$host;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS $db CHARACTER SET utf8 COLLATE utf8_general_ci");

    // Now connect to the database
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // **UTF-8 encoding settings**
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// הוספת עמודות לטבלת projects אם לא קיימות
try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_pages INT DEFAULT 0");
    $pdo->exec("ALTER TABLE projects ADD COLUMN total_pages INT DEFAULT 0");
    $pdo->exec("ALTER TABLE projects ADD COLUMN invoice_amount DECIMAL(10,2) DEFAULT 0.00");
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_backup TEXT NULL");
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_backup_date DATETIME NULL");
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_completed_by INT NULL");
    $pdo->exec("ALTER TABLE projects ADD FOREIGN KEY (transcription_completed_by) REFERENCES transcribers(id) ON DELETE SET NULL");
} catch (Exception $e) {
    // העמודות כבר קיימות או שגיאה אחרת - ממשיך
}

// יצירת שם פרויקט אוטומטי
function getProjectDisplayName($project)
{
    if (!$project) return 'פרויקט לא זמין';

    // אם יש שם מותאם - השתמש בו
    if (!empty($project['title'])) {
        return $project['title'];
    }

    // אחרת - צור שם מתיקייה
    $folderName = basename($project['folder_path']);

    // אם זה פרויקט עצמאי - נסה לחלץ מידע מהשם
    if (strpos($folderName, 'IND_') === 0) {
        $parts = explode('_', $folderName);
        if (count($parts) >= 2) {
            $timestamp = $parts[1];
            $date = date('d/m/Y H:i', $timestamp);
            return "פרויקט עצמאי - $date";
        }
    }

    // אחרת - השתמש בשם התיקייה
    return $folderName;
}

// Login check
if (!isset($_SESSION['user_id'])) {
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['login'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];

        $stmt = $pdo->prepare("SELECT id, password, permissions, transcriber_code FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            // Check if user has transcription permissions
            if (!strpos($user['permissions'], 'D') && !strpos($user['permissions'], 'E') && !strpos($user['permissions'], 'F')) {
                $loginError = "אין לך הרשאות לאפליקציית תמלול";
            } else {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $username;
                $_SESSION['permissions'] = $user['permissions'];
                $_SESSION['transcriber_code'] = $user['transcriber_code'];
                header("Location: " . $_SERVER['PHP_SELF']);
                exit;
            }
        } else {
            $loginError = "שם משתמש או סיסמה שגויים";
        }
    }
?>
    <!DOCTYPE html>
    <html dir="rtl" lang="he">

    <head>
        <meta charset="UTF-8">
        <title>התחברות לאפליקציית תמלול</title>
        <link rel="stylesheet" href="styles/css/transcription-styles.css">
    </head>

    <body style="display: flex; align-items: center; justify-content: center;">
        <div class="login-container">
            <div class="login-header">
                <h2>אפליקציית תמלול</h2>
                <p>התחברות לחשבון</p>
            </div>

            <?php if (isset($loginError)): ?>
                <div class="error"><?php echo $loginError; ?></div>
            <?php endif; ?>

            <?php if (isset($_GET['error']) && $_GET['error'] == 'no_permissions'): ?>
                <div class="error">אין לך הרשאות לאפליקציית תמלול</div>
            <?php endif; ?>

            <form method="POST">
                <div class="form-group">
                    <label>שם משתמש:</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>סיסמה:</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" name="login" style="width: 100%; background: linear-gradient(135deg, #e0a96d 0%, #d4956b 100%); color: white; padding: 14px; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(224, 169, 109, 0.3);">התחבר</button>
            </form>

            <div class="login-footer">
                <p>מערכת תמלול מתקדמת</p>
            </div>
        </div>
    </body>

    </html>
<?php
    exit;
}

// Logout
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// Check permissions for transcription
$userPermissions = $_SESSION['permissions'];
$hasA = strpos($userPermissions, 'A') !== false;
$hasB = strpos($userPermissions, 'B') !== false;
$hasC = strpos($userPermissions, 'C') !== false;
$hasD = strpos($userPermissions, 'D') !== false;
$hasE = strpos($userPermissions, 'E') !== false;
$hasF = strpos($userPermissions, 'F') !== false;

// Redirect if no transcription permissions
if (!$hasD && !$hasE && !$hasF) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF'] . "?error=no_permissions");
    exit;
}

// Independent projects functions
function createIndependentProject($workType, $userId, $customTitle = null)
{
    $projectId = 'IND_' . time() . '_' . rand(1000, 9999);
    $folderPath = '../../uploads/independent/' . $projectId;

    // Create project folder
    if (!file_exists($folderPath)) {
        mkdir($folderPath, 0777, true);
    }

    // Generate automatic title if not provided
    if (!$customTitle) {
        $workTypeHebrew = [
            'transcription' => 'תמלול',
            'proofreading' => 'הגהה',
            'export' => 'ייצוא'
        ];
        $customTitle = $workTypeHebrew[$workType] . ' - ' . date('d/m/Y H:i');
    }

    // Create project data
    $projectData = [
        'id' => $projectId,
        'title' => $customTitle,
        'description' => '',
        'work_type' => $workType,
        'user_id' => $userId,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'status' => 'active',
        'folder_path' => $folderPath,
        'files' => [],
        'media_files' => [],
        'transcription_files' => [],
        'proofreading_files' => [],
        'export_files' => [],
        'helper_files' => []
    ];

    // Save project data to JSON
    $jsonFile = $folderPath . '/project_data.json';
    file_put_contents($jsonFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return $projectData;
}

function getIndependentProjects($userId)
{
    $independentPath = '../../uploads/independent';
    $projects = [];

    if (!file_exists($independentPath)) {
        return $projects;
    }

    $folders = scandir($independentPath);
    foreach ($folders as $folder) {
        if ($folder === '.' || $folder === '..') continue;

        $projectPath = $independentPath . '/' . $folder;
        $jsonFile = $projectPath . '/project_data.json';

        if (file_exists($jsonFile)) {
            $projectData = json_decode(file_get_contents($jsonFile), true);
            if ($projectData && $projectData['user_id'] == $userId) {
                $projects[] = $projectData;
            }
        }
    }

    // Sort by creation date (newest first)
    usort($projects, function ($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    return $projects;
}

function updateIndependentProject($projectId, $data)
{
    $independentPath = '../../uploads/independent';
    $projectPath = $independentPath . '/' . $projectId;
    $jsonFile = $projectPath . '/project_data.json';

    if (file_exists($jsonFile)) {
        $projectData = json_decode(file_get_contents($jsonFile), true);
        $projectData = array_merge($projectData, $data);
        $projectData['updated_at'] = date('Y-m-d H:i:s');

        file_put_contents($jsonFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $projectData;
    }

    return false;
}

// פונקציה לחישוב מידע על מדיה
function getProjectMediaInfo($project) {
    if (!$project || !isset($project['files'])) {
        return ['total_files' => 0, 'total_duration' => '00:00:00'];
    }
    
    $files = $project['files'];
    $mediaFiles = array_filter($files, function($file) {
        return isset($file['category']) && $file['category'] === 'media' && 
               in_array(strtolower($file['extension']), ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'avi', 'mov', 'wmv']);
    });
    
    $totalFiles = count($mediaFiles);
    $totalDuration = 0;
    
    // הערכה גסה לפי גודל הקובץ
    foreach ($mediaFiles as $file) {
        $estimatedDuration = $file['size'] / (128 * 1024); // הערכה עבור 128kbps
        $totalDuration += $estimatedDuration;
    }
    
    $hours = floor($totalDuration / 3600);
    $minutes = floor(($totalDuration % 3600) / 60);
    $seconds = $totalDuration % 60;
    
    return [
        'total_files' => $totalFiles,
        'total_duration' => $totalDuration,
        'duration_formatted' => sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds)
    ];
}

/// Handle form submissions for status updates and independent projects
$independentProjectMessage = null;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'update_workflow':
                if ($hasB) {
                    $projectId = $_POST['project_id'];
                    $newWorkflowStatus = $_POST['workflow_status'];

                    $stmt = $pdo->prepare("UPDATE projects SET workflow_status = ? WHERE id = ?");
                    $stmt->execute([$newWorkflowStatus, $projectId]);
                    $message = "שלב העבודה עודכן בהצלחה";
                }
                break;

            case 'create_independent_project':
                $workType = $_POST['work_type'];
                $customTitle = !empty($_POST['custom_title']) ? $_POST['custom_title'] : null;

                try {
                    $project = createIndependentProject($workType, $_SESSION['user_id'], $customTitle);
                    $independentProjectMessage = [
                        'type' => 'success',
                        'text' => "פרויקט עצמאי '{$project['title']}' נוצר בהצלחה"
                    ];
                } catch (Exception $e) {
                    $independentProjectMessage = [
                        'type' => 'error',
                        'text' => "שגיאה ביצירת פרויקט עצמאי: " . $e->getMessage()
                    ];
                }
                break;

           case 'delete_independent_project':
                $projectId = $_POST['project_id'];
                $independentPath = '../../uploads/independent';
                $projectPath = $independentPath . '/' . $projectId;

                try {
                    if (file_exists($projectPath)) {
                        // Delete project folder recursively
                        $files = new RecursiveIteratorIterator(
                            new RecursiveDirectoryIterator($projectPath, RecursiveDirectoryIterator::SKIP_DOTS),
                            RecursiveIteratorIterator::CHILD_FIRST
                        );

                        foreach ($files as $fileinfo) {
                            if ($fileinfo->isDir()) {
                                rmdir($fileinfo->getRealPath());
                            } else {
                                unlink($fileinfo->getRealPath());
                            }
                        }
                        rmdir($projectPath);

                         $independentProjectMessage = [
                            'type' => 'success',
                            'text' => "פרויקט עצמאי נמחק בהצלחה"
                        ];
                    }
                } catch (Exception $e) {
                    $independentProjectMessage = [
                        'type' => 'error',
                        'text' => "שגיאה במחיקת פרויקט עצמאי: " . $e->getMessage()
                    ];
                }
                break;
        }
    }
}

// Get user's transcriber info
$transStmt = $pdo->prepare("SELECT * FROM transcribers WHERE user_id = ?");
$transStmt->execute([$_SESSION['user_id']]);
$transcriber = $transStmt->fetch();

// אם המשתמש הוא אדמין עם הרשאות CRM, צור עבורו פרופיל מתמלל אוטומטי
if (!$transcriber && ($hasA || $hasB || $hasC)) {
    try {
        // צור פרופיל מתמלל אוטומטי לאדמין
        $adminTranscriberCode = 'ADMIN_' . $_SESSION['user_id'] . '_' . time();
        $adminStmt = $pdo->prepare("INSERT INTO transcribers (user_id, name, email, transcriber_code) VALUES (?, ?, ?, ?)");
        $adminStmt->execute([
            $_SESSION['user_id'],
            $_SESSION['username'] . ' (אדמין)',
            $_SESSION['username'] . '@admin.local',
            $adminTranscriberCode
        ]);

        // קבל את הפרופיל החדש
        $transStmt = $pdo->prepare("SELECT * FROM transcribers WHERE user_id = ?");
        $transStmt->execute([$_SESSION['user_id']]);
        $transcriber = $transStmt->fetch();
    } catch (Exception $e) {
        // אם יש שגיאה, המשך בלי פרופיל מתמלל
    }
}

// Get projects by workflow status and company
function getProjectsByWorkflowAndCompany($pdo, $workflowStatus, $transcriber, $hasA, $hasB, $hasC, $hasD, $hasE, $hasF)
{
    $whereClause = "1=1";
    $params = [];

    // אם המשתמש הוא אדמין (יש לו הרשאות CRM), הציג את כל הפרויקטים של החברה שלו
    if ($hasA || $hasB || $hasC) {
        $companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
        $companyStmt->execute([$_SESSION['user_id']]);
        $adminCompany = $companyStmt->fetch();

        if ($adminCompany) {
            $whereClause = "company_id = ? AND workflow_status = ?";
            $params = [$adminCompany['id'], $workflowStatus];
        } else {
            $whereClause = "1=0";
            $params = [];
        }
    } elseif ($transcriber) {
        // משתמש רגיל - לפי הרשאות ושלב העבודה
        $conditions = [];
        $tempParams = [];

        if ($hasD && $workflowStatus == 'ready_for_transcription') {
            $conditions[] = "assigned_transcriber_id = ?";
            $tempParams[] = $transcriber['id'];
        }

        if ($hasE && $workflowStatus == 'ready_for_proofreading') {
            $conditions[] = "assigned_proofreader_id = ?";
            $tempParams[] = $transcriber['id'];
        }

        if ($hasF && $workflowStatus == 'ready_for_export') {
            $companiesStmt = $pdo->prepare("
                SELECT DISTINCT tc.company_id 
                FROM transcriber_companies tc 
                WHERE tc.transcriber_id = ?
            ");
            $companiesStmt->execute([$transcriber['id']]);
            $companies = $companiesStmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($companies)) {
                $placeholders = str_repeat('?,', count($companies) - 1) . '?';
                $conditions[] = "company_id IN ($placeholders)";
                $tempParams = array_merge($tempParams, $companies);
            }
        }

        if (!empty($conditions)) {
            $whereClause = "(" . implode(" OR ", $conditions) . ") AND workflow_status = ?";
            $params = array_merge($tempParams, [$workflowStatus]);
        } else {
            $whereClause = "1=0";
            $params = [];
        }
    }

    if ($whereClause !== "1=0") {
        $stmt = $pdo->prepare("
            SELECT p.*, c.name as company_name, cl.name as client_name, cl.company as client_company
            FROM projects p 
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN clients cl ON p.client_id = cl.id
            WHERE $whereClause
            ORDER BY p.created_at DESC
        ");
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    return [];
}

// Get independent projects
$independentProjects = getIndependentProjects($_SESSION['user_id']);

// Get projects for each workflow status
$transcriptionProjects = getProjectsByWorkflowAndCompany($pdo, 'ready_for_transcription', $transcriber, $hasA, $hasB, $hasC, $hasD, $hasE, $hasF);
$proofreadingProjects = getProjectsByWorkflowAndCompany($pdo, 'ready_for_proofreading', $transcriber, $hasA, $hasB, $hasC, $hasD, $hasE, $hasF);
$exportProjects = getProjectsByWorkflowAndCompany($pdo, 'ready_for_export', $transcriber, $hasA, $hasB, $hasC, $hasD, $hasE, $hasF);

// Add independent projects to the appropriate work type count
$independentTranscriptionCount = 0;
$independentProofreadingCount = 0;
$independentExportCount = 0;

foreach ($independentProjects as $indProject) {
    switch ($indProject['work_type']) {
        case 'transcription':
            $independentTranscriptionCount++;
            break;
        case 'proofreading':
            $independentProofreadingCount++;
            break;
        case 'export':
            $independentExportCount++;
            break;
    }
}

// Group projects by company with additional stats
function groupProjectsByCompany($projects)
{
    $grouped = [];
    foreach ($projects as $project) {
        $companyName = $project['company_name'] ?? 'ללא חברה';
        if (!isset($grouped[$companyName])) {
            $grouped[$companyName] = [
                'projects' => [],
                'total_projects' => 0,
                'total_pages' => 0,
                'total_amount' => 0,
                'latest_date' => null,
                'company_id' => $project['company_id'] ?? null
            ];
        }
        $grouped[$companyName]['projects'][] = $project;
        $grouped[$companyName]['total_projects']++;
        $grouped[$companyName]['total_pages'] += $project['total_pages'] ?? 0;
        $grouped[$companyName]['total_amount'] += $project['invoice_amount'] ?? 0;

        $projectDate = strtotime($project['created_at']);
        if (!$grouped[$companyName]['latest_date'] || $projectDate > $grouped[$companyName]['latest_date']) {
            $grouped[$companyName]['latest_date'] = $projectDate;
        }
    }
    return $grouped;
}

// Get company statistics
function getCompanyStats($pdo, $companyId)
{
    $stats = [
        'total_projects' => 0,
        'completed_projects' => 0,
        'pending_projects' => 0,
        'total_pages' => 0,
        'total_revenue' => 0,
        'avg_completion_time' => 0
    ];

    if (!$companyId) return $stats;

    // Total projects
    $stmt = $pdo->prepare("SELECT COUNT(*) as total, SUM(total_pages) as pages, SUM(invoice_amount) as revenue FROM projects WHERE company_id = ?");
    $stmt->execute([$companyId]);
    $result = $stmt->fetch();

    $stats['total_projects'] = $result['total'] ?? 0;
    $stats['total_pages'] = $result['pages'] ?? 0;
    $stats['total_revenue'] = $result['revenue'] ?? 0;

    // Status breakdown
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM projects WHERE company_id = ? GROUP BY status");
    $stmt->execute([$companyId]);
    while ($row = $stmt->fetch()) {
        if ($row['status'] == 'completed' || $row['status'] == 'exported') {
            $stats['completed_projects'] += $row['count'];
        } else {
            $stats['pending_projects'] += $row['count'];
        }
    }

    return $stats;
}

$transcriptionByCompany = groupProjectsByCompany($transcriptionProjects);
$proofreadingByCompany = groupProjectsByCompany($proofreadingProjects);
$exportByCompany = groupProjectsByCompany($exportProjects);

// Add independent projects to company groups
if ($independentTranscriptionCount > 0) {
    $independentTranscriptionProjects = array_filter($independentProjects, function($p) { return $p['work_type'] === 'transcription'; });
    $independentTranscriptionProjects = array_values($independentTranscriptionProjects); // Re-index array
    $transcriptionByCompany['פרויקטים עצמאיים'] = [
        'projects' => $independentTranscriptionProjects,
        'total_projects' => $independentTranscriptionCount,
        'total_pages' => 0,
        'total_amount' => 0,
        'latest_date' => !empty($independentTranscriptionProjects) ? strtotime($independentTranscriptionProjects[0]['created_at']) : null,
        'company_id' => null
    ];
}

if ($independentProofreadingCount > 0) {
    $independentProofreadingProjects = array_filter($independentProjects, function($p) { return $p['work_type'] === 'proofreading'; });
    $independentProofreadingProjects = array_values($independentProofreadingProjects); // Re-index array
    $proofreadingByCompany['פרויקטים עצמאיים'] = [
        'projects' => $independentProofreadingProjects,
        'total_projects' => $independentProofreadingCount,
        'total_pages' => 0,
        'total_amount' => 0,
        'latest_date' => !empty($independentProofreadingProjects) ? strtotime($independentProofreadingProjects[0]['created_at']) : null,
        'company_id' => null
    ];
}

if ($independentExportCount > 0) {
    $independentExportProjects = array_filter($independentProjects, function($p) { return $p['work_type'] === 'export'; });
    $independentExportProjects = array_values($independentExportProjects); // Re-index array
    $exportByCompany['פרויקטים עצמאיים'] = [
        'projects' => $independentExportProjects,
        'total_projects' => $independentExportCount,
        'total_pages' => 0,
        'total_amount' => 0,
        'latest_date' => !empty($independentExportProjects) ? strtotime($independentExportProjects[0]['created_at']) : null,
        'company_id' => null
    ];
}
?>

<!DOCTYPE html>
<html dir="rtl" lang="he">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אפליקציית תמלול - דף הבית</title>
    <link rel="stylesheet" href="styles/css/transcription-styles.css">  
<style>
        /* תיקונים נוספים לעיצוב */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(32, 30, 32, 0.05);
            border: 1px solid rgba(224, 169, 109, 0.1);
            min-height: 100px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }

        .work-section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(32, 30, 32, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            max-height: 600px;
            display: flex;
            flex-direction: column;
        }

        .work-section:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(32, 30, 32, 0.15);
        }

        .section-header {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .section-header:hover {
            background: rgba(224, 169, 109, 0.1);
            border-radius: 15px;
            padding: 10px;
            margin: -10px;
        }

        .work-section-content {
            flex: 1;
            overflow-y: auto;
            margin-top: 10px;
        }

        .work-section-content::-webkit-scrollbar {
            width: 8px;
        }

        .work-section-content::-webkit-scrollbar-track {
            background: rgba(224, 169, 109, 0.1);
            border-radius: 10px;
        }

        .work-section-content::-webkit-scrollbar-thumb {
            background: rgba(224, 169, 109, 0.5);
            border-radius: 10px;
        }

        .work-section-content::-webkit-scrollbar-thumb:hover {
            background: rgba(224, 169, 109, 0.7);
        }

        .independent-project-message {
            background: rgba(253, 126, 20, 0.1);
            border: 2px solid rgba(253, 126, 20, 0.3);
            border-radius: 15px;
            padding: 15px 20px;
            margin-bottom: 20px;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .independent-project-message.success {
            background: rgba(253, 126, 20, 0.1);
            border-color: rgba(253, 126, 20, 0.3);
            color: #fd7e14;
        }

        .independent-project-message.error {
            background: rgba(220, 53, 69, 0.1);
            border-color: rgba(220, 53, 69, 0.3);
            color: #dc3545;
        }

        .project-media-info {
            background: rgba(40, 167, 69, 0.1);
            border-radius: 8px;
            padding: 8px 12px;
            margin-top: 8px;
            font-size: 12px;
            color: #28a745;
            display: flex;
            gap: 15px;
        }

        .project-media-info-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        @media (max-width: 1200px) {
            .main-grid {
                grid-template-columns: 1fr;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    </head>

<body>
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <h1>אפליקציית תמלול</h1>
            </div>
            <div class="user-info">
                <div class="user-profile">
                    <span>שלום <?php echo htmlspecialchars($_SESSION['username']); ?></span>
                    <?php if ($transcriber): ?>
                        <span style="margin-right: 15px; opacity: 0.8;">קוד: <?php echo htmlspecialchars($transcriber['transcriber_code']); ?></span>
                    <?php endif; ?>
                </div>
                <a href="?logout=1" class="logout-btn">התנתק</a>
            </div>
        </div>
    </div>

    <div class="nav">
        <div class="nav-content">
            <div class="nav-links">
                <a href="index.php" class="active">דף הבית</a>
                <?php if ($hasD): ?>
                    <a href="../transcription/">תמלול</a>
                <?php endif; ?>
                <?php if ($hasE): ?>
                    <a href="../proofreading/">הגהה</a>
                <?php endif; ?>
                <?php if ($hasF): ?>
                    <a href="../export/">ייצוא</a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Company Filter Section -->
        <div class="filter-section">
            <div class="filter-header">
                <div class="filter-icon">🔍</div>
                <h3>סינון וחיפוש</h3>
            </div>
            <div class="filter-controls">
                <div class="filter-control">
                    <label>חברה:</label>
                    <select id="companyFilter">
                        <option value="">כל החברות</option>
                        <?php
                        $allCompanies = [];
                        foreach (array_merge($transcriptionByCompany, $proofreadingByCompany, $exportByCompany) as $companyName => $data) {
                            if (!in_array($companyName, $allCompanies)) {
                                $allCompanies[] = $companyName;
                            }
                        }
                        foreach ($allCompanies as $companyName):
                        ?>
                            <option value="<?php echo htmlspecialchars($companyName); ?>"><?php echo htmlspecialchars($companyName); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="filter-control">
                    <label>סוג עבודה:</label>
                    <select id="workTypeFilter">
                        <option value="">כל הסוגים</option>
                        <option value="transcription">תמלול</option>
                        <option value="proofreading">הגהה</option>
                        <option value="export">ייצוא</option>
                    </select>
                </div>
                <div class="filter-control">
                    <label>תצוגה:</label>
                    <select id="viewMode">
                        <option value="expanded">מורחב</option>
                        <option value="collapsed">מכווץ</option>
                    </select>
                </div>
                <button class="btn btn-secondary" onclick="resetFilters()">איפוס סינון</button>
            </div>
        </div>

         <!-- Statistics Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?php echo count($transcriptionProjects) + $independentTranscriptionCount; ?></div>
                <div class="stat-label">עבודות תמלול</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo count($proofreadingProjects) + $independentProofreadingCount; ?></div>
                <div class="stat-label">עבודות הגהה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo count($exportProjects) + $independentExportCount; ?></div>
                <div class="stat-label">עבודות ייצוא</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo count($transcriptionProjects) + count($proofreadingProjects) + count($exportProjects) + count($independentProjects); ?></div>
                <div class="stat-label">סה"כ עבודות</div>
            </div>
        </div>

        <!-- Main Work Sections -->
        <div class="main-grid">
            <!-- Transcription Section -->
            <div class="work-section transcription-section">
                <div class="section-header" onclick="window.location.href='<?php echo $hasD ? '../transcription/' : '#'; ?>'">
                    <div class="section-icon">📝</div>
                    <div>
                        <div class="section-title">תמלול</div>
                        <div class="section-count"><?php echo count($transcriptionProjects) + $independentTranscriptionCount; ?> עבודות</div>
                    </div>
                </div>

                <div class="work-section-content">
                    <?php if (empty($transcriptionByCompany)): ?>
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <h3>אין עבודות תמלול כרגע</h3>
                            <p>עבודות תמלול חדשות יופיעו כאן</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($transcriptionByCompany as $companyName => $companyData): ?>
                            <div class="company-group" data-company="<?php echo htmlspecialchars($companyName); ?>" data-work-type="transcription">
                                <div class="company-header">
                                    <div class="company-info">
                                        <div class="company-icon">🏢</div>
                                        <div class="company-details">
                                            <div class="company-name"><?php echo htmlspecialchars($companyName); ?></div>
                                            <div class="company-stats">
                                                <span class="company-stat"><?php echo $companyData['total_projects']; ?> פרויקטים</span>
                                                <?php if ($companyData['total_pages'] > 0): ?>
                                                    <span class="company-stat"><?php echo $companyData['total_pages']; ?> עמודים</span>
                                                <?php endif; ?>
                                                <?php if ($companyData['total_amount'] > 0): ?>
                                                    <span class="company-stat">₪<?php echo number_format($companyData['total_amount'], 0); ?></span>
                                                <?php endif; ?>
                                                <?php if ($companyData['latest_date']): ?>
                                                    <span class="company-stat">עדכון: <?php echo date('d/m', $companyData['latest_date']); ?></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="company-actions">
                                        <button class="company-toggle" onclick="toggleCompanyProjects(this)">
                                            <span class="toggle-text">הצג פרטים</span>
                                        </button>
                                    </div>
                                </div>

                                <div class="company-projects collapsed">
                                    <?php
                                    $stats = getCompanyStats($pdo, $companyData['company_id']);
                                    if ($stats['total_projects'] > 0):
                                    ?>
                                        <div class="company-summary">
                                            <div class="summary-grid">
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['total_projects']; ?></div>
                                                    <div class="summary-label">סה"כ פרויקטים</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['completed_projects']; ?></div>
                                                    <div class="summary-label">הושלמו</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['pending_projects']; ?></div>
                                                    <div class="summary-label">בעבודה</div>
                                                </div>
                                                <?php if ($stats['total_pages'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number"><?php echo $stats['total_pages']; ?></div>
                                                        <div class="summary-label">עמודים</div>
                                                    </div>
                                                <?php endif; ?>
                                                <?php if ($stats['total_revenue'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number">₪<?php echo number_format($stats['total_revenue'], 0); ?></div>
                                                        <div class="summary-label">סה"כ הכנסות</div>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>

                                    <?php foreach ($companyData['projects'] as $project): ?>
                                        <div class="project-card">
                                            <div class="project-title">
                                                <span class="company-badge">תמלול</span>
                                                <?php 
                                                // בדיקה אם זה פרויקט עצמאי או CRM
                                                if (isset($project['work_type'])) {
                                                    // פרויקט עצמאי
                                                    echo htmlspecialchars($project['title']);
                                                } else {
                                                    // פרויקט CRM
                                                    echo htmlspecialchars(getProjectDisplayName($project));
                                                }
                                                ?>
                                            </div>
                                            <div class="project-details">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <div class="project-detail">
                                                        <strong>נוצר:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <div class="project-detail">
                                                        <strong>קבצים:</strong> <?php echo count($project['files'] ?? []); ?>
                                                    </div>
                                                    <?php 
                                                    $mediaInfo = getProjectMediaInfo($project);
                                                    if ($mediaInfo['total_files'] > 0):
                                                    ?>
                                                        <div class="project-media-info">
                                                            <div class="project-media-info-item">
                                                                <span>🎵</span>
                                                                <span><?php echo $mediaInfo['total_files']; ?> מדיה</span>
                                                            </div>
                                                            <div class="project-media-info-item">
                                                                <span>⏱️</span>
                                                                <span><?php echo $mediaInfo['duration_formatted']; ?></span>
                                                            </div>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                    <?php if ($project['client_name']): ?>
                                                        <div class="project-detail">
                                                            <strong>לקוח:</strong> <?php echo htmlspecialchars($project['client_name'] . ' - ' . $project['client_company']); ?>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div class="project-detail">
                                                        <strong>תאריך:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <?php if ($project['total_pages'] > 0): ?>
                                                        <div class="project-detail">
                                                            <strong>עמודים:</strong> <?php echo $project['total_pages']; ?>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php endif; ?>
                                            </div>
                                            <div class="project-actions">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <a href="functions/php/file_manager.php?project_id=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        נהל קבצים
                                                    </a>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                    <a href="../transcription/?project=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        התחל תמלול
                                                    </a>
                                                    <a href="#" class="btn btn-secondary">פרטים</a>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Proofreading Section -->
            <div class="work-section proofreading-section">
                <div class="section-header" onclick="window.location.href='<?php echo $hasE ? '../proofreading/' : '#'; ?>'" >
                    <div class="section-icon">✏️</div>
                    <div>
      <div class="section-title">הגהה</div>
                        <div class="section-count"><?php echo count($proofreadingProjects) + $independentProofreadingCount; ?> עבודות</div>
                    </div>
                </div>

                <div class="work-section-content">
                    <?php if (empty($proofreadingByCompany)): ?>
                        <div class="empty-state">
                            <div class="empty-state-icon">✏️</div>
                            <h3>אין עבודות הגהה כרגע</h3>
                            <p>עבודות הגהה חדשות יופיעו כאן</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($proofreadingByCompany as $companyName => $companyData): ?>
                            <div class="company-group" data-company="<?php echo htmlspecialchars($companyName); ?>" data-work-type="proofreading">
                                <div class="company-header">
                                    <div class="company-info">
                                        <div class="company-icon">🏢</div>
                                        <div class="company-details">
                                            <div class="company-name"><?php echo htmlspecialchars($companyName); ?></div>
                                            <div class="company-stats">
                                                <span class="company-stat"><?php echo $companyData['total_projects']; ?> פרויקטים</span>
                                                <?php if ($companyData['total_pages'] > 0): ?>
                                                    <span class="company-stat"><?php echo $companyData['total_pages']; ?> עמודים</span>
                                                <?php endif; ?>
                                                <?php if ($companyData['total_amount'] > 0): ?>
                                                    <span class="company-stat">₪<?php echo number_format($companyData['total_amount'], 0); ?></span>
                                                <?php endif; ?>
                                                <?php if ($companyData['latest_date']): ?>
                                                    <span class="company-stat">עדכון: <?php echo date('d/m', $companyData['latest_date']); ?></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="company-actions">
                                        <button class="company-toggle" onclick="toggleCompanyProjects(this)">
                                            <span class="toggle-text">הצג פרטים</span>
                                        </button>
                                    </div>
                                </div>

                                <div class="company-projects collapsed">
                                    <?php
                                    $stats = getCompanyStats($pdo, $companyData['company_id']);
                                    if ($stats['total_projects'] > 0):
                                    ?>
                                        <div class="company-summary">
                                            <div class="summary-grid">
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['total_projects']; ?></div>
                                                    <div class="summary-label">סה"כ פרויקטים</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['completed_projects']; ?></div>
                                                    <div class="summary-label">הושלמו</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['pending_projects']; ?></div>
                                                    <div class="summary-label">בעבודה</div>
                                                </div>
                                                <?php if ($stats['total_pages'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number"><?php echo $stats['total_pages']; ?></div>
                                                        <div class="summary-label">עמודים</div>
                                                    </div>
                                                <?php endif; ?>
                                                <?php if ($stats['total_revenue'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number">₪<?php echo number_format($stats['total_revenue'], 0); ?></div>
                                                        <div class="summary-label">סה"כ הכנסות</div>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>

                                    <?php foreach ($companyData['projects'] as $project): ?>
                                        <div class="project-card">
                                            <div class="project-title">
                                                <span class="company-badge">הגהה</span>
                                                <?php 
                                                if (isset($project['work_type'])) {
                                                    echo htmlspecialchars($project['title']);
                                                } else {
                                                    echo htmlspecialchars(getProjectDisplayName($project));
                                                }
                                                ?>
                                            </div>
                                            <div class="project-details">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <div class="project-detail">
                                                        <strong>נוצר:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <div class="project-detail">
                                                        <strong>קבצים:</strong> <?php echo count($project['files'] ?? []); ?>
                                                    </div>
                                                    <?php 
                                                    $mediaInfo = getProjectMediaInfo($project);
                                                    if ($mediaInfo['total_files'] > 0):
                                                    ?>
                                                        <div class="project-media-info">
                                                            <div class="project-media-info-item">
                                                                <span>🎵</span>
                                                                <span><?php echo $mediaInfo['total_files']; ?> מדיה</span>
                                                            </div>
                                                            <div class="project-media-info-item">
                                                                <span>⏱️</span>
                                                                <span><?php echo $mediaInfo['duration_formatted']; ?></span>
                                                            </div>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                    <?php if ($project['client_name']): ?>
                                                        <div class="project-detail">
                                                            <strong>לקוח:</strong> <?php echo htmlspecialchars($project['client_name'] . ' - ' . $project['client_company']); ?>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div class="project-detail">
                                                        <strong>תאריך:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <?php if ($project['total_pages'] > 0): ?>
                                                        <div class="project-detail">
                                                            <strong>עמודים:</strong> <?php echo $project['total_pages']; ?>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php endif; ?>
                                            </div>
                                            <div class="project-actions">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <a href="functions/php/file_manager.php?project_id=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        נהל קבצים
                                                    </a>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                    <a href="../proofreading/?project=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        התחל הגהה
                                                    </a>
                                                    <a href="#" class="btn btn-secondary">פרטים</a>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Export Section -->
            <div class="work-section export-section">
                <div class="section-header" onclick="window.location.href='<?php echo $hasF ? '../export/projects/' : '#'; ?>'" >
                    <div class="section-icon">📄</div>
                    <div>
                        <div class="section-title">ייצוא</div>
                        <div class="section-count"><?php echo count($exportProjects) + $independentExportCount; ?> עבודות</div>
                    </div>
                </div>

                <div class="work-section-content">
                    <?php if (empty($exportByCompany)): ?>
                        <div class="empty-state">
                            <div class="empty-state-icon">📄</div>
                            <h3>אין עבודות ייצוא כרגע</h3>
                            <p>עבודות ייצוא חדשות יופיעו כאן</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($exportByCompany as $companyName => $companyData): ?>
                            <div class="company-group" data-company="<?php echo htmlspecialchars($companyName); ?>" data-work-type="export">
                                <div class="company-header">
                                    <div class="company-info">
                                        <div class="company-icon">🏢</div>
                                        <div class="company-details">
                                            <div class="company-name"><?php echo htmlspecialchars($companyName); ?></div>
                                            <div class="company-stats">
                                                <span class="company-stat"><?php echo $companyData['total_projects']; ?> פרויקטים</span>
                                                <?php if ($companyData['total_pages'] > 0): ?>
                                                    <span class="company-stat"><?php echo $companyData['total_pages']; ?> עמודים</span>
                                                <?php endif; ?>
                                                <?php if ($companyData['total_amount'] > 0): ?>
                                                    <span class="company-stat">₪<?php echo number_format($companyData['total_amount'], 0); ?></span>
                                                <?php endif; ?>
                                                <?php if ($companyData['latest_date']): ?>
                                                    <span class="company-stat">עדכון: <?php echo date('d/m', $companyData['latest_date']); ?></span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="company-actions">
                                        <button class="company-toggle" onclick="toggleCompanyProjects(this)">
                                            <span class="toggle-text">הצג פרטים</span>
                                        </button>
                                    </div>
                                </div>

                                <div class="company-projects collapsed">
                                    <?php
                                    $stats = getCompanyStats($pdo, $companyData['company_id']);
                                    if ($stats['total_projects'] > 0):
                                    ?>
                                        <div class="company-summary">
                                            <div class="summary-grid">
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['total_projects']; ?></div>
                                                    <div class="summary-label">סה"כ פרויקטים</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['completed_projects']; ?></div>
                                                    <div class="summary-label">הושלמו</div>
                                                </div>
                                                <div class="summary-item">
                                                    <div class="summary-number"><?php echo $stats['pending_projects']; ?></div>
                                                    <div class="summary-label">בעבודה</div>
                                                </div>
                                                <?php if ($stats['total_pages'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number"><?php echo $stats['total_pages']; ?></div>
                                                        <div class="summary-label">עמודים</div>
                                                    </div>
                                                <?php endif; ?>
                                                <?php if ($stats['total_revenue'] > 0): ?>
                                                    <div class="summary-item">
                                                        <div class="summary-number">₪<?php echo number_format($stats['total_revenue'], 0); ?></div>
                                                        <div class="summary-label">סה"כ הכנסות</div>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>

                                    <?php foreach ($companyData['projects'] as $project): ?>
                                        <div class="project-card">
                                            <div class="project-title">
                                                <span class="company-badge">ייצוא</span>
                                                <?php 
                                                if (isset($project['work_type'])) {
                                                    echo htmlspecialchars($project['title']);
                                                } else {
                                                    echo htmlspecialchars(getProjectDisplayName($project));
                                                }
                                                ?>
                                            </div>
                                            <div class="project-details">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <div class="project-detail">
                                                        <strong>נוצר:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <div class="project-detail">
                                                        <strong>קבצים:</strong> <?php echo count($project['files'] ?? []); ?>
                                                    </div>
                                                    <?php 
                                                    $mediaInfo = getProjectMediaInfo($project);
                                                    if ($mediaInfo['total_files'] > 0):
                                                    ?>
                                                        <div class="project-media-info">
                                                            <div class="project-media-info-item">
                                                                <span>🎵</span>
                                                                <span><?php echo $mediaInfo['total_files']; ?> מדיה</span>
                                                            </div>
                                                            <div class="project-media-info-item">
                                                                <span>⏱️</span>
                                                                <span><?php echo $mediaInfo['duration_formatted']; ?></span>
                                                            </div>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                    <?php if ($project['client_name']): ?>
                                                        <div class="project-detail">
                                                            <strong>לקוח:</strong> <?php echo htmlspecialchars($project['client_name'] . ' - ' . $project['client_company']); ?>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div class="project-detail">
                                                        <strong>תאריך:</strong> <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                                    </div>
                                                    <?php if ($project['total_pages'] > 0): ?>
                                                        <div class="project-detail">
                                                            <strong>עמודים:</strong> <?php echo $project['total_pages']; ?>
                                                        </div>
                                                    <?php endif; ?>
                                                <?php endif; ?>
                                            </div>
                                            <div class="project-actions">
                                                <?php if (isset($project['work_type'])): ?>
                                                    <!-- פרויקט עצמאי -->
                                                    <a href="functions/php/file_manager.php?project_id=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        נהל קבצים
                                                    </a>
                                                <?php else: ?>
                                                    <!-- פרויקט CRM -->
                                                  <a href="../../export/projects/index.php?project=<?php echo $project['id']; ?>" class="btn btn-primary">
                                                        התחל ייצוא
                                                    </a>
                                                    <a href="#" class="btn btn-secondary">פרטים</a>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Independent Projects Section -->
        <div class="independent-projects">
            <div class="independent-header">
                <div class="independent-icon">🚀</div>
                <div>
                    <div class="section-title">פרויקטים עצמאיים</div>
                    <p style="margin: 5px 0 0 0; color: #666;">צור פרויקט חדש ללא מערכת CRM</p>
                </div>
            </div>

            <!-- הודעות פרויקטים עצמאיים -->
            <?php if ($independentProjectMessage): ?>
                <div class="independent-project-message <?php echo $independentProjectMessage['type']; ?>">
                    <?php echo htmlspecialchars($independentProjectMessage['text']); ?>
                </div>
            <?php endif; ?>

            <!-- Project Creator -->
            <div class="project-creator">
                <div class="creator-header">
                    <div class="creator-icon">➕</div>
                    <h3>יצירת פרויקט חדש</h3>
                </div>

                <form method="POST" class="creator-form">
                    <input type="hidden" name="action" value="create_independent_project">

                    <div class="form-group">
                        <label>סוג העבודה:</label>
                        <div class="work-type-selector">
                            <div class="work-type-option" onclick="selectWorkType('transcription')">
                                <input type="radio" name="work_type" value="transcription" id="wt_transcription">
                                <div class="work-type-icon">📝</div>
                                <div class="work-type-title">תמלול</div>
                                <div class="work-type-desc">תמלול אודיו/וידאו</div>
                            </div>
                            <div class="work-type-option" onclick="selectWorkType('proofreading')">
                                <input type="radio" name="work_type" value="proofreading" id="wt_proofreading">
                                <div class="work-type-icon">✏️</div>
                                <div class="work-type-title">הגהה</div>
                                <div class="work-type-desc">הגהת תמלול קיים</div>
                            </div>
                            <div class="work-type-option" onclick="selectWorkType('export')">
                                <input type="radio" name="work_type" value="export" id="wt_export">
                                <div class="work-type-icon">📄</div>
                                <div class="work-type-title">ייצוא</div>
                                <div class="work-type-desc">ייצוא לוורד</div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>שם הפרויקט (אופציונלי):</label>
                        <input type="text" name="custom_title" placeholder="אם לא תמלא, יווצר שם אוטומטי עם תאריך ושעה">
                        <small style="color: #666; font-size: 12px; margin-top: 5px; display: block;">
                            💡 אם תשאיר ריק, השם יהיה: "תמלול - 07/07/2025 14:30"
                        </small>
                    </div>

                    <div style="text-align: center;">
                        <button type="submit" class="create-btn">צור פרויקט חדש</button>
                    </div>
                </form>
            </div>

            <!-- Existing Independent Projects -->
            <div class="independent-projects-list">
                <h3 style="margin-bottom: 20px;">הפרויקטים שלי (<?php echo count($independentProjects); ?>)</h3>

                <?php if (empty($independentProjects)): ?>
                    <div class="empty-state">
                        <div class="empty-state-icon">📁</div>
                        <h3>אין פרויקטים עצמאיים כרגע</h3>
                        <p>צור פרויקט חדש למעלה כדי להתחיל</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($independentProjects as $project): ?>
                        <div class="independent-project-card">
                            <div class="independent-project-header">
                                <div class="independent-project-title"><?php echo htmlspecialchars($project['title']); ?></div>
                                <div class="independent-project-type <?php echo $project['work_type']; ?>">
                                    <?php
                                    $workTypeHebrew = [
                                        'transcription' => 'תמלול',
                                        'proofreading' => 'הגהה',
                                        'export' => 'ייצוא'
                                    ];
                                    echo $workTypeHebrew[$project['work_type']];
                                    ?>
                                </div>
                            </div>

                            <div class="independent-project-meta">
                                <span class="independent-project-stat">
                                    נוצר: <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                                </span>
                                <span class="independent-project-stat">
                                    עודכן: <?php echo date('d/m/Y H:i', strtotime($project['updated_at'])); ?>
                                </span>
                                <span class="independent-project-stat">
                                    סטטוס: <?php echo $project['status']; ?>
                                </span>
                                <span class="independent-project-stat">
                                    קבצים: <?php echo count($project['files']); ?>
                                </span>
                                <?php 
                                $mediaInfo = getProjectMediaInfo($project);
                                if ($mediaInfo['total_files'] > 0):
                                ?>
                                    <span class="independent-project-stat">
                                        🎵 <?php echo $mediaInfo['total_files']; ?> מדיה
                                    </span>
                                    <span class="independent-project-stat">
                                        ⏱️ <?php echo $mediaInfo['duration_formatted']; ?>
                                    </span>
                                <?php endif; ?>
                            </div>

                            <div class="independent-project-actions">
                                <a href="functions/php/file_manager.php?project_id=<?php echo $project['id']; ?>" class="btn-independent">
                                    נהל קבצים
                                </a>
                                <form method="POST" style="display: inline;" onsubmit="return confirm('האם אתה בטוח שברצונך למחוק את הפרויקט \'<?php echo htmlspecialchars($project['title']); ?>\'?');">
                                    <input type="hidden" name="action" value="delete_independent_project">
                                    <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                                    <button type="submit" class="btn-independent btn-danger">מחק</button>
                                </form>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="functions/js/transcription-app.js"></script>    
    <script>
        // הסרת הודעות אוטומטית
        document.addEventListener('DOMContentLoaded', function() {
            const message = document.querySelector('.independent-project-message');
            if (message) {
                setTimeout(() => {
                    message.style.transition = 'all 0.3s ease';
                    message.style.opacity = '0';
                    message.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        message.remove();
                    }, 300);
                }, 5000);
            }
        });
    </script>
</body>

</html>