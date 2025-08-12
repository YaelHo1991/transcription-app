<?php
header('Content-Type: application/json; charset=utf-8');

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

session_name('CRM_SESSION');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'לא מחובר למערכת']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // UTF-8 encoding settings
    $pdo->exec("SET NAMES utf8mb4");
    $pdo->exec("SET CHARACTER SET utf8mb4");
    $pdo->exec("SET character_set_connection=utf8mb4");
    $pdo->exec("SET character_set_client=utf8mb4");
    $pdo->exec("SET character_set_results=utf8mb4");
    
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'שגיאה בחיבור למסד הנתונים']);
    exit;
}

// Handle AJAX transcriber code lookup
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['transcriber_code'])) {
    $transcriber_code = trim($_POST['transcriber_code']);
    
    if (empty($transcriber_code)) {
        echo json_encode(['success' => false, 'message' => 'יש להזין קוד מתמלל']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT username, email, full_name, permissions FROM users WHERE transcriber_code = ?");
        $stmt->execute([$transcriber_code]);
        $user = $stmt->fetch();
        
        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'לא נמצא משתמש עם קוד זה']);
            exit;
        }
        
        $permissions = $user['permissions'] ?: '';
        
        // Check if user has app permissions (D=Transcriber, E=Proofreader, F=Exporter)
        $hasAppAccess = strpos($permissions, 'D') !== false || 
                       strpos($permissions, 'E') !== false || 
                       strpos($permissions, 'F') !== false;
        
        if (!$hasAppAccess) {
            echo json_encode([
                'success' => false,
                'message' => 'המשתמש הזה הוא משתמש CRM ולא משתמש אפליקציה. רק משתמשי אפליקציה יכולים להיות מתמללים.'
            ]);
            exit;
        }
        
        // Determine user type based on permissions - FIXED LOGIC
        $hasD = strpos($permissions, 'D') !== false;
        $hasE = strpos($permissions, 'E') !== false;
        $hasF = strpos($permissions, 'F') !== false;
        
        if ($hasD && $hasE && $hasF) {
            $userType = 'transcriber_proofreader_exporter';
        } elseif ($hasD && $hasE) {
            $userType = 'transcriber_proofreader';
        } elseif ($hasD && $hasF) {
            $userType = 'transcriber_exporter';
        } elseif ($hasE && $hasF) {
            $userType = 'proofreader_exporter';
        } elseif ($hasE) {
            $userType = 'proofreader';
        } elseif ($hasF) {
            $userType = 'exporter';
        } else {
            $userType = 'transcriber'; // default for D only
        }
        
        $typeLabels = [
            'transcriber' => 'מתמלל',
            'proofreader' => 'מגיה',
            'exporter' => 'מייצא',
            'transcriber_proofreader' => 'מתמלל ומגיה',
            'transcriber_exporter' => 'מתמלל ומייצא',
            'proofreader_exporter' => 'מגיה ומייצא',
            'transcriber_proofreader_exporter' => 'מתמלל, מגיה ומייצא'
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'name' => $user['full_name'] ?: $user['username'],
                'email' => $user['email'],
                'username' => $user['username'],
                'user_type' => $userType,
                'type_label' => $typeLabels[$userType],
                'permissions' => $permissions
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'שגיאה בחיפוש: ' . $e->getMessage()
        ]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'בקשה לא תקינה']);
}
?>