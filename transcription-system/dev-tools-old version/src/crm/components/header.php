<?php
// Development mode check
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';

// Include developer navigation if needed (after setting our variables)
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

// Check if session is not already started
if (session_status() == PHP_SESSION_NONE) {
    session_name('CRM_SESSION');
    session_start();
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

// Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: " . preserveDevParams("../index.php"));
    exit;
}

$userPermissions = $_SESSION['permissions'];
$hasA = strpos($userPermissions, 'A') !== false; // Client management
$hasB = strpos($userPermissions, 'B') !== false; // Project management  
$hasC = strpos($userPermissions, 'C') !== false; // Transcriber management
?>
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? $pageTitle : 'מערכת CRM'; ?></title>
    <link rel="stylesheet" href="../assets/css/crm.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏢 <?php echo isset($pageTitle) ? $pageTitle : 'מערכת CRM למתמלל'; ?></h1>
            <div class="user-info">
                <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
                <div class="user-avatar"><?php echo mb_strtoupper(mb_substr($_SESSION['full_name'] ?? $_SESSION['username'], 0, 1)); ?></div>
            </div>
        </div>

        <!-- Navigation -->
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