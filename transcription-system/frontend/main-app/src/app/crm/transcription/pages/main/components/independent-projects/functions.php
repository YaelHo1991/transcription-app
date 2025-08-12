<?php
/*
 * =========================================
 * Independent Projects Functions
 * components/independent-projects/functions.php
 * =========================================
 * Core functions for independent project management
 */

// Include path helper for reliable path resolution
// require_once __DIR__ . '/path-helper.php';  // Disabled - causing path issues in Docker

// Create a new independent project
function createIndependentProject($workType, $userId, $customTitle = null)
{
    // Enable error logging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent_project_errors.log');
    
    // Log function entry
    error_log("[" . date('Y-m-d H:i:s') . "] createIndependentProject called with workType: $workType, userId: $userId");
    
    // Set timezone for correct time
    date_default_timezone_set('Asia/Jerusalem');
    
    $projectId = 'IND_' . time() . '_' . rand(1000, 9999);
    error_log("[" . date('Y-m-d H:i:s') . "] Generated projectId: $projectId");
    
    // Use path helper for reliable path resolution
    $independentBase = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent';
    $userPath = $independentBase . '/' . $userId;
    $folderPath = $userPath . '/' . $projectId;
    
    // Log paths
    error_log("[" . date('Y-m-d H:i:s') . "] Document root: " . $_SERVER['DOCUMENT_ROOT']);
    error_log("[" . date('Y-m-d H:i:s') . "] Independent base: $independentBase");
    error_log("[" . date('Y-m-d H:i:s') . "] User path: $userPath");
    error_log("[" . date('Y-m-d H:i:s') . "] Project folder path: $folderPath");
    
    // Ensure independent directory exists first
    error_log("[" . date('Y-m-d H:i:s') . "] Checking independent base directory: $independentBase");
    
    if (!file_exists($independentBase)) {
        error_log("[" . date('Y-m-d H:i:s') . "] Independent base directory does not exist, attempting to create...");
        
        // First ensure uploads directory exists
        $uploadsDir = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads';
        if (!file_exists($uploadsDir)) {
            error_log("[" . date('Y-m-d H:i:s') . "] Uploads directory does not exist: $uploadsDir");
            if (!mkdir($uploadsDir, 0777, true)) {
                $error = "Failed to create uploads directory: $uploadsDir - " . error_get_last()['message'];
                error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
                throw new Exception($error);
            }
            error_log("[" . date('Y-m-d H:i:s') . "] Successfully created uploads directory");
        }
        
        // On Windows, use 0755 permissions instead of 0777
        $permissions = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 0755 : 0777;
        if (!mkdir($independentBase, $permissions, true)) {
            $error = "Failed to create independent directory: $independentBase - " . error_get_last()['message'];
            error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
            throw new Exception($error);
        }
        error_log("[" . date('Y-m-d H:i:s') . "] Successfully created independent base directory");
    } else {
        error_log("[" . date('Y-m-d H:i:s') . "] Independent base directory already exists");
    }
    
    // Create user directory if it doesn't exist
    error_log("[" . date('Y-m-d H:i:s') . "] Checking user directory: $userPath");
    if (!file_exists($userPath)) {
        error_log("[" . date('Y-m-d H:i:s') . "] User directory does not exist, attempting to create...");
        // On Windows, use 0755 permissions instead of 0777
        $permissions = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 0755 : 0777;
        if (!mkdir($userPath, $permissions, true)) {
            $error = "Failed to create user directory: $userPath - " . error_get_last()['message'];
            error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
            throw new Exception($error);
        }
        error_log("[" . date('Y-m-d H:i:s') . "] Successfully created user directory");
    } else {
        error_log("[" . date('Y-m-d H:i:s') . "] User directory already exists");
    }

    // Create project folder
    error_log("[" . date('Y-m-d H:i:s') . "] Checking project folder: $folderPath");
    if (!file_exists($folderPath)) {
        error_log("[" . date('Y-m-d H:i:s') . "] Project folder does not exist, attempting to create...");
        // On Windows, use 0755 permissions instead of 0777
        $permissions = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 0755 : 0777;
        if (!mkdir($folderPath, $permissions, true)) {
            $error = "Failed to create project directory: $folderPath - " . error_get_last()['message'];
            error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
            throw new Exception($error);
        }
        error_log("[" . date('Y-m-d H:i:s') . "] Successfully created project folder");
        
        // Create subdirectories
        $subdirs = ['media', 'transcription', 'export', 'proofreading', 'helper_files'];
        foreach ($subdirs as $subdir) {
            $subdirPath = $folderPath . '/' . $subdir;
            error_log("[" . date('Y-m-d H:i:s') . "] Creating subdirectory: $subdirPath");
            if (!mkdir($subdirPath, $permissions, true)) {
                $error = "Failed to create subdirectory: $subdirPath - " . error_get_last()['message'];
                error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
                throw new Exception($error);
            }
            error_log("[" . date('Y-m-d H:i:s') . "] Successfully created subdirectory: $subdir");
        }
    } else {
        error_log("[" . date('Y-m-d H:i:s') . "] Project folder already exists (this should not happen!)");
    }

    // Generate project title
    if (empty($customTitle)) {
        $workTypeHebrew = [
            'transcription' => 'תמלול',
            'proofreading' => 'הגהה',
            'export' => 'ייצוא'
        ];
        $customTitle = $workTypeHebrew[$workType] . ' - ' . date('d/m/Y H:i');
    }

    // Create project data
    $projectData = [
        'id' => $projectId,
        'title' => $customTitle,
        'description' => '',
        'work_type' => $workType,
        'user_id' => $userId,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'status' => 'active',
        'folder_path' => $folderPath,
        'files' => [],
        'media_files' => [],
        'transcription_files' => [],
        'proofreading_files' => [],
        'export_files' => [],
        'helper_files' => []
    ];

    // Save project data to JSON
    $jsonFile = $folderPath . '/project_data.json';
    error_log("[" . date('Y-m-d H:i:s') . "] Saving project data to: $jsonFile");
    
    $jsonContent = json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        $error = "Failed to encode project data to JSON";
        error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
        throw new Exception($error);
    }
    
    $result = file_put_contents($jsonFile, $jsonContent);
    if ($result === false) {
        $error = "Failed to save project data to file: $jsonFile - " . error_get_last()['message'];
        error_log("[" . date('Y-m-d H:i:s') . "] ERROR: $error");
        throw new Exception($error);
    }
    
    error_log("[" . date('Y-m-d H:i:s') . "] Successfully saved project data ($result bytes written)");
    error_log("[" . date('Y-m-d H:i:s') . "] Project created successfully with ID: $projectId");

    return $projectData;
}

