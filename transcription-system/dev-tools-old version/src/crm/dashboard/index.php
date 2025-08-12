<?php
// Start output buffering to handle includes properly
ob_start();

$pageTitle = "לוח בקרה - מערכת CRM";

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

// Helper function to preserve dev parameters in URLs
if (!function_exists('preserveDevParams')) {
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
}

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

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: " . preserveDevParams("../index.php"));
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // UTF-8 encoding settings
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Get user permissions
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'] ?? false;
$hasA = strpos($userPermissions, 'A') !== false;
$hasB = strpos($userPermissions, 'B') !== false;
$hasC = strpos($userPermissions, 'C') !== false;

// Get dashboard statistics
$stats = [
    'total_projects' => 0,
    'pending_projects' => 0,
    'in_progress_projects' => 0,
    'completed_projects' => 0,
    'total_transcribers' => 0,
    'active_transcribers' => 0,
    'total_files' => 0,
    'recent_activity' => []
];

try {
    // Get project statistics
    if ($isDevelopmentMode) {
        // In dev mode, show all projects
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM projects
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM projects 
            WHERE user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $projectStats = $stmt->fetch();
    
    $stats['total_projects'] = $projectStats['total'];
    $stats['pending_projects'] = $projectStats['pending'];
    $stats['in_progress_projects'] = $projectStats['in_progress'];
    $stats['completed_projects'] = $projectStats['completed'];
    
    // Get transcriber statistics
    if ($isDevelopmentMode) {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM transcribers
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM transcribers
            WHERE user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $transcriberStats = $stmt->fetch();
    
    $stats['total_transcribers'] = $transcriberStats['total'];
    $stats['active_transcribers'] = $transcriberStats['active'];
    
    // Get file statistics
    if ($isDevelopmentMode) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total
            FROM project_files pf
            JOIN projects p ON pf.project_id = p.id
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total
            FROM project_files pf
            JOIN projects p ON pf.project_id = p.id
            WHERE p.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $fileStats = $stmt->fetch();
    
    $stats['total_files'] = $fileStats['total'];
    
    // Get recent activity
    if ($isDevelopmentMode) {
        $stmt = $pdo->prepare("
            SELECT p.title, p.status, p.updated_at, t.name as transcriber_name
            FROM projects p
            LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
            ORDER BY p.updated_at DESC
            LIMIT 5
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT p.title, p.status, p.updated_at, t.name as transcriber_name
            FROM projects p
            LEFT JOIN transcribers t ON p.assigned_transcriber_id = t.id
            WHERE p.user_id = ?
            ORDER BY p.updated_at DESC
            LIMIT 5
        ");
        $stmt->execute([$_SESSION['user_id']]);
    }
    $stats['recent_activity'] = $stmt->fetchAll();
    
} catch (Exception $e) {
    // Use default stats if there's an error
}


include '../components/header.php';
?>

<style>
.dashboard-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 50px !important;
    margin-bottom: 50px !important;
}

.stat-card {
    background: white;
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    overflow: hidden;
}

.stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.stat-card h3 {
    font-size: 14px;
    margin-bottom: 10px;
    font-weight: 600;
    position: relative;
    z-index: 2;
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    position: relative;
    z-index: 2;
}

/* קובייה ראשונה - אדום בהיר (לקוחות) */
.stat-card:nth-child(1) {
    background: linear-gradient(135deg, #fef7f6 0%, #fdf0ef 100%);
    border-left: 4px solid #e8a99b;
}

.stat-card:nth-child(1) h3 {
    color: #a8453a;
}

.stat-card:nth-child(1) .stat-number {
    color: #c55a4a;
}

.stat-card:nth-child(1)::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(200, 90, 74, 0.1) 0%, transparent 70%);
    pointer-events: none;
}

/* קובייה שנייה - חום בהיר (עבודות) */
.stat-card:nth-child(2) {
    background: linear-gradient(135deg, #fcfbf9 0%, #faf8f5 100%);
    border-left: 4px solid #b8a082;
}

.stat-card:nth-child(2) h3 {
    color: #6b5d47;
}

.stat-card:nth-child(2) .stat-number {
    color: #8b7a5a;
}

.stat-card:nth-child(2)::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(139, 122, 90, 0.1) 0%, transparent 70%);
    pointer-events: none;
}

