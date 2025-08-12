<?php
session_name('CRM_SESSION');
session_start();

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

if (!$hasC) {
    header("Location: ../index.php");
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    // Create company if doesn't exist
    $companyName = $_SESSION['username'] . ' Company';
    $createCompanyStmt = $pdo->prepare("INSERT INTO companies (name, user_id, permissions) VALUES (?, ?, ?)");
    $createCompanyStmt->execute([$companyName, $_SESSION['user_id'], $_SESSION['permissions']]);
    $companyId = $pdo->lastInsertId();
    $company = ['id' => $companyId];
}

// Get connected transcribers with real data
$transcribersStmt = $pdo->prepare("
    SELECT t.*, tc.connected_at, u.permissions, u.last_login
    FROM transcribers t 
    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
    LEFT JOIN users u ON t.user_id = u.id
    WHERE tc.company_id = ? 
    ORDER BY tc.connected_at DESC
");
$transcribersStmt->execute([$company['id']]);
$connectedTranscribers = $transcribersStmt->fetchAll();

// Get statistics for each transcriber
$transcribersWithStats = [];

foreach ($connectedTranscribers as $transcriber) {
    // Get project statistics for this transcriber
    $transProjectsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_projects,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
            SUM(CASE WHEN workflow_status = 'ready_for_transcription' AND assigned_transcriber_id = ? THEN 1 ELSE 0 END) as pending_transcription,
            SUM(CASE WHEN workflow_status = 'ready_for_proofreading' AND assigned_proofreader_id = ? THEN 1 ELSE 0 END) as pending_proofreading,
            SUM(CASE WHEN workflow_status = 'ready_for_export' AND assigned_exporter_id = ? THEN 1 ELSE 0 END) as pending_export,
            AVG(CASE WHEN total_pages > 0 THEN total_pages ELSE NULL END) as avg_pages,
            SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as weekly_projects
        FROM projects 
        WHERE company_id = ? AND (
            assigned_transcriber_id = ? OR 
            assigned_proofreader_id = ? OR 
            assigned_exporter_id = ?
        )
    ");
    $transProjectsStmt->execute([
        $transcriber['id'], $transcriber['id'], $transcriber['id'], 
        $company['id'], $transcriber['id'], $transcriber['id'], $transcriber['id']
    ]);
    $stats = $transProjectsStmt->fetch();
    
    // Determine transcriber role based on permissions
    $roles = [];
    $permissions = $transcriber['permissions'] ?? '';
    if (strpos($permissions, 'D') !== false) $roles[] = 'מתמלל';
    if (strpos($permissions, 'E') !== false) $roles[] = 'מגיה';
    if (strpos($permissions, 'F') !== false) $roles[] = 'מייצא';
    if (empty($roles)) $roles[] = 'עובד כללי';
    
    // Determine online status
    $lastLogin = $transcriber['last_login'];
    $isOnline = false;
    $status = 'offline';
    
    if ($lastLogin) {
        $loginTime = strtotime($lastLogin);
        $now = time();
        $timeDiff = $now - $loginTime;
        
        if ($timeDiff < 300) { // 5 minutes
            $isOnline = true;
            $status = 'online';
        } elseif ($timeDiff < 3600) { // 1 hour
            $status = 'busy';
        }
    }
    
    // Calculate performance rating
    $totalProjects = $stats['total_projects'] ?: 1;
    $completedProjects = $stats['completed_projects'] ?: 0;
    $completionRate = ($completedProjects / $totalProjects) * 100;
    
    $rating = 3.0; // Base rating
    if ($completionRate >= 90) $rating = 5.0;
    elseif ($completionRate >= 80) $rating = 4.5;
    elseif ($completionRate >= 70) $rating = 4.0;
    elseif ($completionRate >= 60) $rating = 3.5;
    
    // Adjust rating based on weekly activity
    $weeklyProjects = $stats['weekly_projects'] ?: 0;
    if ($weeklyProjects >= 5) $rating += 0.3;
    elseif ($weeklyProjects >= 3) $rating += 0.1;
    elseif ($weeklyProjects == 0 && $totalProjects > 0) $rating -= 0.2;
    
    $rating = min(5.0, max(1.0, $rating)); // Clamp between 1-5
    
    // Check if has app integration
    $hasApp = !empty($transcriber['transcriber_code']) && 
               !empty($transcriber['user_id']) && 
               !empty($permissions);
    
    $transcribersWithStats[] = [
        'transcriber' => $transcriber,
        'stats' => $stats,
        'roles' => $roles,
        'status' => $status,
        'isOnline' => $isOnline,
        'rating' => round($rating, 1),
        'hasApp' => $hasApp,
        'weeklyProjects' => $weeklyProjects,
        'pendingWork' => ($stats['pending_transcription'] ?: 0) + 
                        ($stats['pending_proofreading'] ?: 0) + 
                        ($stats['pending_export'] ?: 0)
    ];
}

// Sort by online status first, then by rating
usort($transcribersWithStats, function($a, $b) {
    if ($a['isOnline'] != $b['isOnline']) {
        return $b['isOnline'] - $a['isOnline'];
    }
    return $b['rating'] <=> $a['rating'];
});

// Get overall statistics
$totalTranscribers = count($transcribersWithStats);
$onlineTranscribers = count(array_filter($transcribersWithStats, function($t) { return $t['isOnline']; }));
$withApp = count(array_filter($transcribersWithStats, function($t) { return $t['hasApp']; }));
$totalWeeklyWorks = array_sum(array_column($transcribersWithStats, 'weeklyProjects'));

// Create one non-connected example worker if we have connected transcribers
$showExampleWorker = ($totalTranscribers > 0);
?>

<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ניהול צוות - מערכת CRM</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
        }

        .header .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .nav-bar {
            background: linear-gradient(135deg, #e7e8d1 0%, #d4d5c0 100%);
            padding: 0;
            display: flex;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .nav-item {
            padding: 15px 30px;
            color: #5a4a3a;
            text-decoration: none;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            font-weight: 500;
        }

        .nav-item:hover {
            background: rgba(184, 80, 66, 0.1);
            border-bottom-color: #b85042;
            color: #b85042;
        }

        .nav-item.active {
            background: rgba(184, 80, 66, 0.1);
            border-bottom-color: #b85042;
            color: #b85042;
        }

        .main-content {
            padding: 30px;
            background: linear-gradient(135deg, #f8faf9 0%, #f4f7f5 100%);
            min-height: 600px;
        }

        /* סטטיסטיקות מהירות */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: transform 0.3s ease;
            border-left: 4px solid #a7beae;
        }

        .stat-card:hover {
            transform: translateY(-3px);
        }

        .stat-card h3 {
            color: #6b7f73;
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #a7beae;
        }

        /* פילטרים */
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .filter-label {
            font-size: 14px;
            font-weight: 600;
            color: #6b7f73;
        }

        .filter-select {
            padding: 10px 15px;
            border: 2px solid rgba(167, 190, 174, 0.2);
            border-radius: 8px;
            font-size: 14px;
            background: white;
            color: #6b7f73;
            transition: border-color 0.3s ease;
        }

        .filter-select:focus {
            outline: none;
            border-color: #a7beae;
        }

        /* רשימת עובדים */
        .workers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .worker-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border-top: 4px solid;
            position: relative;
        }

        .worker-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        /* צבעים לפי תפקיד */
        .worker-card.transcriber {
            border-top-color: #a7beae;
        }

        .worker-card.proofreader {
            border-top-color: #8b6f47;
        }

        .worker-card.exporter {
            border-top-color: #6b7c93;
        }

        .worker-card.general {
            border-top-color: #9e9e9e;
        }

        .worker-card.example {
            border-top-color: #ffc107;
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
        }

        .worker-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        .worker-name {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .worker-type {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .worker-type.transcriber {
            background: rgba(167, 190, 174, 0.2);
            color: #6b7f73;
        }

        .worker-type.proofreader {
            background: rgba(139, 111, 71, 0.2);
            color: #5a4831;
        }

        .worker-type.exporter {
            background: rgba(107, 124, 147, 0.2);
            color: #4a5562;
        }

        .worker-type.general {
            background: rgba(158, 158, 158, 0.2);
            color: #616161;
        }

        .worker-type.example {
            background: rgba(255, 193, 7, 0.3);
            color: #856404;
        }

        .worker-status {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .status-dot.online {
            background: #27ae60;
        }

        .status-dot.offline {
            background: #95a5a6;
        }

        .status-dot.busy {
            background: #f39c12;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .worker-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }

        .detail-item {
            font-size: 14px;
            color: #6c757d;
        }

        .detail-value {
            font-weight: 600;
            color: #2c3e50;
        }

        .app-integration {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
        }

        .app-integration.connected {
            background: rgba(39, 174, 96, 0.1);
            color: #27ae60;
            border: 1px solid rgba(39, 174, 96, 0.2);
        }

        .app-integration.not-connected {
            background: rgba(149, 165, 166, 0.1);
            color: #95a5a6;
            border: 1px solid rgba(149, 165, 166, 0.2);
        }

        .worker-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 20px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }

        .btn-primary {
            background: linear-gradient(135deg, #a7beae, #95a69b);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(167, 190, 174, 0.3);
        }

        .btn-secondary {
            background: #ecf0f1;
            color: #6c757d;
        }

        .btn-secondary:hover {
            background: #d5dbdb;
        }

        .btn-info {
            background: #17a2b8;
            color: white;
        }

        .btn-info:hover {
            background: #138496;
        }

        .example-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ffc107;
            color: #856404;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
        }

        .no-workers {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }

        .no-workers h3 {
            margin-bottom: 15px;
            color: #495057;
        }

        .back-button {
            background: linear-gradient(135deg, #6c757d, #5a6268);
            color: white;
            padding: 12px 25px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 25px;
            transition: all 0.3s ease;
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(108, 117, 125, 0.3);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .workers-grid {
                grid-template-columns: 1fr;
            }
            
            .main-content {
                padding: 20px;
            }
            
            .filters {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏢 מערכת CRM למתמלל - ניהול צוות</h1>
            <div class="user-info">
                <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
                <div class="user-avatar"><?php echo strtoupper(substr($_SESSION['username'], 0, 1)); ?></div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="nav-bar">
            <a href="../index.php" class="nav-item">דף הבית</a>
            <?php if ($hasA): ?>
                <a href="../clients/index.php" class="nav-item">ניהול לקוחות</a>
            <?php endif; ?>
            <?php if ($hasB): ?>
                <a href="../projects/index.php" class="nav-item">ניהול עבודות</a>
            <?php endif; ?>
            <a href="index.php" class="nav-item active">ניהול מתמללים</a>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <a href="index.php" class="back-button">← חזרה לניהול מתמללים</a>

            <!-- סטטיסטיקות מהירות -->
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>סה"כ מתמללים</h3>
                    <div class="stat-number"><?php echo $totalTranscribers; ?></div>
                </div>
                <div class="stat-card">
                    <h3>מחוברים כעת</h3>
                    <div class="stat-number"><?php echo $onlineTranscribers; ?></div>
                </div>
                <div class="stat-card">
                    <h3>עבודות השבוע</h3>
                    <div class="stat-number"><?php echo $totalWeeklyWorks; ?></div>
                </div>
                <div class="stat-card">
                    <h3>עם אפליקציה</h3>
                    <div class="stat-number"><?php echo $withApp; ?></div>
                </div>
            </div>

            <!-- פילטרים -->
            <div class="filters">
                <div class="filter-group">
                    <label class="filter-label">סוג עובד</label>
                    <select class="filter-select" id="typeFilter">
                        <option value="">הכל</option>
                        <option value="transcriber">מתמללים</option>
                        <option value="proofreader">מגיהים</option>
                        <option value="exporter">מייצאים</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">סטטוס</label>
                    <select class="filter-select" id="statusFilter">
                        <option value="">הכל</option>
                        <option value="online">מחובר</option>
                        <option value="offline">לא מחובר</option>
                        <option value="busy">עסוק</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">אפליקציה</label>
                    <select class="filter-select" id="appFilter">
                        <option value="">הכל</option>
                        <option value="connected">עם אפליקציה</option>
                        <option value="not-connected">בלי אפליקציה</option>
                    </select>
                </div>
            </div>

            <!-- רשימת עובדים -->
            <div class="workers-grid">
                <?php if (empty($transcribersWithStats)): ?>
                    <div class="no-workers">
                        <h3>אין מתמללים מחוברים עדיין</h3>
                        <p>חבר מתמללים חדשים דרך הטאב "חיבור מתמללים" כדי לראות את הנתונים שלהם כאן</p>
                        <a href="index.php" class="btn btn-primary" style="margin-top: 15px;">חבר מתמלל ראשון</a>
                    </div>
                <?php else: ?>
                    
                    <?php foreach ($transcribersWithStats as $worker): ?>
                        <?php 
                        $t = $worker['transcriber'];
                        $stats = $worker['stats'];
                        $mainRole = $worker['roles'][0];
                        $roleClass = '';
                        if (strpos($mainRole, 'מתמלל') !== false) $roleClass = 'transcriber';
                        elseif (strpos($mainRole, 'מגיה') !== false) $roleClass = 'proofreader';
                        elseif (strpos($mainRole, 'מייצא') !== false) $roleClass = 'exporter';
                        else $roleClass = 'general';
                        ?>
                        <div class="worker-card <?php echo $roleClass; ?>" data-type="<?php echo $roleClass; ?>" data-status="<?php echo $worker['status']; ?>" data-app="<?php echo $worker['hasApp'] ? 'connected' : 'not-connected'; ?>">
                            <div class="worker-header">
                                <div>
                                    <div class="worker-name"><?php echo htmlspecialchars($t['name']); ?></div>
                                    <div class="worker-type <?php echo $roleClass; ?>"><?php echo implode(', ', $worker['roles']); ?></div>
                                </div>
                                <div class="worker-status">
                                    <div class="status-dot <?php echo $worker['status']; ?>"></div>
                                    <span><?php 
                                        $statusText = [
                                            'online' => 'מחובר',
                                            'busy' => 'עסוק',
                                            'offline' => 'לא מחובר'
                                        ];
                                        echo $statusText[$worker['status']];
                                    ?></span>
                                </div>
                            </div>
                            <div class="worker-details">
                                <div class="detail-item">
                                    <div>עבודות השבוע</div>
                                    <div class="detail-value"><?php echo $worker['weeklyProjects']; ?></div>
                                </div>
                                <div class="detail-item">
                                    <div>דירוג ביצועים</div>
                                    <div class="detail-value"><?php echo $worker['rating']; ?>/5</div>
                                </div>
                                <div class="detail-item">
                                    <div>אימייל</div>
                                    <div class="detail-value"><?php echo htmlspecialchars($t['email']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <div>סה"כ עבודות</div>
                                    <div class="detail-value"><?php echo $stats['total_projects'] ?: 0; ?></div>
                                </div>
                                <div class="detail-item">
                                    <div>עבודות ממתינות</div>
                                    <div class="detail-value"><?php echo $worker['pendingWork']; ?></div>
                                </div>
                                <div class="detail-item">
                                    <div>הושלמו</div>
                                    <div class="detail-value"><?php echo $stats['completed_projects'] ?: 0; ?></div>
                                </div>
                            </div>
                            <div class="app-integration <?php echo $worker['hasApp'] ? 'connected' : 'not-connected'; ?>">
                                <?php if ($worker['hasApp']): ?>
                                    ✅ מחובר לאפליקציה | קוד: <?php echo htmlspecialchars($t['transcriber_code']); ?>
                                <?php else: ?>
                                    ❌ עובד בלי אפליקציה | שליחה במייל
                                <?php endif; ?>
                            </div>
                            <div class="worker-actions">
                                <?php if ($worker['hasApp']): ?>
                                    <button class="btn btn-primary">שלח עבודה</button>
                                <?php else: ?>
                                    <button class="btn btn-secondary">שלח במייל</button>
                                <?php endif; ?>
                                <a href="worker_details.php?id=<?php echo $t['id']; ?>" class="btn btn-info">פרטים</a>
                                <button class="btn btn-secondary">עריכה</button>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if ($showExampleWorker): ?>
                        <!-- עובד לדוגמא (לא מחובר לאפליקציה) -->
                        <div class="worker-card example" data-type="transcriber" data-status="offline" data-app="not-connected">
                            <div class="example-badge">דוגמא</div>
                            <div class="worker-header">
                                <div>
                                    <div class="worker-name">מיכל אברהם</div>
                                    <div class="worker-type example">מתמללת (לא מחוברת)</div>
                                </div>
                                <div class="worker-status">
                                    <div class="status-dot offline"></div>
                                    <span>לא מחוברת</span>
                                </div>
                            </div>
                            <div class="worker-details">
                                <div class="detail-item">
                                    <div>עבודות השבוע</div>
                                    <div class="detail-value">6</div>
                                </div>
                                <div class="detail-item">
                                    <div>דירוג ביצועים</div>
                                    <div class="detail-value">4.2/5</div>
                                </div>
                                <div class="detail-item">
                                    <div>אימייל</div>
                                    <div class="detail-value">michal@example.com</div>
                                </div>
                                <div class="detail-item">
                                    <div>טלפון</div>
                                    <div class="detail-value">053-111-2222</div>
                                </div>
                                <div class="detail-item">
                                    <div>עבודות ממתינות</div>
                                    <div class="detail-value">2</div>
                                </div>
                                <div class="detail-item">
                                    <div>הושלמו החודש</div>
                                    <div class="detail-value">18</div>
                                </div>
                            </div>
                            <div class="app-integration not-connected">
                                ❌ עובדת בלי אפליקציה | שליחה במייל
                            </div>
                            <div class="worker-actions">
                                <button class="btn btn-secondary">שלח במייל</button>
                                <button class="btn btn-info">פרטים</button>
                                <button class="btn btn-secondary">עריכה</button>
                            </div>
                        </div>
                    <?php endif; ?>
                    
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Filter functionality
            const typeFilter = document.getElementById('typeFilter');
            const statusFilter = document.getElementById('statusFilter');
            const appFilter = document.getElementById('appFilter');
            const workerCards = document.querySelectorAll('.worker-card');

            function filterWorkers() {
                const typeValue = typeFilter.value;
                const statusValue = statusFilter.value;
                const appValue = appFilter.value;

                workerCards.forEach(card => {
                    const cardType = card.getAttribute('data-type');
                    const cardStatus = card.getAttribute('data-status');
                    const cardApp = card.getAttribute('data-app');

                    let show = true;

                    if (typeValue && cardType !== typeValue) {
                        show = false;
                    }
                    if (statusValue && cardStatus !== statusValue) {
                        show = false;
                    }
                    if (appValue && cardApp !== appValue) {
                        show = false;
                    }

                    if (show) {
                        card.style.display = 'block';
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }

            typeFilter.addEventListener('change', filterWorkers);
            statusFilter.addEventListener('change', filterWorkers);
            appFilter.addEventListener('change', filterWorkers);

            // Worker card actions
            document.querySelectorAll('.btn').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    const action = this.textContent.trim();
                    console.log('Action clicked:', action);
                    
                    if (action === 'שלח עבודה' || action === 'שלח במייל') {
                        alert('שליחת עבודה - תכונה בפיתוח');
                    } else if (action === 'פרטים') {
                        // Check if this is a real worker or example
                        const card = this.closest('.worker-card');
                        if (card.classList.contains('example')) {
                            alert('זהו עובד לדוגמא - פרטים לא זמינים');
                        } else {
                            alert('פרטי עובד - תכונה בפיתוח');
                        }
                    } else if (action === 'עריכה') {
                        alert('עריכת עובד - תכונה בפיתוח');
                    }
                });
            });

            // הוספת אפקט hover לכרטיסי עובדים
            document.querySelectorAll('.worker-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });

            // אנימציה לכרטיסי סטטיסטיקה
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.5s ease';
                    
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 100);
                }, index * 100);
            });

            // אנימציה לכרטיסי עובדים
            const workerCardsAnimation = document.querySelectorAll('.worker-card');
            workerCardsAnimation.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(30px)';
                    card.style.transition = 'all 0.6s ease';
                    
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 150);
                }, index * 100);
            });

            // Enhanced filter animation
            function animateFilteredCards() {
                const visibleCards = Array.from(workerCards).filter(card => 
                    card.style.display !== 'none'
                );
                
                visibleCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.transform = 'scale(0.8)';
                        card.style.opacity = '0.5';
                        
                        setTimeout(() => {
                            card.style.transform = 'scale(1)';
                            card.style.opacity = '1';
                        }, 50);
                    }, index * 50);
                });
            }

            // Add animation to filters
            [typeFilter, statusFilter, appFilter].forEach(filter => {
                filter.addEventListener('change', () => {
                    setTimeout(animateFilteredCards, 300);
                });
            });

            // Real-time status updates simulation (for demo purposes)
            function simulateStatusUpdates() {
                const onlineCards = document.querySelectorAll('.worker-card[data-status="online"]');
                
                onlineCards.forEach(card => {
                    const statusDot = card.querySelector('.status-dot');
                    if (statusDot) {
                        // Add subtle pulsing effect for online users
                        statusDot.style.animation = 'pulse 2s infinite';
                    }
                });
            }

            simulateStatusUpdates();
            
            // Update stats periodically (simulation)
            setInterval(() => {
                // This would normally fetch real data from the server
                console.log('Updating real-time stats...');
            }, 30000); // Every 30 seconds
        });
    </script>
</body>
</html>