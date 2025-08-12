<?php
session_name('TRANSCRIPTION_SESSION');
session_start();

// Test folder creation
$results = [];

// Test 1: Check document root
$results['document_root'] = $_SERVER['DOCUMENT_ROOT'];

// Test 2: Check if server folder exists
$serverPath = $_SERVER['DOCUMENT_ROOT'] . '/server';
$results['server_exists'] = file_exists($serverPath) ? 'Yes' : 'No';

// Test 3: Check if src folder exists  
$srcPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src';
$results['src_exists'] = file_exists($srcPath) ? 'Yes' : 'No';

// Test 4: Check if uploads folder exists
$uploadsPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads';
$results['uploads_exists'] = file_exists($uploadsPath) ? 'Yes' : 'No';

// Test 5: Check if independent folder exists
$independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent';
$results['independent_exists'] = file_exists($independentPath) ? 'Yes' : 'No';

// Test 6: Try to create independent folder if it doesn't exist
if (!file_exists($independentPath)) {
    $results['create_independent'] = mkdir($independentPath, 0777, true) ? 'Success' : 'Failed: ' . error_get_last()['message'];
} else {
    $results['create_independent'] = 'Already exists';
}

// Test 7: Check user folder
$userId = $_SESSION['user_id'] ?? 'test_user';
$userPath = $independentPath . '/' . $userId;
$results['user_path'] = $userPath;
$results['user_folder_exists'] = file_exists($userPath) ? 'Yes' : 'No';

// Test 8: Try to create user folder
if (!file_exists($userPath)) {
    $results['create_user_folder'] = mkdir($userPath, 0777, true) ? 'Success' : 'Failed: ' . error_get_last()['message'];
} else {
    $results['create_user_folder'] = 'Already exists';
}

// Test 9: Try to create a test project folder
$testProjectPath = $userPath . '/TEST_PROJECT_' . time();
$results['test_project_path'] = $testProjectPath;
$results['create_test_project'] = mkdir($testProjectPath, 0777, true) ? 'Success' : 'Failed: ' . error_get_last()['message'];

// Test 10: Clean up test project
if (file_exists($testProjectPath)) {
    rmdir($testProjectPath);
    $results['cleanup'] = 'Cleaned up test project';
}

// Display results
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <title>Test Folder Creation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            direction: rtl;
        }
        .result {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            background: #f5f5f5;
        }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>בדיקת יצירת תיקיות</h1>
    <?php foreach ($results as $test => $result): ?>
        <div class="result">
            <strong><?php echo $test; ?>:</strong> 
            <span class="<?php echo (strpos($result, 'Failed') !== false) ? 'error' : 'success'; ?>">
                <?php echo $result; ?>
            </span>
        </div>
    <?php endforeach; ?>
</body>
</html>