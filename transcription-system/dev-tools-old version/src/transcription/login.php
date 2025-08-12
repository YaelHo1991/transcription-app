<?php
// Start output buffering to prevent header issues
ob_start();

// Check if we need to preserve devnav BEFORE starting session
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Use different session namespace for developer mode
if ($showDevNav) {
    session_name('TRANSCRIPTION_DEV_SESSION');
} else {
    session_name('TRANSCRIPTION_SESSION');
}
session_start();

// Include developer navigation AFTER session start
require_once __DIR__ . '/../developer-tools/includes/dev-nav.php';
$queryString = $showDevNav ? '?devnav=1' : '';

// Database connection
$host = 'database';
$port = '3306'; // MySQL port inside container (not 8081)
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // UTF-8 encoding settings
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
} catch(PDOException $e) {
    $error = "שגיאת חיבור למערכת: " . $e->getMessage();
    error_log("Database connection error in login.php: " . $e->getMessage());
    // Don't continue if database connection failed
    $pdo = null;
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($pdo)) {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $devnav = $_POST['devnav'] ?? '';
    
    error_log("Login attempt for user: '" . $username . "' with devnav: " . $devnav);
    error_log("Username length: " . strlen($username));
    error_log("Password length: " . strlen($password));
    
    try {
        // Ensure we have a valid connection
        if (!$pdo) {
            throw new Exception("Database connection not available");
        }
        
        // Query user from database
        $stmt = $pdo->prepare("SELECT id, username, password, plain_password, permissions, full_name, transcriber_code FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Debug output
        error_log("Query executed for username: " . $username);
        error_log("User found: " . ($user ? 'yes' : 'no'));
        
        if ($user) {
            // Check password (try plain first, then hashed)
            $passwordValid = false;
            
            // First try plain password if it exists
            if (!empty($user['plain_password'])) {
                $passwordValid = (trim($password) === trim($user['plain_password']));
                error_log("Plain password check: " . ($passwordValid ? 'VALID' : 'INVALID'));
            }
            
            // If plain didn't work and there's a hashed password, try that
            if (!$passwordValid && !empty($user['password'])) {
                $passwordValid = password_verify($password, $user['password']);
                error_log("Hashed password check: " . ($passwordValid ? 'VALID' : 'INVALID'));
            }
            
            // Debug: Log what we're checking
            error_log("Login attempt for user: " . $username);
            error_log("Has hashed password: " . (!empty($user['password']) ? 'yes' : 'no'));
            error_log("Has plain password: " . (!empty($user['plain_password']) ? 'yes' : 'no'));
            error_log("Plain password in DB: " . $user['plain_password']);
            error_log("Password provided: " . $password);
            error_log("Password valid: " . ($passwordValid ? 'yes' : 'no'));
            error_log("Permissions: " . $user['permissions']);
            
            if ($passwordValid) {
                // Check if user has transcription permissions (D, E, or F)
                $permissions = strtoupper($user['permissions'] ?? '');
                $hasTranscriptionAccess = strpos($permissions, 'D') !== false || 
                                        strpos($permissions, 'E') !== false || 
                                        strpos($permissions, 'F') !== false;
                
                if ($hasTranscriptionAccess) {
                    // Set session variables
                    $_SESSION['logged_in'] = true;
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['full_name'] = $user['full_name'] ?? $user['username'];
                    $_SESSION['transcriber_code'] = $user['transcriber_code'] ?? 'USER' . $user['id'];
                    $_SESSION['permissions'] = $permissions;
                    
                    // Parse individual permissions
                    $_SESSION['can_transcribe'] = strpos($permissions, 'D') !== false;
                    $_SESSION['can_proofread'] = strpos($permissions, 'E') !== false;
                    $_SESSION['can_export'] = strpos($permissions, 'F') !== false;
                    $_SESSION['can_view_reports'] = true; // Reports always included
                    
                    // Debug - show what would happen
                    if (isset($_GET['debug'])) {
                        echo "<h3>Login would succeed!</h3>";
                        echo "<pre>";
                        echo "Session data that would be set:\n";
                        print_r($_SESSION);
                        echo "\nWould redirect to: pages/main/index.php" . ($devnav === '1' ? '?devnav=1' : '') . "\n";
                        echo "</pre>";
                        echo "<a href='pages/main/index.php" . ($devnav === '1' ? '?devnav=1' : '') . "'>Go to main page</a>";
                        exit;
                    }
                    
                    // Preserve devnav parameter in redirect
                    $redirectUrl = "pages/main/index.php";
                    if ($devnav === '1') {
                        $redirectUrl .= "?devnav=1";
                    }
                    
                    ob_end_clean(); // Clear any output before redirect
                    header("Location: " . $redirectUrl);
                    exit;
                } else {
                    $error = "אין לך הרשאות לגשת למערכת התמלול";
                }
            } else {
                $error = "שם משתמש או סיסמה שגויים";
                error_log("Login failed - invalid password for user: " . $username);
            }
        } else {
            $error = "שם משתמש או סיסמה שגויים";
            error_log("Login failed - user not found: " . $username);
        }
    } catch(PDOException $e) {
        $error = "שגיאה בתהליך ההתחברות: " . $e->getMessage();
        error_log("Database error during login: " . $e->getMessage());
    }
}

// If already logged in, redirect to dashboard
if (isset($_SESSION['logged_in']) && $_SESSION['logged_in']) {
    ob_end_clean(); // Clear any output before redirect
    header("Location: pages/main/index.php" . $queryString);
    exit;
}

// End output buffering and flush content
ob_end_flush();
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>התחברות לאפליקציית תמלול</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            color: #201e20;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .login-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 15px 35px rgba(32, 30, 32, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }

        h1 {
            font-size: 24px;
            color: #201e20;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #201e20;
            font-weight: 600;
            font-size: 14px;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid transparent;
            border-radius: 10px;
            font-size: 16px;
            background: rgba(224, 169, 109, 0.08);
            transition: all 0.3s ease;
            color: #201e20;
        }

        .form-group input:focus {
            outline: none;
            border-color: #e0a96d;
            background: rgba(224, 169, 109, 0.12);
        }

        .login-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #e0a96d 0%, #d4956b 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(224, 169, 109, 0.3);
        }

        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(224, 169, 109, 0.4);
        }

        .login-btn:active {
            transform: translateY(0);
        }

        .error-message {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 14px;
            animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        .demo-info {
            background: rgba(224, 169, 109, 0.1);
            border: 1px solid rgba(224, 169, 109, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            font-size: 13px;
        }

        .demo-info h3 {
            color: #e0a96d;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .demo-info p {
            margin-bottom: 5px;
            color: #666;
        }

        .permissions-info {
            background: rgba(46, 204, 113, 0.1);
            border: 1px solid rgba(46, 204, 113, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-top: 15px;
            font-size: 13px;
        }

        .permissions-info h3 {
            color: #27ae60;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .permissions-info ul {
            list-style: none;
            padding: 0;
        }

        .permissions-info li {
            margin-bottom: 5px;
            color: #666;
        }

        .permissions-info li strong {
            color: #27ae60;
        }
    </style>
</head>

<body <?php echo $showDevNav ? 'style="padding-top: 50px;"' : ''; ?>>
    <div class="login-container">
        <div class="login-header">
            <div class="logo">🎯</div>
            <h1>אפליקציית תמלול</h1>
            <p class="subtitle">היכנס לחשבונך כדי להמשיך</p>
        </div>

        <?php if (isset($error)): ?>
            <div class="error-message">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <!-- Login Form -->
        <form class="login-form" method="POST">
            <?php if ($showDevNav): ?>
                <input type="hidden" name="devnav" value="1">
            <?php endif; ?>
            <div class="form-group">
                <label for="username">שם משתמש:</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>
            
            <div class="form-group">
                <label for="password">סיסמה:</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            
            <button type="submit" class="login-btn">התחבר</button>
        </form>

        <div class="permissions-info">
            <h3>הרשאות במערכת התמלול:</h3>
            <ul>
                <li><strong>D</strong> - גישה לתמלול</li>
                <li><strong>E</strong> - גישה להגהה</li>
                <li><strong>F</strong> - גישה לייצוא</li>
                <li>דוחות - נכלל תמיד</li>
            </ul>
        </div>

        <div class="demo-info">
            <h3>משתמשי דוגמה:</h3>
            <p><strong>מתמלל:</strong> transcriber / transcriber123</p>
            <p><strong>מגיה:</strong> proofreader / proofreader123</p>
            <p><strong>מייצא:</strong> exporter / exporter123</p>
        </div>
    </div>
</body>
</html>