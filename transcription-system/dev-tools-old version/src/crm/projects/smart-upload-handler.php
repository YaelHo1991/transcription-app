<?php
/**
 * Smart Upload Handler for Project Files
 * Handles both chunked and regular uploads with project integration
 */

session_name('CRM_SESSION');
session_start();

// Enable detailed error reporting for debugging
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set PHP configuration for large file uploads
ini_set('upload_max_filesize', '5368709120'); // 5GB
ini_set('post_max_size', '5368709120'); // 5GB
ini_set('max_execution_time', '3600'); // 1 hour
ini_set('memory_limit', '2147483648'); // 2GB

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Configuration
$maxChunkSize = 10 * 1024 * 1024; // 10MB chunks
$tempDir = '../../uploads/temp/';
$projectsDir = '../../uploads/';

// Ensure directories exist
if (!file_exists($tempDir)) {
    mkdir($tempDir, 0777, true);
}

// Clean filename function
function cleanFilename($filename) {
    $filename = str_replace(' ', '_', $filename);
    $filename = preg_replace('/[<>:\"\/\\\|?*]/', '', $filename);
    $filename = preg_replace('/[^\x20-\x7E\x{0590}-\x{05FF}._-]/u', '', $filename);
    $filename = preg_replace('/_+/', '_', $filename);
    $filename = trim($filename, '_');
    
    if (empty($filename)) {
        $filename = 'file_' . time();
    }
    
    return $filename;
}

// Handle different request types
$requestType = $_REQUEST['action'] ?? 'upload';

// For upload action, we'll use session-based temp storage
// Authentication will be checked when files are moved to projects
$isUploadAction = ($requestType === 'upload');

if (!$isUploadAction && !isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit;
}

switch ($requestType) {
    case 'upload':
        handleFileUpload();
        break;
    case 'complete':
        handleUploadComplete();
        break;
    case 'status':
        handleStatusCheck();
        break;
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
}

function handleFileUpload() {
    global $tempDir, $maxChunkSize;
    
    // Ensure we have a session for temporary file storage
    if (session_id() === '') {
        session_name('CRM_SESSION');
        session_start();
    }
    
    // Get parameters
    $fileName = isset($_REQUEST["name"]) ? $_REQUEST["name"] : '';
    $chunk = isset($_REQUEST["chunk"]) ? intval($_REQUEST["chunk"]) : 0;
    $chunks = isset($_REQUEST["chunks"]) ? intval($_REQUEST["chunks"]) : 0;
    $projectId = isset($_REQUEST["project_id"]) ? intval($_REQUEST["project_id"]) : null;
    
    // Validate filename
    if (empty($fileName)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Filename is required']);
        return;
    }
    
    // Clean the fileName for security
    $cleanedFileName = cleanFilename($fileName);
    $sessionId = session_id();
    $uniqueFileName = $sessionId . '_' . $cleanedFileName;
    
    // Create unique filename for chunked uploads to avoid conflicts
    if ($chunks > 1) {
        $filePath = $tempDir . $uniqueFileName;
    } else {
        // For single file uploads, ensure uniqueness
        $filePath = $tempDir . $uniqueFileName;
        $counter = 1;
        while (file_exists($filePath) && $counter < 1000) {
            $pathInfo = pathinfo($uniqueFileName);
            $newName = $pathInfo['filename'] . '_' . $counter . '.' . $pathInfo['extension'];
            $filePath = $tempDir . $newName;
            $counter++;
        }
    }
    
    // Handle file upload
    if (!empty($_FILES)) {
        $uploadedFile = $_FILES["file"];
        
        if ($uploadedFile["error"] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Upload error: ' . $uploadedFile["error"]
            ]);
            return;
        }
        
        // Open temp file for writing
        $mode = ($chunks > 1 && $chunk > 0) ? "ab" : "wb";
        $out = @fopen($filePath . ".part", $mode);
        
        if (!$out) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to open output stream']);
            return;
        }
        
        // Read uploaded file
        $in = @fopen($uploadedFile["tmp_name"], "rb");
        if (!$in) {
            fclose($out);
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to open input stream']);
            return;
        }
        
        // Copy data
        while ($buffer = fread($in, 4096)) {
            fwrite($out, $buffer);
        }
        
        fclose($out);
        fclose($in);
        
        // Check if upload is complete
        if (!$chunks || $chunk == $chunks - 1) {
            // Move completed file
            if (rename($filePath . ".part", $filePath)) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Upload completed',
                    'fileName' => $cleanedFileName,
                    'tempPath' => $filePath,
                    'fileId' => $uniqueFileName
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Failed to finalize file']);
            }
        } else {
            // Chunk uploaded successfully
            echo json_encode([
                'status' => 'success',
                'message' => 'Chunk uploaded',
                'chunk' => $chunk + 1,
                'totalChunks' => $chunks
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No file uploaded']);
    }
}

function handleUploadComplete() {
    global $pdo, $tempDir, $projectsDir;
    
    $fileId = $_POST['fileId'] ?? '';
    $projectId = $_POST['projectId'] ?? '';
    $fileCategory = $_POST['fileCategory'] ?? 'media';
    
    if (empty($fileId) || empty($projectId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
        return;
    }
    
    // Get user's company
    $companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
    $companyStmt->execute([$_SESSION['user_id']]);
    $company = $companyStmt->fetch();
    
    if (!$company) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'No company found']);
        return;
    }
    
    // Verify project ownership
    $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
    $projectStmt->execute([$projectId, $company['id']]);
    $project = $projectStmt->fetch();
    
    if (!$project) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Project not found or access denied']);
        return;
    }
    
    // Move file from temp to project folder
    $tempFilePath = $tempDir . $fileId;
    if (!file_exists($tempFilePath)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Temp file not found']);
        return;
    }
    
    // Extract original filename
    $originalFileName = preg_replace('/^[^_]+_/', '', $fileId);
    $finalPath = $project['folder_path'] . '/' . $originalFileName;
    
    // Ensure project folder exists
    if (!file_exists($project['folder_path'])) {
        mkdir($project['folder_path'], 0777, true);
    }
    
    // Move file
    if (rename($tempFilePath, $finalPath)) {
        // Add to database
        $fileStmt = $pdo->prepare("INSERT INTO project_files (project_id, filename, file_path, file_type, file_category) VALUES (?, ?, ?, ?, ?)");
        $mimeType = mime_content_type($finalPath);
        $fileStmt->execute([$projectId, $originalFileName, $finalPath, $mimeType, $fileCategory]);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'File moved to project successfully',
            'fileName' => $originalFileName,
            'projectPath' => $finalPath
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to move file to project']);
    }
}

function handleStatusCheck() {
    global $tempDir;
    
    $fileId = $_GET['fileId'] ?? '';
    if (empty($fileId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'File ID required']);
        return;
    }
    
    $tempFilePath = $tempDir . $fileId;
    if (file_exists($tempFilePath)) {
        echo json_encode([
            'status' => 'success',
            'exists' => true,
            'size' => filesize($tempFilePath)
        ]);
    } else {
        echo json_encode([
            'status' => 'success',
            'exists' => false
        ]);
    }
}
?>