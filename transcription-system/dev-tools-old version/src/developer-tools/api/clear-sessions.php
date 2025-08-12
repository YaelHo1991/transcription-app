<?php
header('Content-Type: application/json');

// Only allow in development mode
session_start();
if (!isset($_SESSION['is_admin']) && !isset($_GET['dev'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

try {
    // Get session save path
    $sessionPath = session_save_path();
    if (empty($sessionPath)) {
        $sessionPath = sys_get_temp_dir();
    }
    
    // Clear all session files
    $sessionFiles = glob($sessionPath . '/sess_*');
    $count = 0;
    
    foreach ($sessionFiles as $file) {
        if (is_file($file)) {
            // Don't delete current session
            if (basename($file) !== 'sess_' . session_id()) {
                unlink($file);
                $count++;
            }
        }
    }
    
    echo json_encode([
        'success' => true, 
        'message' => "Cleared $count session(s)",
        'sessionPath' => $sessionPath
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>