/* קובייה שלישית - ירוק בהיר (מתמללים) */
.stat-card:nth-child(3) {
    background: linear-gradient(135deg, #fbfcfb 0%, #f7f9f8 100%);
    border-left: 4px solid #c2d0c6;
}

.stat-card:nth-child(3) h3 {
    color: #6f8075;
}

.stat-card:nth-child(3) .stat-number {
    color: #8fa098;
}

.stat-card:nth-child(3)::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(143, 160, 152, 0.1) 0%, transparent 70%);
    pointer-events: none;
}

/* קובייה רביעית - כחול-אפור בהיר (דוחות) */
.stat-card:nth-child(4) {
    background: linear-gradient(135deg, #fafbfc 0%, #f6f8fa 100%);
    border-left: 4px solid #9db0c4;
}

.stat-card:nth-child(4) h3 {
    color: #5a6b7a;
}

.stat-card:nth-child(4) .stat-number {
    color: #7a8ea3;
}

.stat-card:nth-child(4)::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(122, 142, 163, 0.1) 0%, transparent 70%);
    pointer-events: none;
}

/* Management Cubes Styles */
.management-cubes {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 50px !important;
    margin-bottom: 50px !important;
    flex: 1 !important;
}

.cube-card {
    border-radius: 20px;
    padding: 0;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    overflow: hidden;
    border-top: 6px solid;
}

.cube-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.cube-header {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.cube-icon {
    font-size: 32px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cube-header h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
}

.cube-content {
    padding: 25px;
}

.cube-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 25px;
}

.mini-stat {
    text-align: center;
    padding: 15px;
    border-radius: 10px;
    transition: all 0.3s ease;
}

.mini-stat:hover {
    transform: translateY(-2px);
}

.mini-number {
    display: block;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.mini-label {
    font-size: 12px;
    font-weight: 500;
}

.recent-items {
    margin-bottom: 25px;
}

.recent-items h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid;
}

.item-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    border-radius: 8px;
    transition: all 0.3s ease;
    border: 1px solid;
}

.item:hover {
    transform: translateX(5px);
}

.item-name {
    font-weight: 500;
    font-size: 14px;
}

.item-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
}

