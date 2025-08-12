<?php
/*
 * =========================================
 * Files Management API
 * api/files.php
 * =========================================
 * Handles file operations (list, delete, get info)
 */

// Check for developer mode
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Use appropriate session namespace
if ($showDevNav) {
    session_name('TRANSCRIPTION_DEV_SESSION');
} else {
    session_name('TRANSCRIPTION_SESSION');
}
session_start();

// Add CORS headers to allow cross-origin requests
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if user is logged in
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
if (!$isDevelopmentMode && (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

// Include database connection
require_once '../common/database.php';

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';
$projectId = $_GET['project_id'] ?? $_POST['project_id'] ?? null;

if (!$projectId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Project ID is required']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=database;dbname=transcription_system;charset=utf8", 'appuser', 'apppassword');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    switch ($action) {
        case 'list':
            listFiles($pdo, $projectId);
            break;
        
        case 'delete':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
                exit;
            }
            deleteFile($pdo, $_POST['file_id'] ?? null);
            break;
        
        case 'info':
            getFileInfo($pdo, $_GET['file_id'] ?? null);
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function listFiles($pdo, $projectId) {
    $category = $_GET['category'] ?? null;
    $files = [];
    
    // Check if it's an independent project
    if (strpos($projectId, 'IND_') === 0) {
        // Handle independent project files from file system
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'User ID not found']);
            return;
        }
        
        $projectPath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/independent/' . $userId . '/' . $projectId;
        $jsonFile = $projectPath . '/project_data.json';
        
        if (file_exists($jsonFile)) {
            $projectData = json_decode(file_get_contents($jsonFile), true);
            if ($projectData && isset($projectData['files'])) {
                // Convert file system structure to match database structure
                foreach ($projectData['files'] as $file) {
                    $fileCategory = $file['type'] ?? 'media';
                    if (!$category || $fileCategory === $category) {
                        $files[] = [
                            'id' => $file['id'] ?? uniqid(),
                            'project_id' => $projectId,
                            'filename' => $file['name'],
                            'file_path' => $file['path'] ?? '/uploads/independent/' . $userId . '/' . $projectId . '/' . $fileCategory . '/' . $file['name'],
                            'file_size' => $file['size'] ?? 0,
                            'category' => $fileCategory,
                            'upload_date' => $file['uploaded_at'] ?? date('Y-m-d H:i:s'),
                            'user_id' => $userId
                        ];
                    }
                }
            }
        }
    } else {
        // Handle database projects
        $query = "SELECT * FROM project_files WHERE project_id = ?";
        $params = [$projectId];
        
        if ($category) {
            $query .= " AND category = ?";
            $params[] = $category;
        }
        
        $query .= " ORDER BY upload_date DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Group files by category
    $groupedFiles = [];
    foreach ($files as $file) {
        $file['file_size_formatted'] = formatBytes($file['file_size']);
        $file['upload_date_formatted'] = date('d/m/Y H:i', strtotime($file['upload_date']));
        
        if (!isset($groupedFiles[$file['category']])) {
            $groupedFiles[$file['category']] = [];
        }
        $groupedFiles[$file['category']][] = $file;
    }
    
    // Calculate statistics
    $stats = [
        'total_files' => count($files),
        'media_files' => count($groupedFiles['media'] ?? []),
        'helper_files' => count($groupedFiles['helper'] ?? []),
        'total_size' => array_sum(array_column($files, 'file_size')),
        'media_duration' => calculateMediaDuration($groupedFiles['media'] ?? [])
    ];
    
    echo json_encode([
        'success' => true,
        'files' => $groupedFiles,
        'stats' => $stats
    ]);
}

function deleteFile($pdo, $fileId) {
    if (!$fileId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File ID is required']);
        return;
    }
    
    // Get file info first
    $stmt = $pdo->prepare("SELECT * FROM project_files WHERE id = ?");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$file) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'File not found']);
        return;
    }
    
    // Delete from database
    $stmt = $pdo->prepare("DELETE FROM project_files WHERE id = ?");
    $stmt->execute([$fileId]);
    
    // Delete physical file
    if (file_exists($file['file_path'])) {
        unlink($file['file_path']);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'File deleted successfully'
    ]);
}

function getFileInfo($pdo, $fileId) {
    if (!$fileId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM project_files WHERE id = ?");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$file) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'File not found']);
        return;
    }
    
    $file['file_size_formatted'] = formatBytes($file['file_size']);
    $file['upload_date_formatted'] = date('d/m/Y H:i', strtotime($file['upload_date']));
    
    echo json_encode([
        'success' => true,
        'file' => $file
    ]);
}

function calculateMediaDuration($mediaFiles) {
    // This is a placeholder - you would need to implement actual duration calculation
    // For now, return a sample duration
    return count($mediaFiles) > 0 ? '01:23:45' : '00:00:00';
}

function formatBytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $bytes > 1024; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>