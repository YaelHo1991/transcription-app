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

// Get transcriber ID
$transcriberId = isset($_GET['id']) ? (int)$_GET['id'] : null;

if (!$transcriberId) {
    header("Location: team.php");
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    die("Company not found");
}

// Get transcriber details
$transStmt = $pdo->prepare("
    SELECT t.*, tc.connected_at, u.permissions, u.last_login, u.created_at as user_created
    FROM transcribers t 
    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id = ? AND tc.company_id = ?
");
$transStmt->execute([$transcriberId, $company['id']]);
$transcriber = $transStmt->fetch();

if (!$transcriber) {
    die("Transcriber not found");
}

// Get current month filter
$selectedMonth = isset($_GET['month']) ? $_GET['month'] : date('Y-m');

// Get detailed work statistics for the selected month
$monthlyStatsStmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_works,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_works,
        SUM(CASE 
            WHEN assigned_transcriber_id = ? AND workflow_status = 'ready_for_transcription' THEN 1 
            WHEN assigned_proofreader_id = ? AND workflow_status = 'ready_for_proofreading' THEN 1 
            WHEN assigned_exporter_id = ? AND workflow_status = 'ready_for_export' THEN 1 
            ELSE 0 
        END) as pending_works,
        AVG(CASE WHEN total_pages > 0 THEN total_pages ELSE NULL END) as avg_pages,
        SUM(CASE WHEN invoice_amount > 0 THEN invoice_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN total_pages > 0 THEN total_pages ELSE 0 END) as total_pages_month
    FROM projects 
    WHERE company_id = ? 
    AND (assigned_transcriber_id = ? OR assigned_proofreader_id = ? OR assigned_exporter_id = ?)
    AND DATE_FORMAT(created_at, '%Y-%m') = ?
");
$monthlyStatsStmt->execute([
    $transcriberId, $transcriberId, $transcriberId, 
    $company['id'], $transcriberId, $transcriberId, $transcriberId,
    $selectedMonth
]);
$monthlyStats = $monthlyStatsStmt->fetch();

// Get detailed work list for the selected month
$worksStmt = $pdo->prepare("
    SELECT p.*, c.name as client_name,
           CASE 
               WHEN p.assigned_transcriber_id = ? THEN 'תמלול'
               WHEN p.assigned_proofreader_id = ? THEN 'הגהה'
               WHEN p.assigned_exporter_id = ? THEN 'ייצוא'
               ELSE 'לא ידוע'
           END as work_type,
           CASE 
               WHEN p.created_at <= p.deadline AND p.status = 'completed' THEN 'בזמן'
               WHEN p.created_at > p.deadline THEN 'מאוחר'
               WHEN p.status = 'completed' THEN 'מוקדם'
               ELSE 'בעבודה'
           END as delivery_status
    FROM projects p 
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.company_id = ? 
    AND (p.assigned_transcriber_id = ? OR p.assigned_proofreader_id = ? OR p.assigned_exporter_id = ?)
    AND DATE_FORMAT(p.created_at, '%Y-%m') = ?
    ORDER BY p.created_at DESC
");
$worksStmt->execute([
    $transcriberId, $transcriberId, $transcriberId,
    $company['id'], $transcriberId, $transcriberId, $transcriberId,
    $selectedMonth
]);
$monthlyWorks = $worksStmt->fetchAll();

// Get overall statistics (since joining)
$overallStatsStmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
        AVG(CASE WHEN total_pages > 0 THEN total_pages ELSE NULL END) as avg_pages_overall,
        SUM(CASE WHEN invoice_amount > 0 THEN invoice_amount ELSE 0 END) as total_revenue_overall
    FROM projects 
    WHERE company_id = ? 
    AND (assigned_transcriber_id = ? OR assigned_proofreader_id = ? OR assigned_exporter_id = ?)
");
$overallStatsStmt->execute([
    $company['id'], $transcriberId, $transcriberId, $transcriberId
]);
$overallStats = $overallStatsStmt->fetch();

// Calculate months since joining
$joinDate = new DateTime($transcriber['connected_at']);
$now = new DateTime();
$monthsSinceJoining = $joinDate->diff($now)->m + ($joinDate->diff($now)->y * 12);
if ($monthsSinceJoining == 0) $monthsSinceJoining = 1; // At least 1 month

$monthlyAverage = $overallStats['total_projects'] / $monthsSinceJoining;

// Calculate performance rating
$completionRate = $overallStats['total_projects'] > 0 ? 
    ($overallStats['completed_projects'] / $overallStats['total_projects']) * 100 : 0;

$rating = 3.0; // Base rating
if ($completionRate >= 90) $rating = 4.8;
elseif ($completionRate >= 80) $rating = 4.5;
elseif ($completionRate >= 70) $rating = 4.0;
elseif ($completionRate >= 60) $rating = 3.5;

// Adjust based on activity
if ($monthlyStats['total_works'] >= 20) $rating += 0.2;
elseif ($monthlyStats['total_works'] >= 10) $rating += 0.1;

$rating = min(5.0, max(1.0, $rating));

// Determine roles
$roles = [];
$permissions = $transcriber['permissions'] ?? '';
if (strpos($permissions, 'D') !== false) $roles[] = 'מתמלל';
if (strpos($permissions, 'E') !== false) $roles[] = 'מגיה';
if (strpos($permissions, 'F') !== false) $roles[] = 'מייצא';
if (empty($roles)) $roles[] = 'עובד כללי';

$mainRole = $roles[0];

// Calculate totals for bottom summary
$totalWorks = count($monthlyWorks);
$totalHours = 0;
$totalPayment = 0;
$onTimeWorks = 0;

foreach ($monthlyWorks as $work) {
    // Simulate work hours based on pages/complexity
    $workHours = rand(15, 50) / 10; // 1.5 to 5 hours per work
    $totalHours += $workHours;
    
    // Simulate payment based on work type and hours
    $hourlyRate = rand(30, 50); // 30-50 per hour
    $workPayment = $workHours * $hourlyRate;
    $totalPayment += $workPayment;
    
    if ($work['delivery_status'] == 'בזמן' || $work['delivery_status'] == 'מוקדם') {
        $onTimeWorks++;
    }
}

// Month names in Hebrew
$monthNames = [
    '01' => 'ינואר', '02' => 'פברואר', '03' => 'מרץ', '04' => 'אפריל',
    '05' => 'מאי', '06' => 'יוני', '07' => 'יולי', '08' => 'אוגוסט',
    '09' => 'ספטמבר', '10' => 'אוקטובר', '11' => 'נובמבר', '12' => 'דצמבר'
];

function getHebrewMonth($dateString) {
    global $monthNames;
    $parts = explode('-', $dateString);
    $year = $parts[0];
    $month = $parts[1];
    return $monthNames[$month] . ' ' . $year;
}
?>

<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>פרטי מתמלל - <?php echo htmlspecialchars($transcriber['name']); ?></title>
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
        }

        .back-button {
            background: linear-gradient(135deg, #a7beae, #95a69b);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 25px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(167, 190, 174, 0.3);
        }

        .worker-summary {
            background: linear-gradient(135deg, rgba(167, 190, 174, 0.1), rgba(167, 190, 174, 0.05));
            border: 1px solid rgba(167, 190, 174, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }

        .worker-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 25px;
        }

        .worker-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a7beae, #95a69b);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
        }

        .worker-info h2 {
            font-size: 28px;
            color: #6b7f73;
            margin-bottom: 8px;
        }

        .worker-role {
            background: rgba(167, 190, 174, 0.2);
            color: #6b7f73;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
            margin-bottom: 10px;
        }

        .worker-status {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #27ae60;
            font-weight: 500;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #27ae60;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 25px;
        }

        .summary-item {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease;
        }

        .summary-item:hover {
            transform: translateY(-5px);
        }

        .summary-label {
            font-size: 14px;
            color: #6b7f73;
            margin-bottom: 10px;
            font-weight: 500;
        }

        .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #a7beae;
        }

        .month-selector {
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .filter-label {
            font-size: 16px;
            font-weight: 600;
            color: #6b7f73;
        }

        .filter-select {
            padding: 12px 20px;
            border: 2px solid rgba(167, 190, 174, 0.2);
            border-radius: 10px;
            font-size: 14px;
            background: white;
            color: #6b7f73;
            transition: border-color 0.3s ease;
            min-width: 200px;
        }

        .filter-select:focus {
            outline: none;
            border-color: #a7beae;
        }

        .monthly-summary {
            background: white;
            border: 1px solid rgba(167, 190, 174, 0.2);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .monthly-summary h3 {
            color: #6b7f73;
            margin-bottom: 20px;
            font-size: 20px;
        }

        .monthly-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
        }

        .monthly-stat {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            background: rgba(167, 190, 174, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(167, 190, 174, 0.1);
            transition: all 0.3s ease;
        }

        .monthly-stat:hover {
            background: rgba(167, 190, 174, 0.1);
            transform: translateY(-2px);
        }

        .stat-icon {
            font-size: 28px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(167, 190, 174, 0.2);
        }

        .stat-content {
            flex: 1;
        }

        .stat-content .stat-number {
            font-size: 22px;
            font-weight: bold;
            color: #a7beae;
            margin-bottom: 5px;
        }

        .stat-content .stat-label {
            font-size: 14px;
            color: #6b7f73;
            font-weight: 500;
        }

        .works-table-container {
            background: white;
            border: 1px solid rgba(167, 190, 174, 0.2);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .works-table-container h3 {
            color: #6b7f73;
            margin-bottom: 20px;
            font-size: 20px;
        }

        .table-wrapper {
            overflow-x: auto;
            max-height: 500px;
            overflow-y: auto;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .detailed-works-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            background: white;
        }

        .detailed-works-table th {
            background: rgba(167, 190, 174, 0.1);
            padding: 15px 10px;
            text-align: right;
            font-weight: 600;
            color: #6b7f73;
            border-bottom: 2px solid rgba(167, 190, 174, 0.2);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .detailed-works-table td {
            padding: 12px 10px;
            border-bottom: 1px solid rgba(167, 190, 174, 0.1);
            color: #555;
        }

        .detailed-works-table tr:hover {
            background: rgba(167, 190, 174, 0.05);
        }

        .detailed-works-table tr:nth-child(even) {
            background: rgba(167, 190, 174, 0.02);
        }

        .work-id {
            font-weight: bold;
            color: #a7beae;
        }

        .status-indicator {
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            display: inline-block;
        }

        .status-indicator.late {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }

        .status-indicator.on-time {
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
        }

        .status-indicator.early {
            background: rgba(52, 152, 219, 0.2);
            color: #3498db;
        }

        .bottom-summary {
            background: linear-gradient(135deg, rgba(167, 190, 174, 0.1), rgba(167, 190, 174, 0.05));
            border: 1px solid rgba(167, 190, 174, 0.2);
            border-radius: 15px;
            padding: 25px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(167, 190, 174, 0.1);
        }

        .summary-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .summary-row .summary-label {
            font-weight: 600;
            color: #6b7f73;
            font-size: 16px;
        }

        .summary-row .summary-value {
            font-weight: bold;
            color: #a7beae;
            font-size: 18px;
        }

        @media (max-width: 768px) {
            .summary-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .monthly-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .worker-header {
                flex-direction: column;
                text-align: center;
            }
            
            .detailed-works-table {
                font-size: 12px;
            }
            
            .detailed-works-table th,
            .detailed-works-table td {
                padding: 8px 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏢 מערכת CRM למתמלל - פרטי מתמלל</h1>
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
            <!-- כפתור חזרה -->
            <a href="team.php" class="back-button">← חזרה לרשימת מתמללים</a>

            <!-- מידע כללי על המתמלל -->
            <div class="worker-summary">
                <div class="worker-header">
                    <div class="worker-avatar"><?php echo strtoupper(substr($transcriber['name'], 0, 1)); ?></div>
                    <div class="worker-info">
                        <h2><?php echo htmlspecialchars($transcriber['name']); ?></h2>
                        <div class="worker-role"><?php echo implode(', ', $roles); ?></div>
                        <div class="worker-status">
                            <div class="status-dot"></div>
                            <span>מחובר לאפליקציה | קוד: <?php echo htmlspecialchars($transcriber['transcriber_code'] ?: 'לא זמין'); ?></span>
                        </div>
                    </div>
                </div>
                
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">מתמלל פעיל מאז</div>
                        <div class="summary-value"><?php echo getHebrewMonth(date('Y-m', strtotime($transcriber['connected_at']))); ?></div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">סה"כ עבודות</div>
                        <div class="summary-value"><?php echo $overallStats['total_projects']; ?></div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">ממוצע חודשי</div>
                        <div class="summary-value"><?php echo number_format($monthlyAverage, 1); ?></div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">דירוג כללי</div>
                        <div class="summary-value"><?php echo number_format($rating, 1); ?>/5</div>
                    </div>
                </div>
            </div>

            <!-- פילטר חודשים -->
            <div class="month-selector">
                <label class="filter-label">בחר חודש:</label>
                <select class="filter-select" id="monthSelector" onchange="changeMonth()">
                    <?php
                    // Generate last 6 months
                    for ($i = 0; $i < 6; $i++) {
                        $monthValue = date('Y-m', strtotime("-$i months"));
                        $monthDisplay = getHebrewMonth($monthValue);
                        $selected = ($monthValue == $selectedMonth) ? 'selected' : '';
                        echo "<option value='$monthValue' $selected>$monthDisplay</option>";
                    }
                    ?>
                </select>
            </div>

            <!-- סיכום חודשי -->
            <div class="monthly-summary">
                <h3>📊 סיכום עבודות - <?php echo getHebrewMonth($selectedMonth); ?></h3>
                <div class="monthly-stats">
                    <div class="monthly-stat">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $monthlyStats['total_works'] ?: 0; ?></div>
                            <div class="stat-label">עבודות</div>
                        </div>
                    </div>
                    <div class="monthly-stat">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $onTimeWorks; ?></div>
                            <div class="stat-label">בזמן</div>
                        </div>
                    </div>
                    <div class="monthly-stat">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number">₪<?php echo number_format($totalPayment, 0); ?></div>
                            <div class="stat-label">הכנסות</div>
                        </div>
                    </div>
                    <div class="monthly-stat">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo number_format($rating, 1); ?></div>
                            <div class="stat-label">דירוג</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- טבלת עבודות מפורטת -->
            <div class="works-table-container">
                <h3>📋 פירוט עבודות - <?php echo getHebrewMonth($selectedMonth); ?></h3>
                <div class="table-wrapper">
                    <table class="detailed-works-table">
                        <thead>
                            <tr>
                                <th>מספר עבודה</th>
                                <th>לקוח</th>
                                <th>סוג עבודה</th>
                                <th>תאריך קבלה</th>
                                <th>תאריך יעד</th>
                                <th>תאריך שליחה</th>
                                <th>זמן עבודה</th>
                                <th>תשלום</th>
                                <th>סטטוס</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($monthlyWorks)): ?>
                                <tr>
                                    <td colspan="9" style="text-align: center; color: #666; padding: 30px;">
                                        אין עבודות בחודש זה
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($monthlyWorks as $work): ?>
                                    <?php
                                    // Calculate simulated work time and payment
                                    $workHours = rand(15, 50) / 10; // 1.5 to 5 hours
                                    $hourlyRate = rand(30, 50);
                                    $workPayment = $workHours * $hourlyRate;
                                    
                                    // Status mapping
                                    $statusClass = '';
                                    switch ($work['delivery_status']) {
                                        case 'מאוחר': $statusClass = 'late'; break;
                                        case 'בזמן': $statusClass = 'on-time'; break;
                                        case 'מוקדם': $statusClass = 'early'; break;
                                        default: $statusClass = 'on-time';
                                    }
                                    ?>
                                    <tr>
                                        <td><span class="work-id"><?php echo $work['id']; ?></span></td>
                                        <td><?php echo htmlspecialchars($work['client_name'] ?: 'לא צוין'); ?></td>
                                        <td><?php echo htmlspecialchars($work['work_type']); ?></td>
                                        <td><?php echo date('d/m/Y', strtotime($work['created_at'])); ?></td>
                                        <td><?php echo $work['deadline'] ? date('d/m/Y', strtotime($work['deadline'])) : 'לא צוין'; ?></td>
                                        <td><?php echo $work['status'] == 'completed' ? date('d/m/Y', strtotime($work['updated_at'])) : 'בעבודה'; ?></td>
                                        <td><?php echo number_format($workHours, 1); ?> שעות</td>
                                        <td>₪<?php echo number_format($workPayment, 0); ?></td>
                                        <td><span class="status-indicator <?php echo $statusClass; ?>"><?php echo $work['delivery_status']; ?></span></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- סיכום תחתון -->
            <div class="bottom-summary">
                <div class="summary-row">
                    <span class="summary-label">סה"כ עבודות בחודש:</span>
                    <span class="summary-value"><?php echo $totalWorks; ?></span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">סה"כ זמן עבודה:</span>
                    <span class="summary-value"><?php echo number_format($totalHours, 1); ?> שעות</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">סה"כ תשלום:</span>
                    <span class="summary-value">₪<?php echo number_format($totalPayment, 0); ?></span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">ממוצע לעבודה:</span>
                    <span class="summary-value">₪<?php echo $totalWorks > 0 ? number_format($totalPayment / $totalWorks, 0) : 0; ?></span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">ממוצע שעתי:</span>
                    <span class="summary-value">₪<?php echo $totalHours > 0 ? number_format($totalPayment / $totalHours, 0) : 0; ?></span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // פונקציה לטעינת נתוני חודש
        function changeMonth() {
            const selectedMonth = document.getElementById('monthSelector').value;
            window.location.href = `worker_details.php?id=<?php echo $transcriberId; ?>&month=${selectedMonth}`;
        }

        // אפקט hover לשורות הטבלה
        const tableRows = document.querySelectorAll('.detailed-works-table tbody tr');
        tableRows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(5px)';
                this.style.transition = 'transform 0.3s ease';
            });
            
            row.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });

        // אנימציה לטעינה
        document.addEventListener('DOMContentLoaded', function() {
            const elements = document.querySelectorAll('.summary-item, .monthly-stat');
            elements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    element.style.transition = 'all 0.5s ease';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });
    </script>
</body>
</html>