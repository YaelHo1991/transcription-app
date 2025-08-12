<?php
/*
 * =========================================
 * Transcription Page (Clean Version)
 * pages/transcription/index-clean.php
 * =========================================
 * Minimal and organized transcription interface
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

// Clean up any invalid session ID before starting
if (isset($_COOKIE[session_name()])) {
    $sessionId = $_COOKIE[session_name()];
    // Validate session ID - only alphanumeric, dash, and comma allowed
    if (!preg_match('/^[a-zA-Z0-9,-]+$/', $sessionId)) {
        // Invalid session ID, unset it
        setcookie(session_name(), '', time() - 3600, '/');
        unset($_COOKIE[session_name()]);
    }
}

// Set session save path if not set (common issue on some servers)
if (session_save_path() === '') {
    $tempDir = sys_get_temp_dir();
    if (is_writable($tempDir)) {
        session_save_path($tempDir);
    }
}

// Try to start session with error handling
if (session_status() === PHP_SESSION_NONE) {
    try {
        @session_start();
    } catch (Exception $e) {
        // If session fails, try to regenerate
        session_regenerate_id(true);
        session_start();
    }
}

// Aggressive cache control headers for development (only if headers not sent)
if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
    header('Vary: *');
}

// Version for cache busting - force refresh with timestamp
define('ASSET_VERSION', 'v4_' . time() . '_' . mt_rand(1000, 9999));
define('FORCE_REFRESH', true);

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
    $_SESSION['can_proofread'] = true;
    $_SESSION['can_export'] = true;
    $_SESSION['full_name'] = 'Developer Mode';
}

require_once 'includes/auth-check.php';
require_once 'includes/config.php';
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <script>window.SESSION_USER_ID = <?php echo $_SESSION['user_id'] ?? 1; ?>;</script>
    <script src="local-media-loader.js"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="cache-version" content="<?php echo ASSET_VERSION; ?>">
    <title>ממשק תמלול</title>
    
    <!-- Load all components with single loader -->
    <?php include 'all-components-loader.php'; ?>
    
    <!-- Fix for initial-load.css -->
    <script>
        // Add styles-loaded class immediately
        window.addEventListener('load', function() {
            document.body.classList.add('styles-loaded');
        });
        // Also add on DOM ready as backup
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                document.body.classList.add('styles-loaded');
            }, 100);
        });
    </script>
</head>
<body class="styles-loaded">
    <!-- Header -->
    <?php include 'components/header/header.php'; ?>
    
    <!-- Sidebar -->
    <?php include 'components/sidebar/sidebar.php'; ?>
    
    <!-- Main Content -->
    <div class="main-content" id="mainContent">
        <div class="transcription-workspace">
            <!-- Workspace Header -->
            <?php include 'components/workspace-header/workspace-header.php'; ?>
            
            <div class="workspace-grid">
                <!-- Main Workspace -->
                <div class="main-workspace">
                    <!-- Navigation Bar -->
                    <?php include 'components/navigation/navigation.php'; ?>
                    
                    
                    <!-- Media Player (Stage 12 - Working Version) -->
                    <?php include 'components/media-player/player/media-player.html'; ?>
                    
                    <!-- Settings Modal Container -->
                    <!-- Commented out - using modal from media-player.html instead (Stage 7)
                    <div id="settingsModalContainer">
                        <?php // include 'components/media-player/settings/settings-loader.html'; ?>
                    </div>
                    -->
                    
                    <!-- Text Editor -->
                    <div class="transcription-container">
                        <?php include 'components/text-editor/text-editor-consolidated.php'; ?>
                    </div>
                </div>
                
                <!-- Side Workspace -->
                <div class="side-workspace">
                    <!-- Speakers Component -->
                    <?php include 'components/speakers/index.php'; ?>
                    
                    <!-- Remarks Section -->
                    <?php include 'components/remarks/remarks.php'; ?>
                    
                    <!-- Helper Files -->
                    <?php include 'components/helper-files/helper-files.php'; ?>
                </div>
            </div>
        </div>
    </div>
    
   
</body>
</html>