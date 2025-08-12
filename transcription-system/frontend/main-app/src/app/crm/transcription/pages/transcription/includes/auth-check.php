<?php
/*
 * Authentication Check
 * includes/auth-check.php
 */

// Check if we're in developer mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Check if user is logged in (skip in development mode)
if (!$isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $loginRedirect = "../main/index.php";
    if ($showDevNav) {
        $loginRedirect .= "?devnav=1";
    }
    // Only redirect if headers haven't been sent
    if (!headers_sent()) {
        header("Location: " . $loginRedirect);
        exit;
    } else {
        // If headers already sent, use JavaScript redirect
        echo "<script>window.location.href = '$loginRedirect';</script>";
        exit;
    }
}

// If in development mode and no session, create dev session
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Developer';
    $_SESSION['permissions'] = 'ABCDEF';
    $_SESSION['transcriber_code'] = 'DEV001';
    $_SESSION['logged_in'] = true;
    $_SESSION['can_transcribe'] = true;
    $_SESSION['full_name'] = 'Developer Mode';
}

// Check permission for transcription (D) - skip in development mode
if (!$isDevelopmentMode && (!isset($_SESSION['can_transcribe']) || !$_SESSION['can_transcribe'])) {
    $_SESSION['access_error'] = "אין לך הרשאה לגשת לעמוד התמלול";
    header("Location: ../main/index.php");
    exit;
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    $logoutRedirect = "../../login.php";
    if ($showDevNav) {
        $logoutRedirect .= "?devnav=1";
    }
    header("Location: " . $logoutRedirect);
    exit;
}

// User info
$username = $_SESSION['username'] ?? 'משתמש';
$fullName = $_SESSION['full_name'] ?? $username;