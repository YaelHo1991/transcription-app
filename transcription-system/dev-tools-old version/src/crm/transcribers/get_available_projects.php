<?php
session_name('CRM_SESSION');
session_start();

header('Content-Type: application/json');

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    echo json_encode(['error' => 'Company not found']);
    exit;
}

$workType = $_POST['work_type'] ?? '';

// Get available projects based on work type
$projects = [];
try {
    switch ($workType) {
        case 'transcription':
            $sql = "SELECT id, title, description FROM projects 
                    WHERE company_id = ? AND assigned_transcriber_id IS NULL 
                    AND status = 'pending' 
                    ORDER BY created_at ASC LIMIT 10";
            break;
            
        case 'proofreading':
            $sql = "SELECT id, title, description FROM projects 
                    WHERE company_id = ? AND assigned_proofreader_id IS NULL 
                    AND (workflow_status = 'ready_for_proofreading' OR 
                         (assigned_transcriber_id IS NOT NULL AND workflow_status != 'pending'))
                    ORDER BY created_at ASC LIMIT 10";
            break;
            
        case 'export':
            $sql = "SELECT id, title, description FROM projects 
                    WHERE company_id = ? AND assigned_exporter_id IS NULL 
                    AND workflow_status = 'ready_for_export'
                    ORDER BY created_at ASC LIMIT 10";
            break;
            
        default:
            echo json_encode(['error' => 'Invalid work type']);
            exit;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$company['id']]);
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($projects);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Failed to fetch projects: ' . $e->getMessage()]);
}
?>
