<?php
/**
 * Clear Session and Cookies
 * Use this to fix session issues
 */

// Clear all possible session names
$sessionNames = ['TRANSCRIPTION_SESSION', 'TRANSCRIPTION_DEV_SESSION', 'PHPSESSID'];

foreach ($sessionNames as $name) {
    if (isset($_COOKIE[$name])) {
        // Clear cookie
        setcookie($name, '', time() - 3600, '/');
        setcookie($name, '', time() - 3600, '/src/');
        setcookie($name, '', time() - 3600, '/src/transcription/');
        setcookie($name, '', time() - 3600, '/src/transcription/pages/');
        setcookie($name, '', time() - 3600, '/src/transcription/pages/transcription/');
        unset($_COOKIE[$name]);
    }
}

// Try to destroy any existing session
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}
session_destroy();

// Clear session files if we can access the temp directory
$sessionPath = session_save_path();
if (empty($sessionPath)) {
    $sessionPath = sys_get_temp_dir();
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Session Cleared</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        a {
            display: inline-block;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }
        a:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <h1>Session and Cookies Cleared</h1>
    
    <div class="success">
        ✓ All session cookies have been cleared<br>
        ✓ Session destroyed<br>
        ✓ You can now start fresh
    </div>
    
    <div class="info">
        <strong>Session Path:</strong> <?php echo $sessionPath ?: 'Not set'; ?><br>
        <strong>Cleared Cookies:</strong> <?php echo implode(', ', $sessionNames); ?>
    </div>
    
    <h3>Continue to:</h3>
    <a href="index.php">Transcription Page (Normal)</a>
    <a href="index.php?dev=1">Transcription Page (Dev Mode)</a>
    
    <script>
        // Also clear any localStorage/sessionStorage
        try {
            localStorage.clear();
            sessionStorage.clear();
            console.log('Local storage cleared');
        } catch(e) {
            console.log('Could not clear storage:', e);
        }
    </script>
</body>
</html>