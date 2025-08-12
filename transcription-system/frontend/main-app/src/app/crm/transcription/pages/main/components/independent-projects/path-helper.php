<?php
/*
 * Path Helper for Independent Projects
 * Provides reliable path resolution for Windows environments
 */

function getProjectRoot() {
    // Navigate from client/src/transcription/pages/main/components/independent-projects to project root
    $currentDir = __DIR__;
    $projectRoot = realpath($currentDir . '/../../../../../../..');
    
    // Normalize path separators for Windows
    $projectRoot = str_replace('\\', '/', $projectRoot);
    
    return $projectRoot;
}

function getUploadsPath() {
    $projectRoot = getProjectRoot();
    return $projectRoot . '/server/src/uploads';
}

function getIndependentProjectsBasePath() {
    return getUploadsPath() . '/independent';
}

function ensureDirectoryExists($path, $permissions = 0755) {
    if (!file_exists($path)) {
        // Create parent directories if they don't exist
        $parentDir = dirname($path);
        if (!file_exists($parentDir)) {
            ensureDirectoryExists($parentDir, $permissions);
        }
        
        // Create the directory
        if (!mkdir($path, $permissions)) {
            throw new Exception("Failed to create directory: $path - " . error_get_last()['message']);
        }
    }
    
    return true;
}

// Test the path resolution
if (basename($_SERVER['SCRIPT_NAME']) === 'path-helper.php') {
    echo "<pre>\n";
    echo "Path Helper Test:\n";
    echo "Project Root: " . getProjectRoot() . "\n";
    echo "Uploads Path: " . getUploadsPath() . "\n";
    echo "Independent Projects Path: " . getIndependentProjectsBasePath() . "\n";
    echo "</pre>\n";
}
?>