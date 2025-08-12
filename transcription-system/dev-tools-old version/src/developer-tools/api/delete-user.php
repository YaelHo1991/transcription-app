<?php
header('Content-Type: application/json');

// Only allow in development mode
session_start();
if (!isset($_SESSION['is_admin']) && !isset($_GET['dev'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? null;
    
    if (!$userId) {
        throw new Exception('User ID is required');
    }
    
    // Don't allow deleting admin user
    $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if ($user && $user['username'] === 'admin') {
        throw new Exception('Cannot delete admin user');
    }
    
    // Begin transaction
    $pdo->beginTransaction();
    
    // Delete from related tables first
    $stmt = $pdo->prepare("DELETE FROM transcribers WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    $stmt = $pdo->prepare("DELETE FROM clients WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    $stmt = $pdo->prepare("DELETE FROM projects WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    // Delete from companies if exists
    try {
        $stmt = $pdo->prepare("DELETE FROM companies WHERE user_id = ?");
        $stmt->execute([$userId]);
    } catch (Exception $e) {
        // Table might not exist
    }
    
    // Finally delete the user
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>