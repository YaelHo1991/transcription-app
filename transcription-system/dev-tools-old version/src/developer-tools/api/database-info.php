<?php
// Only allow in development mode
session_start();
if (!isset($_SESSION['is_admin']) && !isset($_GET['dev'])) {
    die('Unauthorized');
}

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <title>מידע מסד נתונים</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
        }
        th {
            background: #007bff;
            color: white;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        .table-info {
            margin-bottom: 30px;
        }
        .info-box {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>מידע מסד נתונים - <?php echo $db; ?></h1>
        
        <div class="info-box">
            <strong>שרת:</strong> <?php echo $host; ?><br>
            <strong>מסד נתונים:</strong> <?php echo $db; ?><br>
            <strong>משתמש:</strong> <?php echo $user; ?><br>
            <strong>קידוד:</strong> UTF-8
        </div>
        
        <?php
        // Get all tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($tables as $table) {
            echo '<div class="table-info">';
            echo '<h2>טבלה: ' . $table . '</h2>';
            
            // Get table structure
            $columns = $pdo->query("DESCRIBE $table")->fetchAll(PDO::FETCH_ASSOC);
            
            // Get row count
            $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
            echo '<p><strong>מספר רשומות:</strong> ' . $count . '</p>';
            
            echo '<table>';
            echo '<thead><tr>';
            echo '<th>שדה</th>';
            echo '<th>סוג</th>';
            echo '<th>Null</th>';
            echo '<th>מפתח</th>';
            echo '<th>ברירת מחדל</th>';
            echo '<th>נוסף</th>';
            echo '</tr></thead>';
            echo '<tbody>';
            
            foreach ($columns as $col) {
                echo '<tr>';
                echo '<td>' . $col['Field'] . '</td>';
                echo '<td>' . $col['Type'] . '</td>';
                echo '<td>' . $col['Null'] . '</td>';
                echo '<td>' . $col['Key'] . '</td>';
                echo '<td>' . ($col['Default'] ?? '-') . '</td>';
                echo '<td>' . $col['Extra'] . '</td>';
                echo '</tr>';
            }
            
            echo '</tbody></table>';
            echo '</div>';
        }
        ?>
    </div>
</body>
</html>