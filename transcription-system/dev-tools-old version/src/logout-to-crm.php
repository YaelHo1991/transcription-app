<?php
// This file ensures a clean logout from developer mode before accessing CRM from main page

// Start output buffering to prevent header issues
ob_start();

// Check if we're in developer mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Clear CRM session
session_name('CRM_SESSION');
session_start();
session_unset();
session_destroy();
setcookie(session_name(), '', time()-3600, '/');

// Start new clean session to ensure no dev mode
session_name('CRM_SESSION');
session_start();
session_destroy();

// Clear any cookies that might contain dev parameters
setcookie('PHPSESSID', '', time()-3600, '/');

// Force clear all session data
$_SESSION = array();

// Redirect to CRM login page with proper parameters
$redirectUrl = "crm/index.php?force_login=1";

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