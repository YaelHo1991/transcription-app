<?php
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check users table structure
    $columns = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Users Table Structure:</h2>";
    echo "<pre>";
    foreach ($columns as $column) {
        echo $column['Field'] . " - " . $column['Type'] . "\n";
    }
    echo "</pre>";
    
    // Check if there's a plain_password field
    $hasPlainPassword = false;
    foreach ($columns as $column) {
        if (strpos($column['Field'], 'plain') !== false || $column['Field'] === 'original_password') {
            $hasPlainPassword = true;
            echo "<p>Found potential plain password field: " . $column['Field'] . "</p>";
        }
    }
    
    // Show sample users
    echo "<h2>Sample Users:</h2>";
    $users = $pdo->query("SELECT id, username, password FROM users LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($users);
    echo "</pre>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>