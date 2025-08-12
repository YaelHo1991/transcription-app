<?php
// Transcription app logout handler
// Preserves devnav parameter when logging out

// Start output buffering to prevent header issues
ob_start();

// Set headers to prevent caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Get devnav parameter
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Clear the appropriate session based on devnav
if ($showDevNav) {
    session_name('TRANSCRIPTION_DEV_SESSION');
} else {
    session_name('TRANSCRIPTION_SESSION');
}
session_start();
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}
session_destroy();

// Ensure all output is flushed
ob_end_clean();

// Redirect to login page with devnav if needed
$redirect = 'login.php';
if ($showDevNav) {
    $redirect .= '?devnav=1';
}

header("Location: " . $redirect);
exit;
?>