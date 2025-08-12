<?php
// Start output buffering to handle includes properly
ob_start();

/*
 * =========================================
 * מערכת CRM - ניהול לקוחות
 * crm_system/clients/index.php
 * =========================================
 * מודול ניהול לקוחות במערכת CRM
 * מאפשר הוספת, עריכת וצפייה בלקוחות
 * נגיש למשתמשים עם הרשאה A
 */

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
        'full_name' => 'מפתח מערכת',
        'permissions' => 'ABCDEFG',
        'is_admin' => true
    ];
}

// Database connection - CLIENT DATABASE
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

if (!$hasA) {
    header("Location: ../index.php");
    exit;
}

// Handle form submissions
$message = null;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add_client':
                $name = $_POST['name'];
                $email = $_POST['email'];
                $phone = $_POST['phone'];
                $company = $_POST['company'];
                
                try {
                    $stmt = $pdo->prepare("INSERT INTO clients (name, email, phone, company, user_id) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$name, $email, $phone, $company, $_SESSION['user_id']]);
                    $message = "לקוח נוסף בהצלחה";
                } catch (Exception $e) {
                    $message = "שגיאה בהוספת לקוח: " . $e->getMessage();
                }
                break;
        }
    }
}

// Get statistics
$stats = [
    'total_clients' => 0,
    'active_clients' => 0,
    'vip_clients' => 0,
    'monthly_works' => 0
];

try {
    // Get total clients
    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM clients WHERE user_id = ?");
    $totalStmt->execute([$_SESSION['user_id']]);
    $stats['total_clients'] = $totalStmt->fetchColumn();
    
    // For now, set example values based on total
    $stats['active_clients'] = max(0, $stats['total_clients'] - 2);
    $stats['vip_clients'] = min($stats['total_clients'], 3);
    $stats['monthly_works'] = $stats['total_clients'] * 5;
    
} catch (Exception $e) {
    // Keep default values if queries fail
}
?>

