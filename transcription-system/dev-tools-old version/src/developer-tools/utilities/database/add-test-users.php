<?php
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Test users to add/update
    $testUsers = [
        [
            'username' => 'admin',
            'password' => 'admin123',
            'full_name' => 'מנהל מערכת',
            'email' => 'admin@test.com',
            'permissions' => 'ABCDEFG',
            'is_admin' => 1,
            'is_active' => 1
        ],
        [
            'username' => 'manager',
            'password' => 'manager123',
            'full_name' => 'מנהל פרויקטים',
            'email' => 'manager@test.com',
            'permissions' => 'AB',
            'is_admin' => 0,
            'is_active' => 1
        ],
        [
            'username' => 'transcriber',
            'password' => 'trans123',
            'full_name' => 'מתמלל בדיקה',
            'email' => 'trans@test.com',
            'permissions' => 'D',
            'is_admin' => 0,
            'is_active' => 1
        ],
        [
            'username' => 'client',
            'password' => 'client123',
            'full_name' => 'לקוח בדיקה',
            'email' => 'client@test.com',
            'permissions' => 'A',
            'is_admin' => 0,
            'is_active' => 1
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
                is_active = ?
                WHERE username = ?");
            $stmt->execute([
                password_hash($user['password'], PASSWORD_DEFAULT),
                $user['password'],
                $user['full_name'],
                $user['email'],
                $user['permissions'],
                $user['is_admin'],
                $user['is_active'],
                $user['username']
            ]);
            echo "Updated user: {$user['username']}<br>";
        } else {
            // Insert new user
            $stmt = $pdo->prepare("INSERT INTO users 
                (username, password, plain_password, full_name, email, permissions, is_admin, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $user['username'],
                password_hash($user['password'], PASSWORD_DEFAULT),
                $user['password'],
                $user['full_name'],
                $user['email'],
                $user['permissions'],
                $user['is_admin'],
                $user['is_active']
            ]);
            echo "Created user: {$user['username']}<br>";
        }
    }
    
    // Add transcriber codes for transcriber users
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = 'transcriber'");
    $stmt->execute();
    $transUser = $stmt->fetch();
    
    if ($transUser) {
        // Check if transcriber record exists
        $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE user_id = ?");
        $stmt->execute([$transUser['id']]);
        $existingTrans = $stmt->fetch();
        
        if (!$existingTrans) {
            // Create transcriber record with code
            $code = 'TRANS' . str_pad($transUser['id'], 3, '0', STR_PAD_LEFT);
            $stmt = $pdo->prepare("INSERT INTO transcribers (user_id, transcriber_code, name, email, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$transUser['id'], $code, 'מתמלל בדיקה', 'trans@test.com', 'active']);
            echo "Created transcriber code: $code<br>";
        }
    }
    
    echo "<br><h3>Test Users Ready:</h3>";
    echo "<ul>";
    echo "<li><strong>Admin:</strong> admin / admin123 (All permissions)</li>";
    echo "<li><strong>Manager:</strong> manager / manager123 (Client & Project management)</li>";
    echo "<li><strong>Transcriber:</strong> transcriber / trans123 (Transcription only)</li>";
    echo "<li><strong>Client:</strong> client / client123 (Client access only)</li>";
    echo "</ul>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>