// Get all independent projects for a user
function getIndependentProjects($userId)
{
    $independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent/' . $userId;
    $projects = [];
    
    // Log the path being checked
    error_log("[" . date('Y-m-d H:i:s') . "] getIndependentProjects - Checking path: $independentPath");

    if (!file_exists($independentPath)) {
        error_log("[" . date('Y-m-d H:i:s') . "] getIndependentProjects - Path does not exist, creating...");
        $permissions = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 0755 : 0777;
        if (!mkdir($independentPath, $permissions, true)) {
            error_log("[" . date('Y-m-d H:i:s') . "] getIndependentProjects - Failed to create path: " . error_get_last()['message']);
        }
        return $projects;
    }

    $folders = scandir($independentPath);
    foreach ($folders as $folder) {
        if ($folder === '.' || $folder === '..') continue;

        $projectPath = $independentPath . '/' . $folder;
        $jsonFile = $projectPath . '/project_data.json';

        if (file_exists($jsonFile)) {
            $projectData = json_decode(file_get_contents($jsonFile), true);
            if ($projectData && $projectData['user_id'] == $userId) {
                $projects[] = $projectData;
            }
        }
    }

    // Sort by creation date (newest first)
    usort($projects, function ($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    return $projects;
}

// Update an independent project
function updateIndependentProject($projectId, $data, $userId)
{
    $independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent/' . $userId;
    $projectPath = $independentPath . '/' . $projectId;
    $jsonFile = $projectPath . '/project_data.json';

    if (file_exists($jsonFile)) {
        $projectData = json_decode(file_get_contents($jsonFile), true);
        $projectData = array_merge($projectData, $data);
        $projectData['updated_at'] = date('Y-m-d H:i:s');

        file_put_contents($jsonFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $projectData;
    }

    return false;
}

// Delete an independent project
function deleteIndependentProject($projectId, $userId)
{
    $independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent/' . $userId;
    $projectPath = $independentPath . '/' . $projectId;

    if (file_exists($projectPath)) {
        // Delete all files recursively
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($projectPath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($files as $fileinfo) {
            if ($fileinfo->isDir()) {
                rmdir($fileinfo->getRealPath());
            } else {
                unlink($fileinfo->getRealPath());
            }
        }
        
        rmdir($projectPath);
        return true;
    }

    return false;
}

// Get project media information
function getProjectMediaInfo($project) {
    if (!$project || !isset($project['files'])) {
        return ['total_files' => 0, 'total_duration' => '00:00:00'];
    }
    
    $files = $project['files'];
    $mediaFiles = array_filter($files, function($file) {
        return isset($file['category']) && $file['category'] === 'media' && 
               in_array(strtolower($file['extension']), ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'avi', 'mov', 'wmv']);
    });
    
    $totalFiles = count($mediaFiles);
    $totalDuration = 0;
    
    // Rough estimation based on file size
    foreach ($mediaFiles as $file) {
        $estimatedDuration = $file['size'] / (128 * 1024); // Estimate for 128kbps
        $totalDuration += $estimatedDuration;
    }
    
    $hours = floor($totalDuration / 3600);
    $minutes = floor((intval($totalDuration) % 3600) / 60);
    $seconds = intval($totalDuration) % 60;
    
    return [
        'total_files' => $totalFiles,
        'total_duration' => $totalDuration,
        'duration_formatted' => sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds)
    ];
}

// Get project display name
function getProjectDisplayName($project)
{
    if (!$project) return 'פרויקט לא זמין';

    // If there's a custom name - use it
    if (!empty($project['title'])) {
        return $project['title'];
    }

    // Otherwise - create name from folder
    $folderName = basename($project['folder_path']);

    // If it's an independent project - try to extract info from name
    if (strpos($folderName, 'IND_') === 0) {
        $parts = explode('_', $folderName);
        if (count($parts) >= 2) {
            $timestamp = $parts[1];
            $date = date('d/m/Y H:i', $timestamp);
            return "פרויקט עצמאי - $date";
        }
    }

    // Otherwise - use folder name
    return $folderName;
}