<?php
// Development mode check
if (!isset($_GET['dev']) || $_GET['dev'] !== '1') {
    die('Access denied');
}

// Clear all session data
session_start();
session_destroy();

// Clear session files
$sessionPath = session_save_path();
if ($sessionPath && is_dir($sessionPath)) {
    $files = glob($sessionPath . '/sess_*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

echo "All sessions cleared successfully";
?>