<?php
session_name('TRANSCRIPTION_SESSION');
session_start();

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('Asia/Jerusalem');

?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <title>בדיקת יצירת תיקיות פרויקט עצמאי</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            direction: rtl;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        .test {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #fafafa;
        }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .info { color: blue; }
        .path { 
            font-family: monospace; 
            background: #f0f0f0; 
            padding: 2px 5px; 
            border-radius: 3px;
            direction: ltr;
            display: inline-block;
            margin: 2px 0;
        }
        button {
            background: #fd7e14;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
        }
        button:hover {
            background: #e56a0c;
        }
        .result-box {
            margin-top: 20px;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 5px;
            background: #f9f9f9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>בדיקת יצירת תיקיות פרויקט עצמאי</h1>
        
        <?php
        $results = [];
        
        // Test 1: Session and User ID
        $results[] = [
            'name' => 'בדיקת Session ו-User ID',
            'result' => isset($_SESSION['user_id']) ? 
                "<span class='success'>✓</span> User ID: " . $_SESSION['user_id'] : 
                "<span class='error'>✗</span> אין User ID ב-Session"
        ];
        
        // Test 2: Document Root
        $docRoot = $_SERVER['DOCUMENT_ROOT'];
        $results[] = [
            'name' => 'Document Root',
            'result' => "<span class='info'>📁</span> <span class='path'>$docRoot</span>"
        ];
        
        // Test 3: Expected paths
        $serverPath = $docRoot . '/server';
        $srcPath = $docRoot . '/server/src';
        $uploadsPath = $docRoot . '/server/src/uploads';
        $independentPath = $docRoot . '/server/src/uploads/independent';
        
        $paths = [
            'Server' => $serverPath,
            'Src' => $srcPath,
            'Uploads' => $uploadsPath,
            'Independent' => $independentPath
        ];
        
        foreach ($paths as $name => $path) {
            $exists = file_exists($path);
            $results[] = [
                'name' => "תיקיית $name",
                'result' => ($exists ? "<span class='success'>✓</span> קיימת" : "<span class='error'>✗</span> לא קיימת") . 
                           " - <span class='path'>$path</span>"
            ];
        }
        
        // Test 4: Try to create independent folder if needed
        if (!file_exists($independentPath)) {
            $created = @mkdir($independentPath, 0777, true);
            $results[] = [
                'name' => 'יצירת תיקיית Independent',
                'result' => $created ? 
                    "<span class='success'>✓</span> נוצרה בהצלחה" : 
                    "<span class='error'>✗</span> נכשלה: " . error_get_last()['message']
            ];
        }
        
        // Test 5: Real path vs expected path
        if (file_exists($uploadsPath)) {
            $realPath = realpath($uploadsPath);
            $results[] = [
                'name' => 'Real Path של Uploads',
                'result' => "<span class='info'>📁</span> <span class='path'>$realPath</span>"
            ];
        }
        
        // Display results
        foreach ($results as $test) {
            echo "<div class='test'>";
            echo "<strong>{$test['name']}:</strong><br>";
            echo $test['result'];
            echo "</div>";
        }
        ?>
        
        <h2>בדיקת יצירת פרויקט</h2>
        
        <?php
        if (isset($_POST['test_create'])) {
            echo "<div class='result-box'>";
            echo "<h3>תוצאות יצירת פרויקט בדיקה:</h3>";
            
            try {
                $userId = $_SESSION['user_id'] ?? 'test_user';
                $projectId = 'IND_' . time() . '_' . rand(1000, 9999);
                $userPath = $independentPath . '/' . $userId;
                $projectPath = $userPath . '/' . $projectId;
                
                echo "<p>User ID: <span class='path'>$userId</span></p>";
                echo "<p>Project ID: <span class='path'>$projectId</span></p>";
                echo "<p>נתיב מלא: <span class='path'>$projectPath</span></p>";
                
                // Create user directory
                if (!file_exists($userPath)) {
                    if (mkdir($userPath, 0777, true)) {
                        echo "<p class='success'>✓ תיקיית משתמש נוצרה</p>";
                    } else {
                        echo "<p class='error'>✗ כשלון ביצירת תיקיית משתמש: " . error_get_last()['message'] . "</p>";
                    }
                } else {
                    echo "<p class='info'>ℹ תיקיית משתמש כבר קיימת</p>";
                }
                
                // Create project directory
                if (!file_exists($projectPath)) {
                    if (mkdir($projectPath, 0777, true)) {
                        echo "<p class='success'>✓ תיקיית פרויקט נוצרה</p>";
                        
                        // Create subdirectories
                        $subdirs = ['media', 'transcription', 'proofreading', 'export', 'helper_files'];
                        foreach ($subdirs as $subdir) {
                            $subdirPath = $projectPath . '/' . $subdir;
                            if (mkdir($subdirPath, 0777, true)) {
                                echo "<p class='success'>✓ תת-תיקייה $subdir נוצרה</p>";
                            } else {
                                echo "<p class='error'>✗ כשלון ביצירת תת-תיקייה $subdir</p>";
                            }
                        }
                        
                        // Create project_data.json
                        $projectData = [
                            'id' => $projectId,
                            'title' => 'פרויקט בדיקה - ' . date('d/m/Y H:i'),
                            'user_id' => $userId,
                            'created_at' => date('Y-m-d H:i:s')
                        ];
                        
                        $jsonFile = $projectPath . '/project_data.json';
                        if (file_put_contents($jsonFile, json_encode($projectData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
                            echo "<p class='success'>✓ קובץ project_data.json נוצר</p>";
                        } else {
                            echo "<p class='error'>✗ כשלון ביצירת קובץ JSON</p>";
                        }
                        
                    } else {
                        echo "<p class='error'>✗ כשלון ביצירת תיקיית פרויקט: " . error_get_last()['message'] . "</p>";
                    }
                }
                
                // Verify creation
                if (file_exists($projectPath)) {
                    echo "<p class='success'><strong>✓ הפרויקט נוצר בהצלחה!</strong></p>";
                    echo "<p>אתה יכול למצוא אותו ב:</p>";
                    echo "<p class='path' style='font-size: 14px;'>$projectPath</p>";
                }
                
            } catch (Exception $e) {
                echo "<p class='error'>שגיאה: " . $e->getMessage() . "</p>";
            }
            
            echo "</div>";
        }
        ?>
        
        <form method="post">
            <button type="submit" name="test_create" value="1">צור פרויקט בדיקה</button>
        </form>
        
        <h2>בדיקת הפונקציה הקיימת</h2>
        <?php
        // Include the functions file to test
        $functionsFile = __DIR__ . '/components/independent-projects/functions.php';
        if (file_exists($functionsFile)) {
            echo "<p class='success'>✓ קובץ functions.php נמצא</p>";
            
            // Test if we can call the function
            require_once $functionsFile;
            
            if (function_exists('createIndependentProject')) {
                echo "<p class='success'>✓ הפונקציה createIndependentProject קיימת</p>";
                
                if (isset($_POST['test_function'])) {
                    echo "<div class='result-box'>";
                    echo "<h3>תוצאות הפעלת הפונקציה:</h3>";
                    
                    try {
                        $userId = $_SESSION['user_id'] ?? 'test_user';
                        $result = createIndependentProject('transcription', $userId, 'בדיקת פונקציה');
                        
                        echo "<p class='success'>✓ הפונקציה הופעלה בהצלחה!</p>";
                        echo "<pre style='direction: ltr; text-align: left;'>";
                        print_r($result);
                        echo "</pre>";
                        
                    } catch (Exception $e) {
                        echo "<p class='error'>✗ שגיאה בהפעלת הפונקציה: " . $e->getMessage() . "</p>";
                        echo "<p>Stack trace:</p>";
                        echo "<pre style='direction: ltr; text-align: left; font-size: 12px;'>" . $e->getTraceAsString() . "</pre>";
                    }
                    
                    echo "</div>";
                }
                ?>
                <form method="post">
                    <button type="submit" name="test_function" value="1">הפעל את הפונקציה createIndependentProject</button>
                </form>
                <?php
            } else {
                echo "<p class='error'>✗ הפונקציה createIndependentProject לא נמצאה</p>";
            }
        } else {
            echo "<p class='error'>✗ קובץ functions.php לא נמצא</p>";
        }
        ?>
    </div>
</body>
</html>