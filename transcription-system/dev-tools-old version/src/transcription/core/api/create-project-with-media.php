<?php
/*
 * =========================================
 * Create Project with Media Upload API
 * api/create-project-with-media.php
 * =========================================
 * Creates a new project and uploads media files in one operation
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
$allowedMediaTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/x-mpeg', 'video/mp4', 'video/avi', 'video/mov'];

// Create upload directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Get request data
$projectName = $_POST['project_name'] ?? null;
$companyId = $_POST['company_id'] ?? null;
$uploadedFiles = $_FILES['files'] ?? null;

// Get user ID
$userId = $isDevelopmentMode ? 1 : ($_SESSION['user_id'] ?? null);

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'User ID not found']);
    exit;
}

// Validate inputs
if (!$uploadedFiles || !isset($uploadedFiles['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No files uploaded']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=database;dbname=transcription_system;charset=utf8", 'appuser', 'apppassword');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Begin transaction
    $pdo->beginTransaction();
    
    // Generate project name if not provided
    if (!$projectName) {
        // Use first file name as project name
        $firstFileName = is_array($uploadedFiles['name']) ? $uploadedFiles['name'][0] : $uploadedFiles['name'];
        $projectName = pathinfo($firstFileName, PATHINFO_FILENAME);
    }
    
    // Create project
    $stmt = $pdo->prepare("
        INSERT INTO projects (name, company_id, created_by, created_at, status) 
        VALUES (?, ?, ?, NOW(), 'active')
    ");
    $stmt->execute([$projectName, $companyId, $userId]);
    $projectId = $pdo->lastInsertId();
    
    // Process uploaded files
    $uploadedCount = 0;
    $errors = [];
    
    // Handle multiple files
    $fileCount = is_array($uploadedFiles['name']) ? count($uploadedFiles['name']) : 1;
    
    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = is_array($uploadedFiles['name']) ? $uploadedFiles['name'][$i] : $uploadedFiles['name'];
        $fileTmpName = is_array($uploadedFiles['tmp_name']) ? $uploadedFiles['tmp_name'][$i] : $uploadedFiles['tmp_name'];
        $fileSize = is_array($uploadedFiles['size']) ? $uploadedFiles['size'][$i] : $uploadedFiles['size'];
        $fileType = is_array($uploadedFiles['type']) ? $uploadedFiles['type'][$i] : $uploadedFiles['type'];
        $fileError = is_array($uploadedFiles['error']) ? $uploadedFiles['error'][$i] : $uploadedFiles['error'];
        
        // Skip if no file
        if ($fileError === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        
        // Check for upload errors
        if ($fileError !== UPLOAD_ERR_OK) {
            $errors[] = "Error uploading $fileName";
            continue;
        }
        
        // Validate file size
        if ($fileSize > $maxFileSize) {
            $errors[] = "$fileName exceeds maximum file size";
            continue;
        }
        
        // Validate file type
        if (!in_array($fileType, $allowedMediaTypes)) {
            // Try to detect file type by extension
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $extToMime = [
                'mp3' => 'audio/mpeg',
                'wav' => 'audio/wav',
                'mp4' => 'video/mp4',
                'avi' => 'video/avi',
                'mov' => 'video/mov'
            ];
            
            if (!isset($extToMime[$ext])) {
                $errors[] = "$fileName is not a supported media file type";
                continue;
            }
            $fileType = $extToMime[$ext];
        }
        
        // Generate unique filename
        $uniqueFileName = uniqid() . '_' . $fileName;
        $uploadPath = $uploadDir . $uniqueFileName;
        
        // Move uploaded file
        if (move_uploaded_file($fileTmpName, $uploadPath)) {
            // Save to database
            $stmt = $pdo->prepare("
                INSERT INTO project_files (
                    project_id, file_type, original_name, file_path, 
                    file_size, mime_type, uploaded_by, uploaded_at
                ) VALUES (?, 'media', ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $projectId,
                $fileName,
                $uploadPath,
                $fileSize,
                $fileType,
                $userId
            ]);
            
            $uploadedCount++;
        } else {
            $errors[] = "Failed to save $fileName";
        }
    }
    
    // Check if any files were uploaded successfully
    if ($uploadedCount === 0) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No files were uploaded successfully',
            'errors' => $errors
        ]);
        exit;
    }
    
    // Commit transaction
    $pdo->commit();
    
    // Return success response
    echo json_encode([
        'success' => true,
        'project_id' => $projectId,
        'project_name' => $projectName,
        'files_uploaded' => $uploadedCount,
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}