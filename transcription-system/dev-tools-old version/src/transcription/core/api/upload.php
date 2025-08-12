<?php
/*
 * =========================================
 * File Upload API
 * api/upload.php
 * =========================================
 * Handles file uploads for media and helper files
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
header('Content-Type: application/json');

// Check if user is logged in
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
if (!$isDevelopmentMode && (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

// Include database connection
require_once '../common/database.php';

// Configuration
$uploadDir = '../uploads/';
$maxFileSize = 100 * 1024 * 1024; // 100MB
$allowedTypes = [
    'media' => ['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/avi', 'video/mov'],
    'helper' => ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
];

// Create upload directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Get request data
$projectId = $_POST['project_id'] ?? null;
$fileType = $_POST['file_type'] ?? 'media'; // 'media' or 'helper'
$uploadedFiles = $_FILES['files'] ?? null;

// Validate inputs
if (!$projectId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Project ID is required']);
    exit;
}

if (!$uploadedFiles || !isset($uploadedFiles['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No files uploaded']);
    exit;
}

// Handle multiple files
$fileCount = is_array($uploadedFiles['name']) ? count($uploadedFiles['name']) : 1;
$results = [];
$errors = [];

for ($i = 0; $i < $fileCount; $i++) {
    $fileName = is_array($uploadedFiles['name']) ? $uploadedFiles['name'][$i] : $uploadedFiles['name'];
    $fileTmpName = is_array($uploadedFiles['tmp_name']) ? $uploadedFiles['tmp_name'][$i] : $uploadedFiles['tmp_name'];
    $fileSize = is_array($uploadedFiles['size']) ? $uploadedFiles['size'][$i] : $uploadedFiles['size'];
    $fileError = is_array($uploadedFiles['error']) ? $uploadedFiles['error'][$i] : $uploadedFiles['error'];
    $fileMimeType = is_array($uploadedFiles['type']) ? $uploadedFiles['type'][$i] : $uploadedFiles['type'];

    // Check for upload errors
    if ($fileError !== UPLOAD_ERR_OK) {
        $errors[] = "Upload error for file {$fileName}: " . getUploadErrorMessage($fileError);
        continue;
    }

    // Validate file size
    if ($fileSize > $maxFileSize) {
        $errors[] = "File {$fileName} is too large. Maximum size is " . formatBytes($maxFileSize);
        continue;
    }

    // Validate file type
    if (!in_array($fileMimeType, $allowedTypes[$fileType])) {
        $errors[] = "File {$fileName} has invalid type. Allowed types: " . implode(', ', $allowedTypes[$fileType]);
        continue;
    }

    // Generate safe filename
    $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
    $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($fileName, PATHINFO_FILENAME));
    $uniqueFileName = $safeFileName . '_' . time() . '_' . uniqid() . '.' . $fileExtension;
    
    // Create project directory
    $projectDir = $uploadDir . $projectId . '/';
    if (!is_dir($projectDir)) {
        mkdir($projectDir, 0755, true);
    }

    // Create file type directory
    $typeDir = $projectDir . $fileType . '/';
    if (!is_dir($typeDir)) {
        mkdir($typeDir, 0755, true);
    }

    $filePath = $typeDir . $uniqueFileName;

    // Move uploaded file
    if (move_uploaded_file($fileTmpName, $filePath)) {
        // Get file info
        $fileInfo = [
            'original_name' => $fileName,
            'filename' => $uniqueFileName,
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'file_type' => $fileMimeType,
            'upload_date' => date('Y-m-d H:i:s')
        ];

        // Save to database
        try {
            $pdo = new PDO("mysql:host=database;dbname=transcription_system;charset=utf8", 'appuser', 'apppassword');
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $stmt = $pdo->prepare("
                INSERT INTO project_files (project_id, original_name, filename, file_path, file_size, file_type, category, upload_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $projectId,
                $fileName,
                $uniqueFileName,
                $filePath,
                $fileSize,
                $fileMimeType,
                $fileType,
                $fileInfo['upload_date']
            ]);

            $fileInfo['id'] = $pdo->lastInsertId();
            $results[] = $fileInfo;
            
        } catch (PDOException $e) {
            $errors[] = "Database error for file {$fileName}: " . $e->getMessage();
            // Clean up uploaded file if database fails
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
    } else {
        $errors[] = "Failed to move uploaded file {$fileName}";
    }
}

// Return response
if (!empty($results)) {
    echo json_encode([
        'success' => true,
        'files' => $results,
        'errors' => $errors
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'errors' => $errors
    ]);
}

// Helper functions
function getUploadErrorMessage($error) {
    switch ($error) {
        case UPLOAD_ERR_INI_SIZE:
            return 'File exceeds upload_max_filesize';
        case UPLOAD_ERR_FORM_SIZE:
            return 'File exceeds MAX_FILE_SIZE';
        case UPLOAD_ERR_PARTIAL:
            return 'File was only partially uploaded';
        case UPLOAD_ERR_NO_FILE:
            return 'No file was uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'File upload stopped by extension';
        default:
            return 'Unknown upload error';
    }
}

function formatBytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $bytes > 1024; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>