<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ניהול לקוחות - מערכת CRM</title>
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
            margin: 0;
            padding: 0;
        }

        .container {
            width: 100%;
            min-height: 100vh;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
        }

        /* Header משותף */
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
            padding: 50px;
            background: #f8f9fa;
            flex: 1;
            min-height: calc(100vh - 120px);
            display: flex;
            flex-direction: column;
        }

        .message {
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 10px;
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
            font-weight: 500;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
            border-left-color: #dc3545;
        }

        /* כפתור הוספה */
        .add-button {
            background: linear-gradient(135deg, #b85042, #a0453a);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            font-size: 16px;
            margin-bottom: 30px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(184, 80, 66, 0.3);
        }

        .add-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(184, 80, 66, 0.4);
        }

        /* סטטיסטיקות עם צבעים אדומים */
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
            position: relative;
            overflow: hidden;
        }

        .stat-card:hover {
            transform: translateY(-3px);
        }

        .stat-card h3 {
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 600;
            position: relative;
            z-index: 2;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            position: relative;
            z-index: 2;
        }

        /* גווני אדום שונים */
        .stat-card:nth-child(1) {
            background: linear-gradient(135deg, #fdf7f6 0%, #faf1f0 100%);
            border-left: 4px solid #d4625a;
        }

        .stat-card:nth-child(1) h3 {
            color: #8b342c;
        }

        .stat-card:nth-child(1) .stat-number {
            color: #b85042;
        }

        .stat-card:nth-child(2) {
            background: linear-gradient(135deg, #fef8f7 0%, #fcf2f1 100%);
            border-left: 4px solid #c55a4a;
        }

        .stat-card:nth-child(2) h3 {
            color: #9b3e32;
        }

        .stat-card:nth-child(2) .stat-number {
            color: #c55a4a;
        }

        .stat-card:nth-child(3) {
            background: linear-gradient(135deg, #fdf6f5 0%, #faf0ef 100%);
            border-left: 4px solid #a8453a;
        }

        .stat-card:nth-child(3) h3 {
            color: #742f26;
        }

        .stat-card:nth-child(3) .stat-number {
            color: #a8453a;
        }

        .stat-card:nth-child(4) {
            background: linear-gradient(135deg, #fef9f8 0%, #fbf3f2 100%);
            border-left: 4px solid #d9726a;
        }

        .stat-card:nth-child(4) h3 {
            color: #a5453c;
        }

        .stat-card:nth-child(4) .stat-number {
            color: #d9726a;
        }

        /* טאבים */
        .tabs-container {
            margin-bottom: 30px;
        }

        .tabs {
            display: flex;
            background: white;
            border-radius: 10px;
            padding: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .tab {
            flex: 1;
            padding: 12px 20px;
            text-align: center;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            color: #7a352c;
        }

        .tab.active {
            background: linear-gradient(135deg, #b85042, #a0453a);
            color: white;
            box-shadow: 0 2px 10px rgba(184, 80, 66, 0.3);
        }

        .tab:hover:not(.active) {
            background: rgba(184, 80, 66, 0.1);
            color: #b85042;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
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
            font-weight: 500;
            color: #7a352c;
        }

        .filter-select {
            padding: 10px 15px;
            border: 2px solid rgba(184, 80, 66, 0.2);
            border-radius: 8px;
            font-size: 14px;
            background: white;
            color: #7a352c;
            transition: border-color 0.3s ease;
        }

        .filter-select:focus {
            outline: none;
            border-color: #b85042;
        }

        .search-box {
            padding: 12px 20px;
            border: 2px solid rgba(184, 80, 66, 0.2);
            border-radius: 25px;
            font-size: 14px;
            background: white;
            color: #7a352c;
            transition: border-color 0.3s ease;
            min-width: 300px;
        }

        .search-box:focus {
            outline: none;
            border-color: #b85042;
        }

        /* רשימת לקוחות */
        .clients-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }

        .client-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border-top: 4px solid #b85042;
            position: relative;
            overflow: hidden;
        }

        .client-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .client-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .client-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #b85042, #a0453a);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .client-info h3 {
            font-size: 20px;
            font-weight: 600;
            color: #7a352c;
            margin-bottom: 8px;
        }

        .client-type {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            text-transform: uppercase;
            background: rgba(184, 80, 66, 0.1);
            color: #7a352c;
            display: inline-block;
        }

        .client-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .status-dot.active {
            background: #27ae60;
        }

        .status-dot.inactive {
            background: #95a5a6;
        }

        .status-dot.vip {
            background: #f39c12;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .client-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .detail-item {
            background: rgba(184, 80, 66, 0.05);
            padding: 12px;
            border-radius: 8px;
            border: 1px solid rgba(184, 80, 66, 0.1);
        }

        .detail-label {
            font-size: 12px;
            color: #7a352c;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .detail-value {
            font-weight: 600;
            color: #2c3e50;
            font-size: 14px;
        }

        .client-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 20px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: linear-gradient(135deg, #b85042, #a0453a);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(184, 80, 66, 0.3);
        }

        .btn-secondary {
            background: rgba(184, 80, 66, 0.1);
            color: #7a352c;
        }

        .btn-secondary:hover {
            background: rgba(184, 80, 66, 0.2);
        }

        /* מודל הוספת לקוח */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }

        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: white;
            padding: 0;
            border-radius: 20px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .modal-header {
            background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
        }

        .close {
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.3s;
        }

        .close:hover {
            opacity: 0.7;
        }

        .modal-body {
            padding: 30px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #7a352c;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(184, 80, 66, 0.2);
            border-radius: 10px;
            font-size: 14px;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }

        .form-control:focus {
            outline: none;
            border-color: #b85042;
            box-shadow: 0 0 0 3px rgba(184, 80, 66, 0.1);
        }

        /* טבלה עם עיצוב אדום */
        .clients-table {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            margin-bottom: 30px;
        }

        .clients-table h3 {
            color: #7a352c;
            margin-bottom: 20px;
            font-size: 18px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px 15px;
            text-align: right;
            border-bottom: 1px solid rgba(184, 80, 66, 0.1);
        }

        th {
            background: rgba(184, 80, 66, 0.1);
            font-weight: 600;
            color: #7a352c;
        }

        tr:hover {
            background: rgba(184, 80, 66, 0.05);
        }

        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .clients-grid {
                grid-template-columns: 1fr;
            }
            
            .main-content {
                padding: 20px;
            }
            
            .tabs {
                flex-direction: column;
            }
            
            .filters {
                flex-direction: column;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏢 מערכת CRM למתמלל - ניהול לקוחות</h1>
            <div class="user-info">
                <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
                <div class="user-avatar"><?php echo mb_strtoupper(mb_substr($_SESSION['full_name'] ?? $_SESSION['username'], 0, 1)); ?></div>
            </div>
        </div>

        <!-- Navigation -->
        <?php
        // Helper function to preserve dev parameters in URLs
        function preserveDevParams($url) {
            $params = [];
            if (isset($_GET['devnav'])) $params[] = 'devnav=' . $_GET['devnav'];
            if (isset($_GET['dev'])) $params[] = 'dev=' . $_GET['dev'];
            
            if (empty($params)) {
                return $url;
            }
            
            // Check if URL already has parameters
            $separator = (strpos($url, '?') !== false) ? '&' : '?';
            return $url . $separator . implode('&', $params);
        }
        ?>
        <nav class="nav-bar">
            <a href="<?php echo preserveDevParams('../dashboard/index.php'); ?>" class="nav-item <?php echo (strpos($_SERVER['REQUEST_URI'], '/dashboard/') !== false) ? 'active' : ''; ?>">🏠 לוח בקרה</a>
            <?php if ($hasA): ?>
                <a href="<?php echo preserveDevParams('../clients/index.php'); ?>" class="nav-item <?php echo (strpos($_SERVER['REQUEST_URI'], '/clients/') !== false) ? 'active' : ''; ?>">ניהול לקוחות</a>
            <?php endif; ?>
            <?php if ($hasB): ?>
                <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" class="nav-item <?php echo (strpos($_SERVER['REQUEST_URI'], '/projects/') !== false) ? 'active' : ''; ?>">ניהול עבודות</a>
            <?php endif; ?>
            <?php if ($hasC): ?>
                <a href="<?php echo preserveDevParams('../transcribers/index.php'); ?>" class="nav-item <?php echo (strpos($_SERVER['REQUEST_URI'], '/transcribers/') !== false) ? 'active' : ''; ?>">ניהול מתמללים</a>
            <?php endif; ?>
            <a href="<?php echo preserveDevParams('../index.php?logout=1'); ?>" class="nav-item" style="color: #dc3545;">התנתק</a>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <?php if (isset($message)): ?>
                <div class="message <?php echo strpos($message, 'שגיאה') !== false ? 'error' : ''; ?>">
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif; ?>

            <!-- כפתור הוספה -->
            <button class="add-button" id="addClientBtn">➕ הוספת לקוח חדש</button>

            <!-- סטטיסטיקות -->
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>סה"כ לקוחות</h3>
                    <div class="stat-number"><?php echo $stats['total_clients']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>לקוחות פעילים</h3>
                    <div class="stat-number"><?php echo $stats['active_clients']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>לקוחות VIP</h3>
                    <div class="stat-number"><?php echo $stats['vip_clients']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>עבודות החודש</h3>
                    <div class="stat-number"><?php echo $stats['monthly_works']; ?></div>
                </div>
            </div>

            <!-- טאבים -->
            <div class="tabs-container">
                <div class="tabs">
                    <div class="tab active" data-tab="clients">רשימת לקוחות</div>
                    <div class="tab" data-tab="table">תצוגת טבלה</div>
                </div>

                <!-- תוכן טאב לקוחות -->
                <div class="tab-content active" id="clients">
                    <!-- פילטרים וחיפוש -->
                    <div class="filters">
                        <div class="filter-group">
                            <label class="filter-label">סוג לקוח</label>
                            <select class="filter-select">
                                <option value="">כל הלקוחות</option>
                                <option value="regular">רגיל</option>
                                <option value="vip">VIP</option>
                                <option value="corporate">תאגיד</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">סטטוס</label>
                            <select class="filter-select">
                                <option value="">כל הסטטוסים</option>
                                <option value="active">פעיל</option>
                                <option value="inactive">לא פעיל</option>
                                <option value="potential">פוטנציאלי</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">חיפוש</label>
                            <input type="text" class="search-box" placeholder="🔍 חפש לקוח...">
                        </div>
                    </div>

                    <!-- רשימת לקוחות -->
                    <div class="clients-grid">
                        <?php
                        $clientsStmt = $pdo->prepare("
                            SELECT c.*, u.personal_company 
                            FROM clients c
                            LEFT JOIN users u ON c.user_id = u.id
                            WHERE c.user_id = ? 
                            ORDER BY c.created_at DESC
                        ");
                        $clientsStmt->execute([$_SESSION['user_id']]);
                        
                        if ($clientsStmt->rowCount() > 0) {
                            while ($client = $clientsStmt->fetch()):
                                $clientInitial = strtoupper(substr($client['name'], 0, 1));
                        ?>
                        <div class="client-card">
                            <div class="client-avatar"><?php echo $clientInitial; ?></div>
                            <div class="client-info">
                                <?php if (!empty($client['personal_company'])): ?>
                                    <p style="margin: 0; color: #666; font-size: 12px;"><?php echo htmlspecialchars($client['personal_company']); ?></p>
                                <?php endif; ?>
                                <h3><?php echo htmlspecialchars($client['name']); ?></h3>
                                <div class="client-type">לקוח רגיל</div>
                                <div class="client-status">
                                    <div class="status-dot active"></div>
                                    <span>לקוח פעיל</span>
                                </div>
                            </div>
                            <div class="client-details">
                                <div class="detail-item">
                                    <div class="detail-label">אימייל</div>
                                    <div class="detail-value"><?php echo htmlspecialchars($client['email']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">טלפון</div>
                                    <div class="detail-value"><?php echo htmlspecialchars($client['phone']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">חברה</div>
                                    <div class="detail-value"><?php echo htmlspecialchars($client['company']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">הצטרף</div>
                                    <div class="detail-value"><?php echo date('m/Y', strtotime($client['created_at'])); ?></div>
                                </div>
                            </div>
                            <div class="client-actions">
                                <button class="btn btn-primary">פרטים</button>
                                <button class="btn btn-secondary">עריכה</button>
                                <button class="btn btn-primary">עבודה חדשה</button>
                            </div>
                        </div>
                        <?php 
                            endwhile;
                        } else {
                            echo '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                                    <h3>אין לקוחות עדיין</h3>
                                    <p>השתמש בכפתור "הוספת לקוח חדש" כדי להתחיל</p>
                                  </div>';
                        }
                        ?>
                    </div>
                </div>

                <!-- תוכן טאב טבלה -->
                <div class="tab-content" id="table">
                    <div class="clients-table">
                        <h3>רשימת לקוחות</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>שם</th>
                                    <th>אימייל</th>
                                    <th>טלפון</th>
                                    <th>חברה</th>
                                    <th>תאריך הוספה</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $clientsStmt = $pdo->prepare("
                                    SELECT c.*, u.personal_company 
                                    FROM clients c
                                    LEFT JOIN users u ON c.user_id = u.id
                                    WHERE c.user_id = ? 
                                    ORDER BY c.created_at DESC
                                ");
                                $clientsStmt->execute([$_SESSION['user_id']]);
                                
                                if ($clientsStmt->rowCount() > 0) {
                                    while ($client = $clientsStmt->fetch()):
                                ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($client['name']); ?></td>
                                    <td><?php echo htmlspecialchars($client['email']); ?></td>
                                    <td><?php echo htmlspecialchars($client['phone']); ?></td>
                                    <td>
                                        <?php 
                                        $companyDisplay = $client['company'];
                                        if (!empty($client['personal_company']) && $client['company'] !== $client['personal_company']) {
                                            $companyDisplay = $client['personal_company'] . (!empty($client['company']) ? ' / ' . $client['company'] : '');
                                        }
                                        echo htmlspecialchars($companyDisplay);
                                        ?>
                                    </td>
                                    <td><?php echo date('d/m/Y', strtotime($client['created_at'])); ?></td>
                                </tr>
                                <?php 
                                    endwhile;
                                } else {
                                    echo "<tr><td colspan='5' style='text-align: center; color: #666;'>אין לקוחות עדיין</td></tr>";
                                }
                                ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- מודל הוספת לקוח -->
    <div id="addClientModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">הוספת לקוח חדש</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form method="POST" id="addClientForm">
                    <input type="hidden" name="action" value="add_client">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>שם מלא</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="form-group">
                            <label>אימייל</label>
                            <input type="email" class="form-control" name="email" required>
                        </div>
                        <div class="form-group">
                            <label>טלפון</label>
                            <input type="tel" class="form-control" name="phone">
                        </div>
                        <div class="form-group">
                            <label>חברה</label>
                            <input type="text" class="form-control" name="company">
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 16px;">שמור לקוח</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Tab switching
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');

            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    this.classList.add('active');
                    const tabId = this.getAttribute('data-tab');
                    document.getElementById(tabId).classList.add('active');
                });
            });

            // Modal functionality
            const modal = document.getElementById('addClientModal');
            const addBtn = document.getElementById('addClientBtn');
            const closeBtn = document.querySelector('.close');

            addBtn.addEventListener('click', function() {
                modal.classList.add('active');
            });

            closeBtn.addEventListener('click', function() {
                modal.classList.remove('active');
            });

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });

            // Search functionality
            const searchBox = document.querySelector('.search-box');
            const clientCards = document.querySelectorAll('.client-card');

            if (searchBox) {
                searchBox.addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase();
                    
                    clientCards.forEach(card => {
                        const clientName = card.querySelector('.client-info h3').textContent.toLowerCase();
                        const clientEmail = card.querySelector('.detail-value').textContent.toLowerCase();
                        
                        if (clientName.includes(searchTerm) || clientEmail.includes(searchTerm)) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            }

            // Animate cards on load
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });

            // Animate client cards
            const clientCardsAnim = document.querySelectorAll('.client-card');
            clientCardsAnim.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.6s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 200);
            });
        });
    </script>
</body>
</html>