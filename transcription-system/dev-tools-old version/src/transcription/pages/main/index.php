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

// Check if we're in developer mode BEFORE starting session
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Use different session namespace for developer mode
if ($showDevNav) {
    session_name('TRANSCRIPTION_DEV_SESSION');
} else {
    session_name('TRANSCRIPTION_SESSION');
}
session_start();

// Include developer navigation AFTER session start
require_once __DIR__ . '/../../../developer-tools/includes/dev-nav.php';

// In dev mode, set up session if not already set
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Developer';
    $_SESSION['permissions'] = 'ABCDEF';
    $_SESSION['transcriber_code'] = 'DEV001';
    $_SESSION['logged_in'] = true;
    $_SESSION['can_transcribe'] = true;
    $_SESSION['full_name'] = 'Developer Mode';
}

// Debug: Show current user ID (commented out to avoid header issues)
// echo "<!-- Main Page Debug: Current session user_id = " . ($_SESSION['user_id'] ?? 'NOT SET') . " -->";

// Database connection for Docker environment
$host = 'database'; // Docker service name
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // UTF-8 encoding settings
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Create necessary tables if they don't exist
try {
    // Create users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        permissions VARCHAR(50),
        transcriber_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create companies table
    $pdo->exec("CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create transcribers table
    $pdo->exec("CREATE TABLE IF NOT EXISTS transcribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        transcriber_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create clients table
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create projects table
    $pdo->exec("CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        folder_path VARCHAR(500),
        company_id INT,
        client_id INT,
        workflow_status VARCHAR(50) DEFAULT 'new',
        status VARCHAR(50) DEFAULT 'active',
        assigned_transcriber_id INT,
        assigned_proofreader_id INT,
        transcription_pages INT DEFAULT 0,
        total_pages INT DEFAULT 0,
        invoice_amount DECIMAL(10,2) DEFAULT 0.00,
        transcription_text TEXT,
        speakers_list TEXT,
        notes TEXT,
        transcription_backup TEXT,
        transcription_backup_date DATETIME,
        transcription_completed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_transcriber_id) REFERENCES transcribers(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_proofreader_id) REFERENCES transcribers(id) ON DELETE SET NULL,
        FOREIGN KEY (transcription_completed_by) REFERENCES transcribers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create transcriber_companies table
    $pdo->exec("CREATE TABLE IF NOT EXISTS transcriber_companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transcriber_id INT,
        company_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transcriber_id) REFERENCES transcribers(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_transcriber_company (transcriber_id, company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    
    // Create a default admin user if no users exist
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount == 0) {
        $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, permissions, full_name, transcriber_code) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin', $defaultPassword, 'ABCDEF', 'Administrator', 'ADMIN001']);
    }
    
} catch (Exception $e) {
    // Log error but continue
    error_log("Error creating tables: " . $e->getMessage());
}


// Password reset feature
if (isset($_GET['reset']) && $_GET['reset'] === 'passwords') {
    echo "<h2>Password Reset</h2><pre>";
    try {
        // Reset admin password
        $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
        $stmt->execute([$adminPassword]);
        echo "✅ Admin password reset to: admin123\n";
        
        // Reset specific user if requested
        if (isset($_GET['user'])) {
            $userToReset = $_GET['user'];
            $newPassword = isset($_GET['pass']) ? $_GET['pass'] : '123456';
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
            $stmt->execute([$hashedPassword, $userToReset]);
            echo "✅ User '$userToReset' password reset to: $newPassword\n";
        }
        
        // Show all users
        $stmt = $pdo->query("SELECT username, permissions FROM users ORDER BY id");
        echo "\nUsers in system:\n";
        echo "================\n";
        while ($row = $stmt->fetch()) {
            $perms = [];
            if (strpos($row['permissions'], 'D') !== false) $perms[] = 'Transcription';
            if (strpos($row['permissions'], 'E') !== false) $perms[] = 'Proofreading';
            if (strpos($row['permissions'], 'F') !== false) $perms[] = 'Export';
            echo "- {$row['username']} (permissions: {$row['permissions']}) - " . implode(', ', $perms) . "\n";
        }
        echo "\n\nTo reset a specific user password:\n";
        echo "Add ?reset=passwords&user=USERNAME&pass=NEWPASSWORD\n";
        echo "Example: ?reset=passwords&user=user1752778176&pass=123456\n";
        echo "</pre>";
        echo "<p><a href='index.php'>Go to login</a></p>";
        exit;
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "</pre>";
        exit;
    }
}

// Check if we're in development mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';

// Login check - bypass if in development mode
if ((!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in'])) && !$isDevelopmentMode) {
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['login'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];

        $stmt = $pdo->prepare("SELECT id, password, plain_password, permissions, transcriber_code, full_name FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // Check password (plain first, then hashed)
        $passwordValid = false;
        if (!empty($user['plain_password'])) {
            $passwordValid = ($password === $user['plain_password']);
        }
        if (!$passwordValid && !empty($user['password'])) {
            $passwordValid = password_verify($password, $user['password']);
        }

        if ($user && $passwordValid) {
            // Check if user has transcription permissions (D, E, or F)
            $hasD = strpos($user['permissions'], 'D') !== false;
            $hasE = strpos($user['permissions'], 'E') !== false;
            $hasF = strpos($user['permissions'], 'F') !== false;
            
            if (!$hasD && !$hasE && !$hasF) {
                $loginError = "אין לך הרשאות לאפליקציית תמלול";
            } else {
                $_SESSION['logged_in'] = true;
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $username;
                $_SESSION['full_name'] = $user['full_name'] ?? $username;
                $_SESSION['permissions'] = $user['permissions'];
                $_SESSION['transcriber_code'] = $user['transcriber_code'];
                $_SESSION['can_transcribe'] = $hasD;
                $_SESSION['can_proofread'] = $hasE;
                $_SESSION['can_export'] = $hasF;
                $_SESSION['can_view_reports'] = true;
                header("Location: " . $_SERVER['PHP_SELF']);
                exit;
            }
        } else {
            $loginError = "שם משתמש או סיסמה שגויים";
            
            // Debug mode
            if (isset($_GET['debug'])) {
                $loginError .= "<br><small>Debug: User " . ($user ? "found" : "not found") . " in database</small>";
                if ($user) {
                    $loginError .= "<br><small>Permissions: {$user['permissions']}</small>";
                }
            }
        }
    }
?>
    <!DOCTYPE html>
    <html dir="rtl" lang="he">

    <head>
        <meta charset="UTF-8">
        <title>התחברות לאפליקציית תמלול</title>
        <link rel="stylesheet" href="styles/css/transcription-styles.css">
        <link rel="stylesheet" href="styles/css/inline-styles.css">
    </head>

    <body class="login-body">
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
                <button type="submit" name="login" class="login-submit-btn">התחבר</button>
            </form>
            
            <?php
            // Quick password reset for user1752778176
            if (isset($_GET['fix'])) {
                try {
                    $newPass = password_hash('123456', PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = 'user1752778176'");
                    $stmt->execute([$newPass]);
                    echo "<div class='reset-success'>";
                    echo "✅ Password for user1752778176 reset to: 123456";
                    echo "</div>";
                } catch (Exception $e) {
                    echo "<div class='reset-error'>";
                    echo "Error: " . $e->getMessage();
                    echo "</div>";
                }
            }
            ?>

            <div class="login-footer">
                <p>מערכת תמלול מתקדמת</p>
            </div>
        </div>
    </body>

    </html>
<?php
    exit;
}

// If in development mode and no session, create a dev session
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Developer';
    $_SESSION['permissions'] = 'ABCDEF';
    $_SESSION['transcriber_code'] = 'DEV001';
}

// Logout
if (isset($_GET['logout'])) {
    session_destroy();
    $redirect = $_SERVER['PHP_SELF'];
    if ($showDevNav) {
        $redirect .= '?devnav=1';
    }
    header("Location: " . $redirect);
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

// Include independent projects functions and handler
require_once __DIR__ . '/components/independent-projects/functions.php';
require_once __DIR__ . '/components/independent-projects/handler.php';

// Handle workflow update form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['action']) && $_POST['action'] == 'update_workflow') {
        if ($hasB) {
            $projectId = $_POST['project_id'];
            $newWorkflowStatus = $_POST['workflow_status'];

            $stmt = $pdo->prepare("UPDATE projects SET workflow_status = ? WHERE id = ?");
            $stmt->execute([$newWorkflowStatus, $projectId]);
            $message = "שלב העבודה עודכן בהצלחה";
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
            SELECT p.*, c.name as company_name, cl.name as client_name, cl.company as client_company,
                   ut.full_name as transcriber_name, up.full_name as proofreader_name
            FROM projects p 
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN clients cl ON p.client_id = cl.id
            LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
            LEFT JOIN users ut ON t.user_id = ut.id
            LEFT JOIN transcribers pr ON p.assigned_proofreader_id = pr.id
            LEFT JOIN users up ON pr.user_id = up.id
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
    <link rel="stylesheet" href="styles/css/inline-styles.css">
    <link rel="stylesheet" href="assets/css/stats.css">
    <link rel="stylesheet" href="assets/css/projects.css">
    <link rel="stylesheet" href="assets/css/dashboard.css">
    <link rel="stylesheet" href="assets/css/independent-projects.css">
    </head>

<body>
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <h1>אפליקציית תמלול</h1>
            </div>
            <div class="user-info">
                <div class="user-profile">
                    <span>שלום, <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
                    <?php if ($transcriber): ?>
                        <span class="user-code">קוד: <?php echo htmlspecialchars($transcriber['transcriber_code']); ?></span>
                    <?php endif; ?>
                </div>
                <a href="?logout=1<?php echo (isset($_GET['devnav']) && $_GET['devnav'] === '1') ? '&devnav=1' : ''; ?>" class="logout-btn">התנתק</a>
            </div>
        </div>
    </div>

    <div class="nav">
        <div class="nav-content">
            <div class="nav-links">
                <?php 
                // Preserve dev parameters in navigation
                $navParams = '';
                if ($isDevelopmentMode) $navParams .= '?dev=1';
                if (isset($_GET['devnav']) && $_GET['devnav'] === '1') {
                    $navParams .= ($navParams ? '&' : '?') . 'devnav=1';
                }
                ?>
                <a href="index.php<?php echo $navParams; ?>" class="active">דף הבית</a>
                <?php if ($hasD): ?>
                    <a href="../transcription/<?php echo $navParams; ?>">תמלול</a>
                <?php endif; ?>
                <?php if ($hasE): ?>
                    <a href="../proofreading/<?php echo $navParams; ?>">הגהה</a>
                <?php endif; ?>
                <?php if ($hasF): ?>
                    <a href="../export/<?php echo $navParams; ?>">ייצוא</a>
                <?php endif; ?>
                <a href="../records/<?php echo $navParams; ?>">רישומים</a>
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
                <div class="section-header" onclick="window.location.href='<?php echo $hasD ? '../transcription/' . $navParams : '#'; ?>'">
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
                                                    <a href="../transcription/<?php echo $navParams; ?><?php echo ($navParams ? '&' : '?'); ?>project=<?php echo $project['id']; ?>" class="btn btn-primary">
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

        <!-- Project Management Component -->
        
        <!-- Independent Projects Section -->
        <?php require_once __DIR__ . '/components/independent-projects/independent-projects.php'; ?>
    </div>

</body>
</html>