<?php
/*
 * =========================================
 * Projects Management API
 * api/projects.php
 * =========================================
 * Handles project operations (create, list, update, delete)
 */

// Check for developer mode before starting session
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
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

try {
    $pdo = new PDO("mysql:host=database;dbname=transcription_system;charset=utf8", 'appuser', 'apppassword');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    switch ($action) {
        case 'create':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
                exit;
            }
            createProject($pdo);
            break;
        
        case 'list':
            listProjects($pdo);
            break;
        
        case 'get':
            getProject($pdo, $_GET['project_id'] ?? null);
            break;
        
        case 'update':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
                exit;
            }
            updateProject($pdo);
            break;
        
        case 'delete':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method not allowed']);
                exit;
            }
            deleteProject($pdo, $_POST['project_id'] ?? null);
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

function createProject($pdo) {
    // Handle both POST form data and JSON input
    $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        // JSON input
        $data = json_decode(file_get_contents('php://input'), true);
        $workType = $data['work_type'] ?? 'transcription';
        $customTitle = $data['name'] ?? $data['custom_title'] ?? null;
        $description = $data['description'] ?? null;
    } else {
        // Form data
        $workType = $_POST['work_type'] ?? null;
        $customTitle = $_POST['custom_title'] ?? null;
        $description = null;
    }
    
    $userId = $_SESSION['user_id'] ?? 1;
    
    if (!$workType) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Work type is required']);
        return;
    }
    
    // Generate project ID
    $projectId = 'IND_' . time() . '_' . rand(1000, 9999);
    
    // Generate title if not provided
    if (!$customTitle) {
        $workTypeNames = [
            'transcription' => 'תמלול',
            'proofreading' => 'הגהה',
            'export' => 'ייצוא'
        ];
        
        $customTitle = $workTypeNames[$workType] . ' - ' . date('d/m/Y H:i');
    }
    
    // Create project
    $stmt = $pdo->prepare("
        INSERT INTO projects (project_id, title, work_type, status, created_by, created_at, updated_at) 
        VALUES (?, ?, ?, 'active', ?, NOW(), NOW())
    ");
    
    $stmt->execute([
        $projectId,
        $customTitle,
        $workType,
        $userId
    ]);
    
    $project = [
        'id' => $pdo->lastInsertId(),
        'project_id' => $projectId,
        'title' => $customTitle,
        'work_type' => $workType,
        'status' => 'active',
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode([
        'success' => true,
        'project' => $project,
        'message' => 'Project created successfully'
    ]);
}

function listProjects($pdo) {
    $userId = $_SESSION['user_id'] ?? null;
    $workType = $_GET['work_type'] ?? null;
    
    // Get database projects
    $query = "SELECT * FROM projects WHERE 1=1";
    $params = [];
    
    if ($userId) {
        $query .= " AND created_by = ?";
        $params[] = $userId;
    }
    
    if ($workType) {
        $query .= " AND work_type = ?";
        $params[] = $workType;
    }
    
    $query .= " ORDER BY updated_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Add file counts and stats for each project
    foreach ($projects as &$project) {
        $project['created_at_formatted'] = date('d/m/Y H:i', strtotime($project['created_at']));
        $project['updated_at_formatted'] = date('d/m/Y H:i', strtotime($project['updated_at']));
        
        // Get file counts
        $fileStmt = $pdo->prepare("SELECT category, COUNT(*) as count FROM project_files WHERE project_id = ? GROUP BY category");
        $fileStmt->execute([$project['project_id']]);
        $fileCounts = $fileStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $project['file_counts'] = [
            'media' => $fileCounts['media'] ?? 0,
            'helper' => $fileCounts['helper'] ?? 0,
            'total' => array_sum($fileCounts)
        ];
    }
    
    // Now get independent projects from file system
    if ($userId) {
        // In Docker container, /var/www/html maps to ./server/src
        // So uploads are at /var/www/html/uploads/independent/
        $independentPath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/independent/' . $userId;
        
        // Debug logging
        error_log("[Projects API] Looking for independent projects at: " . $independentPath);
        error_log("[Projects API] Path exists: " . (file_exists($independentPath) ? 'YES' : 'NO'));
        
        if (file_exists($independentPath)) {
            $folders = scandir($independentPath);
            error_log("[Projects API] Found " . count($folders) . " folders in independent directory");
            
            foreach ($folders as $folder) {
                if ($folder === '.' || $folder === '..') continue;
                
                $projectPath = $independentPath . '/' . $folder;
                $jsonFile = $projectPath . '/project_data.json';
                
                error_log("[Projects API] Checking project: " . $folder);
                
                if (file_exists($jsonFile)) {
                    $projectData = json_decode(file_get_contents($jsonFile), true);
                    error_log("[Projects API] Found project data: " . ($projectData ? 'YES' : 'NO'));
                    
                    if ($projectData && $projectData['user_id'] == $userId) {
                        // Apply work type filter if specified
                        if (!$workType || $projectData['work_type'] === $workType) {
                            // Format project data to match database structure
                            $independentProject = [
                                'project_id' => $projectData['id'],
                                'id' => $projectData['id'],
                                'name' => $projectData['title'],
                                'title' => $projectData['title'],
                                'work_type' => $projectData['work_type'],
                                'status' => $projectData['status'],
                                'created_at' => $projectData['created_at'],
                                'updated_at' => $projectData['updated_at'],
                                'created_at_formatted' => date('d/m/Y H:i', strtotime($projectData['created_at'])),
                                'updated_at_formatted' => date('d/m/Y H:i', strtotime($projectData['updated_at'])),
                                'file_count' => count($projectData['files']),
                                'files' => $projectData['files'],
                                'file_counts' => [
                                    'media' => count(array_filter($projectData['files'], function($f) { 
                                        return isset($f['type']) && $f['type'] === 'media'; 
                                    })),
                                    'helper' => count(array_filter($projectData['files'], function($f) { 
                                        return isset($f['type']) && $f['type'] === 'helper'; 
                                    })),
                                    'total' => count($projectData['files'])
                                ]
                            ];
                            
                            // Calculate media info if available
                            $mediaFiles = array_filter($projectData['files'], function($f) { 
                                return isset($f['type']) && $f['type'] === 'media'; 
                            });
                            
                            if (count($mediaFiles) > 0) {
                                $independentProject['media_count'] = count($mediaFiles);
                                $totalDuration = 0;
                                foreach ($mediaFiles as $file) {
                                    if (isset($file['duration'])) {
                                        $totalDuration += $file['duration'];
                                    }
                                }
                                if ($totalDuration > 0) {
                                    $hours = floor($totalDuration / 3600);
                                    $minutes = floor(($totalDuration % 3600) / 60);
                                    $seconds = $totalDuration % 60;
                                    $independentProject['duration'] = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                                }
                            }
                            
                            $projects[] = $independentProject;
                        }
                    }
                }
            }
        }
    }
    
    // Sort all projects by updated_at (newest first)
    usort($projects, function($a, $b) {
        return strtotime($b['updated_at']) - strtotime($a['updated_at']);
    });
    
    echo json_encode([
        'success' => true,
        'projects' => $projects
    ]);
}

function getProject($pdo, $projectId) {
    if (!$projectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM projects WHERE project_id = ?");
    $stmt->execute([$projectId]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Project not found']);
        return;
    }
    
    $project['created_at_formatted'] = date('d/m/Y H:i', strtotime($project['created_at']));
    $project['updated_at_formatted'] = date('d/m/Y H:i', strtotime($project['updated_at']));
    
    // Get files
    $fileStmt = $pdo->prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY upload_date DESC");
    $fileStmt->execute([$projectId]);
    $files = $fileStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $project['files'] = $files;
    
    echo json_encode([
        'success' => true,
        'project' => $project
    ]);
}

function updateProject($pdo) {
    $projectId = $_POST['project_id'] ?? null;
    $title = $_POST['title'] ?? null;
    $status = $_POST['status'] ?? null;
    $transcriptionText = $_POST['transcription_text'] ?? null;
    $speakersList = $_POST['speakers_list'] ?? null;
    $notes = $_POST['notes'] ?? null;
    
    if (!$projectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID is required']);
        return;
    }
    
    // Build update query
    $updateFields = [];
    $params = [];
    
    if ($title !== null) {
        $updateFields[] = "title = ?";
        $params[] = $title;
    }
    
    if ($status !== null) {
        $updateFields[] = "status = ?";
        $params[] = $status;
    }
    
    if ($transcriptionText !== null) {
        $updateFields[] = "transcription_text = ?";
        $params[] = $transcriptionText;
    }
    
    if ($speakersList !== null) {
        $updateFields[] = "speakers_list = ?";
        $params[] = $speakersList;
    }
    
    if ($notes !== null) {
        $updateFields[] = "notes = ?";
        $params[] = $notes;
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }
    
    $updateFields[] = "updated_at = NOW()";
    $params[] = $projectId;
    
    $query = "UPDATE projects SET " . implode(', ', $updateFields) . " WHERE project_id = ?";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message' => 'Project updated successfully'
    ]);
}

function deleteProject($pdo, $projectId) {
    if (!$projectId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID is required']);
        return;
    }
    
    // Get project files first
    $fileStmt = $pdo->prepare("SELECT file_path FROM project_files WHERE project_id = ?");
    $fileStmt->execute([$projectId]);
    $files = $fileStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Delete files from filesystem
    foreach ($files as $filePath) {
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    // Delete from database
    $pdo->prepare("DELETE FROM project_files WHERE project_id = ?")->execute([$projectId]);
    $pdo->prepare("DELETE FROM projects WHERE project_id = ?")->execute([$projectId]);
    
    // Remove project directory
    $projectDir = '../uploads/' . $projectId . '/';
    if (is_dir($projectDir)) {
        removeDirectory($projectDir);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Project deleted successfully'
    ]);
}

function removeDirectory($dir) {
    if (is_dir($dir)) {
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                removeDirectory($path);
            } else {
                unlink($path);
            }
        }
        rmdir($dir);
    }
}
?>