<?php
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if plain_password field exists
    $columns = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_ASSOC);
    
    $hasPlainPassword = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'plain_password') {
            $hasPlainPassword = true;
            break;
        }
    }
    
    if (!$hasPlainPassword) {
        // Add plain_password column
        $pdo->exec("ALTER TABLE users ADD COLUMN plain_password VARCHAR(255) DEFAULT NULL AFTER password");
        echo "Added plain_password column<br>";
        
        // Set some test passwords
        $testUsers = [
            ['username' => 'admin', 'plain_password' => 'admin123'],
            ['username' => 'transcriber', 'plain_password' => 'trans123'],
            ['username' => 'developer', 'plain_password' => 'dev123']
        ];
        
        foreach ($testUsers as $user) {
            $stmt = $pdo->prepare("UPDATE users SET plain_password = ? WHERE username = ?");
            $stmt->execute([$user['plain_password'], $user['username']]);
            echo "Updated {$user['username']} password to {$user['plain_password']}<br>";
        }
    } else {
        echo "plain_password field already exists<br>";
    }
    
    // Show current users
    echo "<h3>Current Users:</h3>";
    $users = $pdo->query("SELECT id, username, plain_password FROM users")->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($users);
    echo "</pre>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>