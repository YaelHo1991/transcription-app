<?php
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

// Include developer navigation
require_once __DIR__ . '/../../../developer-tools/includes/dev-nav.php';

// In dev mode, set up session if not already set
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Developer';
    $_SESSION['permissions'] = 'ABCDEF';
    $_SESSION['transcriber_code'] = 'DEV001';
    $_SESSION['logged_in'] = true;
    $_SESSION['can_transcribe'] = true;
    $_SESSION['can_proofread'] = true;
    $_SESSION['can_export'] = true;
    $_SESSION['full_name'] = 'Developer Mode';
}

// Check if user is logged in (skip in development mode)
if (!$isDevelopmentMode && (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'])) {
    $loginRedirect = "../../login.php";
    if ($showDevNav) {
        $loginRedirect .= "?devnav=1";
    }
    header("Location: " . $loginRedirect);
    exit;
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    // Preserve devnav parameter when logging out
    $logoutRedirect = "../../login.php";
    if ($showDevNav) {
        $logoutRedirect .= "?devnav=1";
    }
    header("Location: " . $logoutRedirect);
    exit;
}

$username = $_SESSION['full_name'] ?? $_SESSION['username'] ?? 'משתמש';

// Include the developer navigation if needed (AFTER all header redirects)
if ($showDevNav) {
    include '../../../developer-tools/includes/dev-nav.php';
}
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אפליקציית תמלול - מאגר הרישומים</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            color: #201e20;
            overflow-x: hidden;
        }

        /* ===== HOVERING HEADER ===== */
        .header-reveal-zone {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 120px;
            z-index: 999;
            background: transparent;
        }

        .collapsible-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #201e20 0%, #3d3a3c 100%);
            color: white;
            padding: 15px 20px;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            z-index: 1001;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .collapsible-header.show {
            transform: translateY(0);
        }

        .collapsible-header .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
        }

        .collapsible-header .logo-section h1 {
            margin: 0;
            font-size: 24px;
            color: #e0a96d;
        }

        .collapsible-header .page-subtitle {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
        }

        .collapsible-header .nav-links {
            display: flex;
            gap: 20px;
        }

        .collapsible-header .nav-links a {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 20px;
            transition: all 0.3s ease;
        }

        .collapsible-header .nav-links a:hover,
        .collapsible-header .nav-links a.active {
            background: #e0a96d;
            color: #201e20;
        }

        .collapsible-header .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .collapsible-header .logout-btn {
            background: #e0a96d;
            color: #201e20;
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .collapsible-header .logout-btn:hover {
            background: #d4956b;
        }

        /* ===== HOVERING SIDEBAR ===== */
        .sidebar-reveal-zone {
            position: fixed;
            top: 0;
            right: 0;
            width: 50px;
            height: 100vh;
            z-index: 998;
            background: transparent;
        }

        .sidebar {
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: linear-gradient(135deg, #201e20 0%, #3d3a3c 100%);
            color: white;
            padding: 20px;
            transition: right 0.3s ease;
            z-index: 999;
            box-shadow: -4px 0 15px rgba(0,0,0,0.2);
            overflow-y: auto;
        }

        .sidebar.show {
            right: 0;
        }

        .sidebar-content {
            padding-top: 20px;
        }

        .sidebar-section {
            margin-bottom: 30px;
        }

        .sidebar-section h3 {
            color: #e0a96d;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .stat-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #e0a96d;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 998;
        }

        .overlay.show {
            opacity: 1;
            visibility: visible;
        }

        /* ===== MAIN CONTENT ===== */
        .records-workspace {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            margin-top: 20px;
        }

        .workspace-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(224, 169, 109, 0.2);
        }

        .project-info h2 {
            margin: 0;
            color: #201e20;
        }

        .project-info p {
            margin: 5px 0 0 0;
            color: #666;
        }

        .workspace-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-info {
            background: #17a2b8;
            color: white;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .records-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            font-weight: 600;
            color: #201e20;
        }

        .section-icon {
            font-size: 18px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }

        .empty-state h3 {
            margin-bottom: 10px;
            color: #201e20;
        }

        .demo-content {
            background: rgba(224, 169, 109, 0.1);
            border: 2px dashed rgba(224, 169, 109, 0.3);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }

        .demo-content h3 {
            color: #e0a96d;
            margin-bottom: 10px;
        }

        .demo-content p {
            color: #666;
            margin-bottom: 15px;
        }

        .demo-features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .demo-feature {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .demo-feature h4 {
            color: #201e20;
            margin-bottom: 8px;
        }

        .demo-feature p {
            color: #666;
            font-size: 14px;
        }

        @media (max-width: 768px) {
            .workspace-header {
                flex-direction: column;
                gap: 15px;
                align-items: flex-start;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body data-page="records">

<!-- Header Reveal Zone -->
<div class="header-reveal-zone" id="headerRevealZone"></div>

<!-- Collapsible Header -->
<div class="collapsible-header" id="collapsibleHeader" onmouseenter="showHeader()" onmouseleave="hideHeader()">
    <div class="header-content">
        <div class="logo-section">
            <h1>אפליקציית תמלול</h1>
            <p class="page-subtitle">מאגר הרישומים</p>
        </div>
        
        <?php
        // Build query string for navigation links
        $queryParams = [];
        if ($isDevelopmentMode) $queryParams[] = 'dev=1';
        if ($showDevNav) $queryParams[] = 'devnav=1';
        $queryString = !empty($queryParams) ? '?' . implode('&', $queryParams) : '';
        ?>
        <div class="nav-links">
            <a href="../main/index.php<?php echo $queryString; ?>">דף הבית</a>
            <a href="../transcription/index.php<?php echo $queryString; ?>">תמלול</a>
            <a href="../proofreading/index.php<?php echo $queryString; ?>">הגהה</a>
            <a href="../export/index.php<?php echo $queryString; ?>">ייצוא</a>
            <a href="index.php<?php echo $queryString; ?>" class="active">רישומים</a>
        </div>
        
        <div class="user-info">
            <div class="user-profile">
                <span>שלום <?php echo htmlspecialchars($username); ?></span>
            </div>
            <a href="index.php?logout=1<?php echo $showDevNav ? '&devnav=1' : ''; ?>" class="logout-btn">התנתק</a>
        </div>
    </div>
</div>

<!-- Sidebar Reveal Zone -->
<div class="sidebar-reveal-zone" id="sidebarRevealZone"></div>

<!-- Collapsible Sidebar -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-content">
        <div class="sidebar-section">
            <h3>סטטיסטיקות</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">156</div>
                    <div class="stat-label">סה"כ פרויקטים</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">89</div>
                    <div class="stat-label">הושלמו</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">23</div>
                    <div class="stat-label">בתהליך</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">12</div>
                    <div class="stat-label">ממתינים</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Overlay -->
<div class="overlay" id="overlay"></div>

<div class="records-workspace">
    <!-- Workspace Header -->
    <div class="workspace-header">
        <div class="project-info">
            <h2>מאגר הרישומים</h2>
            <p>צפייה בהיסטוריית פרויקטים וניתוח נתונים</p>
        </div>
        
        <div class="workspace-actions">
            <button class="btn btn-secondary" onclick="exportRecords()">יצא רישומים</button>
            <button class="btn btn-info" onclick="printRecords()">הדפסה</button>
        </div>
    </div>

    <!-- Records Section -->
    <div class="records-section">
        <div class="section-title">
            <div class="section-icon">📊</div>
            רישומי פרויקטים
        </div>
        
        <div class="demo-content">
            <h3>מאגר הרישומים - מצב הדגמה</h3>
            <p>כאן יוצגו כל הפרויקטים שעברו דרך המערכת עם פרטים מלאים על כל שלב בתהליך התמלול</p>
            
            <div class="demo-features">
                <div class="demo-feature">
                    <h4>🔍 חיפוש מתקדם</h4>
                    <p>חיפוש לפי שם פרויקט, לקוח, תאריך או סטטוס</p>
                </div>
                <div class="demo-feature">
                    <h4>📈 דוחות וסטטיסטיקות</h4>
                    <p>ניתוח נתונים מפורט של ביצועים ותפוקות</p>
                </div>
                <div class="demo-feature">
                    <h4>📤 ייצוא נתונים</h4>
                    <p>ייצוא רישומים לפורמטים שונים</p>
                </div>
                <div class="demo-feature">
                    <h4>🗂️ ארכיון מלא</h4>
                    <p>שמירה של כל הפרויקטים לצורך עתידי</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
let headerTimeout = null;
let sidebarTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize collapsible components
    initializeCollapsibleComponents();
});

function initializeCollapsibleComponents() {
    const headerRevealZone = document.getElementById('headerRevealZone');
    const sidebarRevealZone = document.getElementById('sidebarRevealZone');
    const header = document.getElementById('collapsibleHeader');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // Header functionality
    headerRevealZone.addEventListener('mouseenter', showHeader);
    header.addEventListener('mouseenter', showHeader);
    header.addEventListener('mouseleave', hideHeader);
    
    // Sidebar functionality
    sidebarRevealZone.addEventListener('mouseenter', showSidebar);
    sidebar.addEventListener('mouseenter', showSidebar);
    sidebar.addEventListener('mouseleave', hideSidebar);
    
    // Overlay functionality
    overlay.addEventListener('click', hideAll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAll();
        }
    });
}

function showHeader() {
    clearTimeout(headerTimeout);
    const header = document.getElementById('collapsibleHeader');
    header.classList.add('show');
}

function hideHeader() {
    headerTimeout = setTimeout(() => {
        const header = document.getElementById('collapsibleHeader');
        header.classList.remove('show');
    }, 1500);
}

function showSidebar() {
    clearTimeout(sidebarTimeout);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.add('show');
    overlay.classList.add('show');
}

function hideSidebar() {
    sidebarTimeout = setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }, 2000);
}

function hideAll() {
    const header = document.getElementById('collapsibleHeader');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    header.classList.remove('show');
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
    
    clearTimeout(headerTimeout);
    clearTimeout(sidebarTimeout);
}

function exportRecords() {
    alert('ייצוא רישומים - מצב הדגמה');
}

function printRecords() {
    window.print();
}
</script>

</body>
</html>