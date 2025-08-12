<?php
// Start output buffering to prevent header issues
ob_start();

// Set headers to prevent caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Clear CRM session
session_name('CRM_SESSION');
session_start();
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}
session_destroy();

// Clear Transcription session
session_name('TRANSCRIPTION_SESSION');
session_start();
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}
session_destroy();

// Clear Transcription DEV session
session_name('TRANSCRIPTION_DEV_SESSION');
session_start();
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}
session_destroy();

// Clear default session
session_name('PHPSESSID');
session_start();
$_SESSION = array();
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}
session_destroy();

// Get the redirect URL
$redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '/src/developer-tools/development.php';

// Ensure all output is flushed
ob_end_clean();

// Force additional cache clearing
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Small delay to ensure session clearing takes effect
usleep(100000); // 0.1 seconds

// Redirect to the requested page
header("Location: " . $redirect);
exit;
?>