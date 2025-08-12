<?php
/*
 * =========================================
 * Transcription System - Authentication
 * common/auth.php
 * =========================================
 * User authentication and permission handling
 */

// Helper function to get the correct session name
function getTranscriptionSessionName() {
    $showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';
    return $showDevNav ? 'TRANSCRIPTION_DEV_SESSION' : 'TRANSCRIPTION_SESSION';
}

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_name(getTranscriptionSessionName());
    session_start();
}

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Check if user has specific permission
function hasPermission($permission) {
    if (!isLoggedIn()) {
        return false;
    }
    
    $userPermissions = $_SESSION['permissions'] ?? '';
    return strpos($userPermissions, $permission) !== false;
}

// Check if user is admin
function isAdmin() {
    return hasPermission('A') || hasPermission('B') || hasPermission('C');
}

// Get user permissions as array
function getUserPermissions() {
    if (!isLoggedIn()) {
        return [];
    }
    
    $permissions = $_SESSION['permissions'] ?? '';
    return str_split($permissions);
}

// Redirect to login if not authenticated
function requireLogin($redirectUrl = '../../crm/login.php') {
    if (!isLoggedIn()) {
        header("Location: $redirectUrl");
        exit;
    }
}

// Require specific permission or redirect
function requirePermission($permission, $redirectUrl = '../main/index.php') {
    requireLogin($redirectUrl);
    
    if (!hasPermission($permission) && !isAdmin()) {
        header("Location: $redirectUrl?error=no_permission");
        exit;
    }
}

// Get current user info
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'permissions' => $_SESSION['permissions'] ?? '',
        'transcriber_code' => $_SESSION['transcriber_code'] ?? null
    ];
}

// Login user
function loginUser($pdo, $username, $password) {
    try {
        $stmt = $pdo->prepare("SELECT id, password, permissions, transcriber_code FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // Check if user has transcription permissions
            $permissions = $user['permissions'] ?? '';
            $hasTranscriptionAccess = strpos($permissions, 'D') !== false || 
                                      strpos($permissions, 'E') !== false || 
                                      strpos($permissions, 'F') !== false ||
                                      strpos($permissions, 'A') !== false ||
                                      strpos($permissions, 'B') !== false ||
                                      strpos($permissions, 'C') !== false;
            
            if (!$hasTranscriptionAccess) {
                return ['success' => false, 'message' => 'אין לך הרשאות לאפליקציית תמלול'];
            }
            
            // Set session variables
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;
            $_SESSION['permissions'] = $permissions;
            $_SESSION['transcriber_code'] = $user['transcriber_code'];
            
            return ['success' => true, 'message' => 'התחברת בהצלחה'];
        } else {
            return ['success' => false, 'message' => 'שם משתמש או סיסמה שגויים'];
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return ['success' => false, 'message' => 'שגיאה בהתחברות'];
    }
}

// Logout user
function logoutUser() {
    $_SESSION = [];
    session_destroy();
}

// Get user's transcriber info
function getUserTranscriberInfo($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM transcribers WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("Error getting transcriber info: " . $e->getMessage());
        return null;
    }
}

// Check if user is connected to CRM
function isConnectedToCRM($pdo, $userId) {
    try {
        // Check if transcriber_companies table exists
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'transcriber_companies'");
        if ($tableCheck->rowCount() == 0) {
            return false;
        }
        
        // Check if user is a transcriber
        $transcriber = getUserTranscriberInfo($pdo, $userId);
        if (!$transcriber) {
            return false;
        }
        
        // Check if transcriber is connected to any company
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM transcriber_companies WHERE transcriber_id = ?");
        $stmt->execute([$transcriber['id']]);
        $connectionCount = $stmt->fetchColumn();
        
        return $connectionCount > 0;
    } catch (Exception $e) {
        error_log("Error checking CRM connection: " . $e->getMessage());
        return false;
    }
}

// Permission descriptions
function getPermissionDescriptions() {
    return [
        'A' => 'מנהל מערכת',
        'B' => 'מנהל פרויקטים',
        'C' => 'משתמש CRM',
        'D' => 'מתמלל',
        'E' => 'מגיה',
        'F' => 'מייצא'
    ];
}

// Get user's permission names
function getUserPermissionNames($permissions) {
    $descriptions = getPermissionDescriptions();
    $names = [];
    
    for ($i = 0; $i < strlen($permissions); $i++) {
        $permission = $permissions[$i];
        if (isset($descriptions[$permission])) {
            $names[] = $descriptions[$permission];
        }
    }
    
    return $names;
}
?>