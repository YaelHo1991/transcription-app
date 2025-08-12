<?php
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // First, check and add missing columns
    $columns = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('is_active', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1");
        echo "Added is_active column<br>";
    }
    
    if (!in_array('plain_password', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN plain_password VARCHAR(255) DEFAULT NULL AFTER password");
        echo "Added plain_password column<br>";
    }
    
    // Now add/update test users
    $testUsers = [
        [
            'username' => 'admin',
            'password' => 'admin123',
            'full_name' => 'מנהל מערכת',
            'email' => 'admin@test.com',
            'permissions' => 'ABCDEFG',
            'is_admin' => 1
        ],
        [
            'username' => 'manager',
            'password' => 'manager123',
            'full_name' => 'מנהל פרויקטים',
            'email' => 'manager@test.com',
            'permissions' => 'AB',
            'is_admin' => 0
        ],
        [
            'username' => 'transcriber',
            'password' => 'trans123',
            'full_name' => 'מתמלל בדיקה',
            'email' => 'trans@test.com',
            'permissions' => 'D',
            'is_admin' => 0
        ]
    ];
    
    foreach ($testUsers as $user) {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$user['username']]);
        $existingUser = $stmt->fetch();
        
        if ($existingUser) {
            // Update existing user
            $stmt = $pdo->prepare("UPDATE users SET 
                password = ?, 
                plain_password = ?,
                full_name = ?,
                email = ?,
                permissions = ?,
                is_admin = ?,
                is_active = 1
                WHERE username = ?");
            $stmt->execute([
                password_hash($user['password'], PASSWORD_DEFAULT),
                $user['password'],
                $user['full_name'],
                $user['email'],
                $user['permissions'],
                $user['is_admin'],
                $user['username']
            ]);
            echo "Updated user: {$user['username']} / {$user['password']}<br>";
        } else {
            // Insert new user
            $stmt = $pdo->prepare("INSERT INTO users 
                (username, password, plain_password, full_name, email, permissions, is_admin, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([
                $user['username'],
                password_hash($user['password'], PASSWORD_DEFAULT),
                $user['password'],
                $user['full_name'],
                $user['email'],
                $user['permissions'],
                $user['is_admin']
            ]);
            echo "Created user: {$user['username']} / {$user['password']}<br>";
        }
    }
    
    echo "<br><h3>✅ Database fixed and test users ready!</h3>";
    echo "<p>You can now login to CRM with:</p>";
    echo "<ul>";
    echo "<li><strong>admin</strong> / admin123</li>";
    echo "<li><strong>manager</strong> / manager123</li>";
    echo "<li><strong>transcriber</strong> / trans123</li>";
    echo "</ul>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>