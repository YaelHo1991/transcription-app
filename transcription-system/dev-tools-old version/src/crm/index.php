<?php
// Start output buffering to handle includes properly
ob_start();

// Development mode check
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';

// Check if we need to show developer navigation
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Session must be started before any output
session_name('CRM_SESSION');
session_start();

// Check if we're forcing login (from main page)
if (isset($_GET['force_login'])) {
    session_unset();
    session_destroy();
    session_name('CRM_SESSION');
    session_start();
    // Redirect to clean URL without force_login parameter
    header("Location: index.php");
    exit;
}

// Include developer navigation if needed (after session start)
include_once '../developer-tools/includes/dev-nav.php';

// Development mode - set session if not exists
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION = [
        'user_id' => 999,
        'username' => 'Developer',
        'full_name' => 'מפתח מערכת',
        'permissions' => 'ABCDEFG',
        'is_admin' => true
    ];
}

// Direct database connection to main database
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // UTF-8 encoding settings
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Login check
if (!isset($_SESSION['user_id'])) {
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['login'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];
        
        $stmt = $pdo->prepare("SELECT id, password, plain_password, permissions, is_admin, full_name FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        // Check password (try both hashed and plain)
        $passwordValid = false;
        if ($user) {
            $passwordValid = password_verify($password, $user['password']) || 
                           ($user['plain_password'] && $password === $user['plain_password']);
        }
        
        if ($user && $passwordValid) {
            // Check if user has CRM permissions (A, B, C)
            $hasCRM = strpos($user['permissions'], 'A') !== false || 
                     strpos($user['permissions'], 'B') !== false || 
                     strpos($user['permissions'], 'C') !== false;
            
            if (!$hasCRM) {
                $loginError = "אין לך הרשאות למערכת CRM";
            } else {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $username;
                $_SESSION['full_name'] = $user['full_name'];
                $_SESSION['permissions'] = $user['permissions'];
                $_SESSION['is_admin'] = $user['is_admin'];
                
                // Preserve navigation parameters when redirecting after login
                $redirectUrl = "dashboard/index.php";
                if (isset($_GET['devnav'])) {
                    $redirectUrl .= "?devnav=" . $_GET['devnav'];
                    if (isset($_GET['dev'])) {
                        $redirectUrl .= "&dev=" . $_GET['dev'];
                    }
                } elseif (isset($_GET['dev'])) {
                    $redirectUrl .= "?dev=" . $_GET['dev'];
                }
                header("Location: " . $redirectUrl);
                exit;
            }
        } else {
            $loginError = "שם משתמש או סיסמה שגויים";
        }
    }
    // End output buffering and clean any output from includes
    ob_end_clean();
    ?>
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>התחברות למערכת CRM</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .login-container {
                max-width: 450px;
                width: 100%;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                backdrop-filter: blur(10px);
            }

            .login-header {
                background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }

            .login-header h2 {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
            }

            .login-header p {
                opacity: 0.9;
                font-size: 14px;
            }

            .login-body {
                padding: 40px 30px;
            }

            .form-group {
                margin: 25px 0;
            }

            label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #5a4a3a;
            }

            input {
                width: 100%;
                padding: 15px;
                border: 2px solid #e7e8d1;
                border-radius: 10px;
                font-size: 16px;
                transition: all 0.3s ease;
                background: #fafbfc;
            }

            input:focus {
                outline: none;
                border-color: #b85042;
                background: white;
                box-shadow: 0 0 0 3px rgba(184, 80, 66, 0.1);
            }

            button {
                width: 100%;
                background: linear-gradient(135deg, #b85042, #a0453a);
                color: white;
                padding: 15px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                margin-top: 10px;
            }

            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(184, 80, 66, 0.3);
            }

            .error {
                background: linear-gradient(135deg, #fef7f6 0%, #fdf0ef 100%);
                color: #a8453a;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid #e8a99b;
                font-weight: 500;
            }

            .login-icon {
                width: 60px;
                height: 60px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin: 0 auto 20px;
            }

            .debug-info {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin-top: 20px;
                font-size: 12px;
                color: #6c757d;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="login-header">
                <div class="login-icon">🏢</div>
                <h2>התחברות למערכת CRM</h2>
                <p>מערכת ניהול תמלול מתקדמת</p>
            </div>
            
            <div class="login-body">
                <?php if (isset($loginError)): ?>
                    <div class="error"><?php echo $loginError; ?></div>
                <?php endif; ?>
                
                <form method="POST" action="<?php echo htmlspecialchars($_SERVER['REQUEST_URI']); ?>">
                    <div class="form-group">
                        <label>שם משתמש:</label>
                        <input type="text" name="username" required value="<?php echo isset($_POST['username']) ? htmlspecialchars($_POST['username']) : ''; ?>">
                    </div>
                    <div class="form-group">
                        <label>סיסמה:</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit" name="login">התחברות</button>
                </form>

                <div class="debug-info">
                    <strong>לבדיקה - משתמשים זמינים:</strong><br>
                    <?php
                    try {
                        $debugStmt = $pdo->query("SELECT username, plain_password FROM users WHERE permissions REGEXP '[ABC]' OR is_admin = 1 LIMIT 3");
                        $debugUsers = $debugStmt->fetchAll();
                        foreach ($debugUsers as $debugUser) {
                            echo "משתמש: <code>{$debugUser['username']}</code> | סיסמה: <code>{$debugUser['plain_password']}</code><br>";
                        }
                    } catch (Exception $e) {
                        echo "לא ניתן לטעון משתמשי בדיקה";
                    }
                    ?>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Logout
if (isset($_GET['logout'])) {
    session_destroy();
    // Preserve navigation parameters on logout
    $redirectUrl = $_SERVER['PHP_SELF'];
    if (isset($_GET['devnav'])) {
        $redirectUrl .= "?devnav=" . $_GET['devnav'];
    }
    header("Location: " . $redirectUrl);
    exit;
}

// If user is already logged in, redirect to dashboard
$redirectUrl = "dashboard/index.php";
// Preserve navigation parameters
if (isset($_GET['devnav'])) {
    $redirectUrl .= "?devnav=" . $_GET['devnav'];
    if (isset($_GET['dev'])) {
        $redirectUrl .= "&dev=" . $_GET['dev'];
    }
} elseif (isset($_GET['dev'])) {
    $redirectUrl .= "?dev=" . $_GET['dev'];
}
header("Location: " . $redirectUrl);
exit;

// Check permissions for CRM (this code should not be reached)
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'];
$hasA = strpos($userPermissions, 'A') !== false;
$hasB = strpos($userPermissions, 'B') !== false;
$hasC = strpos($userPermissions, 'C') !== false;

// Get basic statistics - simplified version without complex queries
$stats = [
    'active_clients' => 0,
    'projects_in_progress' => 0,
    'available_transcribers' => 0,
    'monthly_revenue' => 0
];

// Try to get real stats, fall back to defaults if tables don't exist
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM projects WHERE user_id = " . $_SESSION['user_id']);
    $stats['projects_in_progress'] = $stmt->fetchColumn();
} catch (Exception $e) {
    // Tables don't exist yet - will show 0
}

// End output buffering and clean any output from includes
ob_end_clean();
?>

<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מערכת CRM - דף הבית</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        .header {
            background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
        }

        .header .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .nav-bar {
            background: linear-gradient(135deg, #e7e8d1 0%, #d4d5c0 100%);
            padding: 0;
            display: flex;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .nav-item {
            padding: 15px 30px;
            color: #5a4a3a;
            text-decoration: none;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            font-weight: 500;
        }

        .nav-item:hover, .nav-item.active {
            background: rgba(184, 80, 66, 0.1);
            border-bottom-color: #b85042;
            color: #b85042;
        }

        .main-content {
            padding: 30px;
            background: #f8f9fa;
            min-height: 600px;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            text-align: center;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-card h3 {
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 600;
            color: #6c757d;
        }

        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #b85042;
        }

        .welcome-message {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            text-align: center;
            margin-bottom: 30px;
        }

        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #b85042, #a0453a);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
            margin: 10px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(184, 80, 66, 0.3);
        }

        .success-message {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏢 מערכת CRM למתמלל</h1>
            <div class="user-info">
                <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
                <div class="user-avatar"><?php echo strtoupper(substr($_SESSION['username'], 0, 1)); ?></div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="nav-bar">
            <a href="dashboard/index.php" class="nav-item active">לוח בקרה</a>
            <?php if ($hasA || $isAdmin): ?>
                <a href="clients/index.php" class="nav-item">ניהול לקוחות</a>
            <?php endif; ?>
            <?php if ($hasB || $isAdmin): ?>
                <a href="projects/index.php" class="nav-item">ניהול עבודות</a>
            <?php endif; ?>
            <?php if ($hasC || $isAdmin): ?>
                <a href="transcribers/index.php" class="nav-item">ניהול מתמללים</a>
            <?php endif; ?>
            <a href="?logout=1" class="nav-item" style="color: #dc3545;">התנתק</a>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <div class="success-message">
                🎉 <strong>התחברת בהצלחה למערכת CRM!</strong> המערכת מחוברת למסד הנתונים הראשי.
            </div>

            <!-- Dashboard Statistics -->
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h3>לקוחות פעילים</h3>
                    <div class="stat-number"><?php echo $stats['active_clients']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>עבודות בתהליך</h3>
                    <div class="stat-number"><?php echo $stats['projects_in_progress']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>מתמללים זמינים</h3>
                    <div class="stat-number"><?php echo $stats['available_transcribers']; ?></div>
                </div>
                <div class="stat-card">
                    <h3>הכנסות החודש</h3>
                    <div class="stat-number">₪<?php echo number_format($stats['monthly_revenue']); ?></div>
                </div>
            </div>

            <div class="welcome-message">
                <h2>ברוכים הבאים למערכת CRM</h2>
                <p>מערכת ניהול לקוחות ופרויקטי תמלול מתקדמת</p>
                <br>
                
                <?php if ($hasB || $isAdmin): ?>
                    <a href="projects/index.php" class="btn">ניהול עבודות</a>
                <?php endif; ?>
                
                <?php if ($hasA || $isAdmin): ?>
                    <a href="clients/index.php" class="btn">ניהול לקוחות</a>
                <?php endif; ?>
                
                <?php if ($hasC || $isAdmin): ?>
                    <a href="transcribers/index.php" class="btn">ניהול מתמללים</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>