<?php
header('Content-Type: application/json');

// Only allow in development mode
session_start();
if (!isset($_SESSION['is_admin']) && !isset($_GET['dev'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$service = $_GET['service'] ?? 'database';

if ($service === 'database') {
    try {
        $pdo = new PDO("mysql:host=database;dbname=transcription_system;charset=utf8", 'appuser', 'apppassword');
        echo json_encode(['success' => true, 'message' => 'Database connection successful']);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unknown service']);
}
?>