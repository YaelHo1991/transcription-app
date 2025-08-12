<?php
// This file ensures a clean logout from developer mode before accessing Transcription from main page

// Start output buffering to prevent header issues
ob_start();

// Check if we're in developer mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Clear Transcription session
session_name('TRANSCRIPTION_SESSION');
session_start();
session_unset();
session_destroy();
setcookie(session_name(), '', time()-3600, '/');

// Also clear CRM session in case
session_name('CRM_SESSION');
session_start();
session_unset();
session_destroy();
setcookie(session_name(), '', time()-3600, '/');

// Clear any cookies that might contain dev parameters
setcookie('PHPSESSID', '', time()-3600, '/');

// Force clear all session data
$_SESSION = array();

// Redirect to Transcription login page with proper parameters
$redirectUrl = "transcription/pages/main/index.php?force_login=1";

// Add dev parameters if they exist
if ($isDevelopmentMode) {
    $redirectUrl .= "&dev=1";
}
if ($showDevNav) {
    $redirectUrl .= "&devnav=1";
}

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Location: $redirectUrl");
exit;
?>