<?php
/*
 * =========================================
 * Transcription System - Shared Header
 * common/header.php
 * =========================================
 * Unified header and navigation for all pages
 */

// Get current user info
$currentUser = getCurrentUser();
$userPermissions = getUserPermissions();

// Get current page for navigation highlighting
$currentPage = basename($_SERVER['PHP_SELF']);
$currentDir = basename(dirname($_SERVER['PHP_SELF']));

// Get transcriber info if available
$transcriber = null;
if ($currentUser) {
    $transcriber = getUserTranscriberInfo($pdo, $currentUser['id']);
}

// Handle logout
if (isset($_GET['logout'])) {
    logoutUser();
    header("Location: ../main/index.php");
    exit;
}
?>

<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle ?? 'אפליקציית תמלול'; ?></title>
    
    <!-- Main CSS -->
    <link rel="stylesheet" href="../assets/css/styles.css">
    
    <!-- Page-specific CSS -->
    <?php if (isset($additionalCSS)): ?>
        <?php foreach ($additionalCSS as $cssFile): ?>
            <link rel="stylesheet" href="<?php echo $cssFile; ?>">
        <?php endforeach; ?>
    <?php endif; ?>
    
    <!-- Collapsible Components JavaScript -->
    <script src="../assets/js/collapsible.js"></script>
</head>
<body data-page="<?php echo isset($pageType) ? $pageType : 'dashboard'; ?>">

<!-- Header Reveal Zone -->
<div class="header-reveal-zone" id="headerRevealZone"></div>

<!-- Collapsible Header -->
<div class="collapsible-header" id="collapsibleHeader">
    <div class="header-content">
        <div class="logo-section">
            <h1>אפליקציית תמלול</h1>
            <?php if (isset($pageSubtitle)): ?>
                <p class="page-subtitle"><?php echo $pageSubtitle; ?></p>
            <?php endif; ?>
        </div>
        
        <div class="nav-links">
                <a href="../main/index.php" class="<?php echo ($currentDir == 'main' && $currentPage == 'index.php') ? 'active' : ''; ?>">
                    דף הבית
                </a>
                
                <?php if (hasPermission('D')): ?>
                    <a href="../transcription/index.php" class="<?php echo ($currentDir == 'transcription') ? 'active' : ''; ?>">
                        תמלול
                    </a>
                <?php endif; ?>
                
                <?php if (hasPermission('E')): ?>
                    <a href="../proofreading/index.php" class="<?php echo ($currentDir == 'proofreading') ? 'active' : ''; ?>">
                        הגהה
                    </a>
                <?php endif; ?>
                
                <?php if (hasPermission('F')): ?>
                    <a href="../export/index.php" class="<?php echo ($currentDir == 'export') ? 'active' : ''; ?>">
                        ייצוא
                    </a>
                <?php endif; ?>
                
                <a href="../records/index.php" class="<?php echo ($currentDir == 'records') ? 'active' : ''; ?>">
                    רישומים
                </a>
        </div>
        
        <div class="user-info">
            <div class="user-profile">
                <span>שלום <?php echo htmlspecialchars($currentUser['username']); ?></span>
                <?php if ($transcriber): ?>
                    <span style="margin-right: 15px; opacity: 0.8;">
                        קוד: <?php echo htmlspecialchars($transcriber['transcriber_code']); ?>
                    </span>
                <?php endif; ?>
            </div>
            <a href="?logout=1" class="logout-btn">התנתק</a>
        </div>
    </div>
</div>

<!-- Sidebar Reveal Zone -->
<div class="sidebar-reveal-zone" id="sidebarRevealZone"></div>

<!-- Collapsible Sidebar -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-content">
        <div class="sidebar-section">
            <h3>ניווט מהיר</h3>
            <div class="sidebar-links">
                <a href="../main/index.php">דף הבית</a>
                <?php if (hasPermission('D')): ?>
                    <a href="../transcription/index.php">תמלול</a>
                <?php endif; ?>
                <?php if (hasPermission('E')): ?>
                    <a href="../proofreading/index.php">הגהה</a>
                <?php endif; ?>
                <?php if (hasPermission('F')): ?>
                    <a href="../export/index.php">ייצוא</a>
                <?php endif; ?>
                <a href="../records/index.php">רישומים</a>
            </div>
        </div>
    </div>
</div>

<!-- Overlay -->
<div class="overlay" id="overlay"></div>

    <!-- Main Content Container -->
    <div class="container">
        <!-- Messages -->
        <?php if (isset($_SESSION['message'])): ?>
            <div class="message <?php echo $_SESSION['message_type'] ?? 'success'; ?>">
                <?php echo $_SESSION['message']; ?>
                <?php unset($_SESSION['message'], $_SESSION['message_type']); ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($_GET['error'])): ?>
            <div class="message error">
                <?php
                switch ($_GET['error']) {
                    case 'no_permission':
                        echo "אין לך הרשאה לגשת לעמוד זה";
                        break;
                    case 'project_not_found':
                        echo "הפרויקט לא נמצא או שאין לך הרשאה לגשת אליו";
                        break;
                    default:
                        echo "שגיאה לא ידועה";
                }
                ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($_GET['success'])): ?>
            <div class="message success">
                <?php
                switch ($_GET['success']) {
                    case 'saved':
                        echo "הנתונים נשמרו בהצלחה";
                        break;
                    case 'completed':
                        echo "הפעולה הושלמה בהצלחה";
                        break;
                    default:
                        echo "הפעולה בוצעה בהצלחה";
                }
                ?>
            </div>
        <?php endif; ?>

        <!-- Page Content -->
        <main class="main-content">
            <?php
            // Show user permissions for debugging (remove in production)
            if (isset($_GET['debug']) && $_GET['debug'] == '1'):
            ?>
                <div class="debug-info" style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px;">
                    <strong>Debug Info:</strong><br>
                    User ID: <?php echo $currentUser['id']; ?><br>
                    Username: <?php echo $currentUser['username']; ?><br>
                    Permissions: <?php echo $currentUser['permissions']; ?><br>
                    Permission Names: <?php echo implode(', ', getUserPermissionNames($currentUser['permissions'])); ?><br>
                    Current Page: <?php echo $currentPage; ?><br>
                    Current Directory: <?php echo $currentDir; ?><br>
                    CRM Connected: <?php echo isConnectedToCRM($pdo, $currentUser['id']) ? 'Yes' : 'No'; ?>
                </div>
            <?php endif; ?>