<?php
/*
 * =========================================
 * Upload Handler for Independent Projects
 * components/independent-projects/upload-handler.php
 * =========================================
 * Handles file uploads for independent projects
 */

// Start session with correct namespace
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';
if ($showDevNav) {
    session_name('TRANSCRIPTION_DEV_SESSION');
} else {
    session_name('TRANSCRIPTION_SESSION');
}
session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

// Set response headers
header('Content-Type: application/json');

// Include functions
require_once __DIR__ . '/functions.php';

// Validate request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

// Get project ID
$projectId = $_POST['project_id'] ?? null;
if (!$projectId) {
    echo json_encode(['success' => false, 'error' => 'Project ID is required']);
    exit;
}

// Verify project ownership
$independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent/' . $_SESSION['user_id'];
$projectPath = $independentPath . '/' . $projectId;
$jsonFile = $projectPath . '/project_data.json';

if (!file_exists($jsonFile)) {
    echo json_encode(['success' => false, 'error' => 'Project not found']);
    exit;
}

$projectData = json_decode(file_get_contents($jsonFile), true);
if ($projectData['user_id'] != $_SESSION['user_id']) {
    echo json_encode(['success' => false, 'error' => 'Access denied']);
    exit;
}

// Check if files were uploaded
if (!isset($_FILES['files']) || empty($_FILES['files']['name'][0])) {
    echo json_encode(['success' => false, 'error' => 'No files uploaded']);
    exit;
}

// Process uploaded files
$uploadedFiles = [];
$errors = [];

// Define allowed extensions by category
$allowedExtensions = [
    'media' => ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'mp4', 'avi', 'mov', 'webm', 'mkv', 'wmv'],
    'transcription' => ['txt', 'doc', 'docx', 'rtf', 'odt'],
    'helper' => ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp']
];

// Get all allowed extensions
$allAllowed = array_merge(...array_values($allowedExtensions));

// Process each uploaded file
$fileCount = count($_FILES['files']['name']);
for ($i = 0; $i < $fileCount; $i++) {
    // Skip empty entries
    if (empty($_FILES['files']['name'][$i])) {
        continue;
    }
    
    $fileName = $_FILES['files']['name'][$i];
    $fileTmpName = $_FILES['files']['tmp_name'][$i];
    $fileSize = $_FILES['files']['size'][$i];
    $fileError = $_FILES['files']['error'][$i];
    
    // Check for upload errors
    if ($fileError !== UPLOAD_ERR_OK) {
        $errors[] = "Error uploading $fileName: " . getUploadErrorMessage($fileError);
        continue;
    }
    
    // Get file extension
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    // Check if extension is allowed
    if (!in_array($extension, $allAllowed)) {
        $errors[] = "$fileName: File type not allowed";
        continue;
    }
    
    // Determine file category
    $category = 'helper_files';
    foreach ($allowedExtensions as $cat => $exts) {
        if (in_array($extension, $exts)) {
            $category = $cat;
            break;
        }
    }
    
    // Create safe filename
    $safeFileName = time() . '_' . rand(1000, 9999) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
    
    // Determine target directory
    $targetDir = $projectPath . '/' . $category;
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }
    
    $targetPath = $targetDir . '/' . $safeFileName;
    
    // Move uploaded file
    if (move_uploaded_file($fileTmpName, $targetPath)) {
        $fileInfo = [
            'original_name' => $fileName,
            'saved_name' => $safeFileName,
            'size' => $fileSize,
            'extension' => $extension,
            'category' => $category,
            'path' => $targetPath,
            'uploaded_at' => date('Y-m-d H:i:s')
        ];
        
        $uploadedFiles[] = $fileInfo;
        
        // Update project data
        $categoryKey = $category . '_files';
        if (!isset($projectData[$categoryKey])) {
            $projectData[$categoryKey] = [];
        }
        $projectData[$categoryKey][] = $fileInfo;
        
        // Also add to general files array
        if (!isset($projectData['files'])) {
            $projectData['files'] = [];
        }
        $projectData['files'][] = $fileInfo;
        
    } else {
        $errors[] = "Failed to save $fileName";
    }
}

// Save updated project data
if (!empty($uploadedFiles)) {
    $projectData['updated_at'] = date('Y-m-d H:i:s');
    file_put_contents($jsonFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Return response
echo json_encode([
    'success' => true,
    'uploaded' => $uploadedFiles,
    'errors' => $errors,
    'message' => count($uploadedFiles) . ' files uploaded successfully'
]);

// Helper function for upload error messages
function getUploadErrorMessage($errorCode) {
    switch ($errorCode) {
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
            return 'Upload stopped by extension';
        default:
            return 'Unknown upload error';
    }
}
?>