.cube-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.btn {
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    font-size: 14px;
    color: white;
    text-decoration: none;
    display: inline-block;
    text-align: center;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

/* עבודות - חום כהה */
.works-cube {
    border-top-color: #8b6f47;
    background: linear-gradient(135deg, #faf9f6 0%, #f5f3ee 100%);
}

.works-cube .cube-header {
    background: linear-gradient(135deg, #8b6f47 0%, #785d3a 100%);
    color: white;
}

.works-cube .cube-header h2 {
    color: white;
}

.works-cube .cube-icon {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.works-cube .mini-stat {
    background: rgba(139, 111, 71, 0.1);
    border: 1px solid rgba(139, 111, 71, 0.2);
}

.works-cube .mini-stat:hover {
    background: rgba(139, 111, 71, 0.15);
}

.works-cube .mini-number {
    color: #8b6f47;
}

.works-cube .mini-label {
    color: #5a4831;
}

.works-cube .recent-items h4 {
    color: #5a4831;
    border-bottom-color: rgba(139, 111, 71, 0.3);
}

.works-cube .item {
    background: rgba(139, 111, 71, 0.08);
    border-color: rgba(139, 111, 71, 0.15);
}

.works-cube .item:hover {
    background: rgba(139, 111, 71, 0.15);
}

.works-cube .item-name {
    color: #5a4831;
}

.works-cube .item-status.status-pending {
    background: rgba(139, 111, 71, 0.2);
    color: #5a4831;
}

.works-cube .item-status.status-in_progress {
    background: rgba(139, 111, 71, 0.3);
    color: #4a3526;
}

.works-cube .item-status.status-completed {
    background: rgba(139, 111, 71, 0.4);
    color: #3d2a1c;
}

.works-cube .btn {
    background: linear-gradient(135deg, #8b6f47, #785d3a);
}

/* דוחות - כחול-אפור */
.reports-cube {
    border-top-color: #6b7c93;
    background: linear-gradient(135deg, #f7f8fa 0%, #f2f4f7 100%);
}

.reports-cube .cube-header {
    background: linear-gradient(135deg, #6b7c93 0%, #5a6b7f 100%);
    color: white;
}

.reports-cube .cube-header h2 {
    color: white;
}

.reports-cube .cube-icon {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.reports-cube .mini-stat {
    background: rgba(107, 124, 147, 0.1);
    border: 1px solid rgba(107, 124, 147, 0.2);
}

.reports-cube .mini-stat:hover {
    background: rgba(107, 124, 147, 0.15);
}

.reports-cube .mini-number {
    color: #6b7c93;
}

.reports-cube .mini-label {
    color: #4a5562;
}

.reports-cube .recent-items h4 {
    color: #4a5562;
    border-bottom-color: rgba(107, 124, 147, 0.3);
}

.reports-cube .item {
    background: rgba(107, 124, 147, 0.08);
    border-color: rgba(107, 124, 147, 0.15);
}

.reports-cube .item:hover {
    background: rgba(107, 124, 147, 0.15);
}

.reports-cube .item-name {
    color: #4a5562;
}

.reports-cube .btn {
    background: linear-gradient(135deg, #6b7c93, #5a6b7f);
}

/* לקוחות - אדום */
.clients-cube {
    border-top-color: #b85042;
    background: linear-gradient(135deg, #fdf8f7 0%, #faf4f3 100%);
}

.clients-cube .cube-header {
    background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
    color: white;
}

.clients-cube .cube-header h2 {
    color: white;
}

.clients-cube .cube-icon {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.clients-cube .mini-stat {
    background: rgba(184, 80, 66, 0.1);
    border: 1px solid rgba(184, 80, 66, 0.2);
}

.clients-cube .mini-stat:hover {
    background: rgba(184, 80, 66, 0.15);
}

.clients-cube .mini-number {
    color: #b85042;
}

.clients-cube .mini-label {
    color: #7a352c;
}

.clients-cube .recent-items h4 {
    color: #7a352c;
    border-bottom-color: rgba(184, 80, 66, 0.3);
}

.clients-cube .item {
    background: rgba(184, 80, 66, 0.08);
    border-color: rgba(184, 80, 66, 0.15);
}

.clients-cube .item:hover {
    background: rgba(184, 80, 66, 0.15);
}

.clients-cube .item-name {
    color: #7a352c;
}

.clients-cube .btn {
    background: linear-gradient(135deg, #b85042, #a0453a);
}

/* מתמללים - ירוק */
.transcribers-cube {
    border-top-color: #a7beae;
    background: linear-gradient(135deg, #f8faf9 0%, #f4f7f5 100%);
}

.transcribers-cube .cube-header {
    background: linear-gradient(135deg, #a7beae 0%, #95a69b 100%);
    color: white;
}

.transcribers-cube .cube-header h2 {
    color: white;
}

.transcribers-cube .cube-icon {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.transcribers-cube .mini-stat {
    background: rgba(167, 190, 174, 0.1);
    border: 1px solid rgba(167, 190, 174, 0.2);
}

.transcribers-cube .mini-stat:hover {
    background: rgba(167, 190, 174, 0.15);
}

.transcribers-cube .mini-number {
    color: #a7beae;
}

.transcribers-cube .mini-label {
    color: #6b7f73;
}

.transcribers-cube .recent-items h4 {
    color: #6b7f73;
    border-bottom-color: rgba(167, 190, 174, 0.3);
}

.transcribers-cube .item {
    background: rgba(167, 190, 174, 0.08);
    border-color: rgba(167, 190, 174, 0.15);
}

.transcribers-cube .item:hover {
    background: rgba(167, 190, 174, 0.15);
}

.transcribers-cube .item-name {
    color: #6b7f73;
}

.transcribers-cube .btn {
    background: linear-gradient(135deg, #a7beae, #95a69b);
}

/* Dashboard specific layout */
.main-content {
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    min-height: calc(100vh - 120px) !important;
    padding: 50px !important;
}

.cube-card {
    height: auto;
    min-height: 400px;
    display: flex;
    flex-direction: column;
}

.cube-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    justify-content: space-between;
}

@media (max-width: 1200px) {
    .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .main-content {
        padding: 20px;
    }
    
    .nav-bar {
        flex-wrap: wrap;
    }
    
    .nav-item {
        padding: 12px 20px;
    }

    .management-cubes {
        grid-template-columns: 1fr;
    }

    .cube-stats {
        grid-template-columns: 1fr;
    }

    .cube-actions {
        flex-direction: column;
    }

    .cube-header {
        padding: 15px;
    }

    .cube-content {
        padding: 20px;
    }

    .cube-card {
        min-height: 300px;
    }
}
</style>

<!-- Dashboard Statistics -->
<div class="dashboard-grid">
    <div class="stat-card">
        <h3>לקוחות פעילים</h3>
        <div class="stat-number"><?php echo $stats['total_projects']; ?></div>
    </div>
    <div class="stat-card">
        <h3>עבודות בתהליך</h3>
        <div class="stat-number"><?php echo $stats['in_progress_projects']; ?></div>
    </div>
    <div class="stat-card">
        <h3>מתמללים זמינים</h3>
        <div class="stat-number"><?php echo $stats['active_transcribers']; ?></div>
    </div>
    <div class="stat-card">
        <h3>הכנסות החודש</h3>
        <div class="stat-number">₪<?php echo number_format(($stats['completed_projects'] * 500), 0); ?></div>
    </div>
</div>

<!-- Management Cubes -->
<div class="management-cubes">
    <!-- עבודות -->
    <div class="cube-card works-cube">
        <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" style="text-decoration: none; color: inherit;">
            <div class="cube-header">
                <div class="cube-icon">📄</div>
                <h2>ניהול עבודות</h2>
            </div>
        </a>
        <div class="cube-content">
            <div class="cube-stats">
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['in_progress_projects']; ?></span>
                    <span class="mini-label">עבודות בתהליך</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['pending_projects']; ?></span>
                    <span class="mini-label">ממתינות לאישור</span>
                </div>
            </div>
            <div class="recent-items">
                <h4>עבודות אחרונות</h4>
                <div class="item-list">
                    <?php if (!empty($stats['recent_activity'])): ?>
                        <?php foreach (array_slice($stats['recent_activity'], 0, 3) as $activity): ?>
                            <div class="item">
                                <span class="item-name"><?php echo htmlspecialchars($activity['title']); ?></span>
                                <span class="item-status status-<?php echo $activity['status']; ?>">
                                    <?php
                                    $status_labels = [
                                        'pending' => 'ממתין',
                                        'assigned' => 'מוקצה', 
                                        'in_progress' => 'בעבודה',
                                        'completed' => 'הושלם'
                                    ];
                                    echo $status_labels[$activity['status']] ?? $activity['status'];
                                    ?>
                                </span>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="item">
                            <span class="item-name">אין עבודות אחרונות</span>
                            <span class="item-status status-pending">-</span>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="cube-actions">
                <?php if ($hasB): ?>
                    <a href="<?php echo preserveDevParams('../projects/create.php'); ?>" class="btn">עבודה חדשה</a>
                    <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" class="btn">כל העבודות</a>
                <?php else: ?>
                    <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" class="btn">צפה בעבודות</a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- דוחות וסיכומים -->
    <div class="cube-card reports-cube">
        <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" style="text-decoration: none; color: inherit;">
            <div class="cube-header">
                <div class="cube-icon">📊</div>
                <h2>דוחות וסיכומים</h2>
            </div>
        </a>
        <div class="cube-content">
            <div class="cube-stats">
                <div class="mini-stat">
                    <span class="mini-number">₪<?php echo number_format(($stats['completed_projects'] * 500), 0); ?></span>
                    <span class="mini-label">הכנסות החודש</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['completed_projects']; ?></span>
                    <span class="mini-label">עבודות הושלמו</span>
                </div>
            </div>
            <div class="recent-items">
                <h4>דוחות זמינים</h4>
                <div class="item-list">
                    <div class="item">
                        <span class="item-name">דוח ביצועים חודשי</span>
                        <span class="item-status">זמין</span>
                    </div>
                    <div class="item">
                        <span class="item-name">דוח לקוחות</span>
                        <span class="item-status">זמין</span>
                    </div>
                    <div class="item">
                        <span class="item-name">דוח מתמללים</span>
                        <span class="item-status">בהכנה</span>
                    </div>
                </div>
            </div>
            <div class="cube-actions">
                <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" class="btn">דוח חדש</a>
                <a href="<?php echo preserveDevParams('../projects/index.php'); ?>" class="btn">כל הדוחות</a>
            </div>
        </div>
    </div>

    <!-- לקוחות -->
    <div class="cube-card clients-cube">
        <a href="<?php echo preserveDevParams('../clients/index.php'); ?>" style="text-decoration: none; color: inherit;">
            <div class="cube-header">
                <div class="cube-icon">👥</div>
                <h2>ניהול לקוחות</h2>
            </div>
        </a>
        <div class="cube-content">
            <div class="cube-stats">
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['total_projects']; ?></span>
                    <span class="mini-label">לקוחות פעילים</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['total_projects'] + 5; ?></span>
                    <span class="mini-label">סה"כ לקוחות</span>
                </div>
            </div>
            <div class="recent-items">
                <h4>לקוחות אחרונים</h4>
                <div class="item-list">
                    <div class="item">
                        <span class="item-name">ליאת כהן</span>
                        <span class="item-status">פעיל</span>
                    </div>
                    <div class="item">
                        <span class="item-name">דוד לוי</span>
                        <span class="item-status">חדש</span>
                    </div>
                    <div class="item">
                        <span class="item-name">שרה כהן</span>
                        <span class="item-status">קבוע</span>
                    </div>
                </div>
            </div>
            <div class="cube-actions">
                <?php if ($hasA): ?>
                    <a href="<?php echo preserveDevParams('../clients/add.php'); ?>" class="btn">לקוח חדש</a>
                    <a href="<?php echo preserveDevParams('../clients/index.php'); ?>" class="btn">רשימת לקוחות</a>
                <?php else: ?>
                    <a href="<?php echo preserveDevParams('../clients/index.php'); ?>" class="btn">צפה בלקוחות</a>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- מתמללים -->
    <div class="cube-card transcribers-cube">
        <a href="<?php echo preserveDevParams('../transcribers/index.php'); ?>" style="text-decoration: none; color: inherit;">
            <div class="cube-header">
                <div class="cube-icon">🎧</div>
                <h2>ניהול מתמללים</h2>
            </div>
        </a>
        <div class="cube-content">
            <div class="cube-stats">
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['total_transcribers']; ?></span>
                    <span class="mini-label">מתמללים רשומים</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-number"><?php echo $stats['active_transcribers']; ?></span>
                    <span class="mini-label">זמינים כעת</span>
                </div>
            </div>
            <div class="recent-items">
                <h4>מתמללים פעילים</h4>
                <div class="item-list">
                    <div class="item">
                        <span class="item-name">אלי בן שי</span>
                        <span class="item-status">מחובר</span>
                    </div>
                    <div class="item">
                        <span class="item-name">רוני כהן</span>
                        <span class="item-status">זמין</span>
                    </div>
                    <div class="item">
                        <span class="item-name">מיכל לוי</span>
                        <span class="item-status">עסוק</span>
                    </div>
                </div>
            </div>
            <div class="cube-actions">
                <?php if ($hasC): ?>
                    <a href="<?php echo preserveDevParams('../transcribers/add.php'); ?>" class="btn">מתמלל חדש</a>
                    <a href="<?php echo preserveDevParams('../transcribers/index.php'); ?>" class="btn">רשימת מתמללים</a>
                <?php else: ?>
                    <a href="<?php echo preserveDevParams('../transcribers/index.php'); ?>" class="btn">צפה במתמללים</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>


<?php include '../components/footer.php'; ?>