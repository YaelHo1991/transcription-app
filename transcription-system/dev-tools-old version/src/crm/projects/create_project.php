<?php
/*
 * =========================================
 * Project Creation and Management System
 * create_project.php
 * =========================================
 * Comprehensive project creation with step navigation
 * and full functionality for handling projects
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

session_name('CRM_SESSION');
session_start();

// Database connection - CLIENT DATABASE
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
    $pdo->exec("SET sql_mode = 'NO_ENGINE_SUBSTITUTION'");
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Authentication check
if (!isset($_SESSION['user_id'])) {
    header('Location: ../../../login.php');
    exit;
}

// Check permissions
$userPermissions = $_SESSION['permissions'];
$hasB = strpos($userPermissions, 'B') !== false;

if (!$hasB) {
    echo '<script>alert("אין הרשאות מספיקות"); window.location.href="index.php";</script>';
    exit;
}

// Function to create folder structure in server container
function createServerFolder($projectId, $userId, $projectTitle) {
    $serverUrl = 'http://127.0.0.1:80/create_project_folder.php';
    
    $postData = http_build_query([
        'project_id' => $projectId,
        'user_id' => $userId,
        'project_title' => $projectTitle
    ]);
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $postData
        ]
    ]);
    
    $result = file_get_contents($serverUrl, false, $context);
    if ($result === false) {
        error_log("Failed to create server folder for project $projectId");
        return false;
    }
    return true;
}

// Function to handle file uploads
function handleFileUploads($files, $projectId, $userId) {
    $uploadResults = [];
    
    try {
        for ($i = 0; $i < count($files['name']); $i++) {
            if ($files['error'][$i] === UPLOAD_ERR_OK) {
                $fileName = $files['name'][$i];
                $tempFile = $files['tmp_name'][$i];
                $fileSize = $files['size'][$i];
                
                // Validate file size (max 500MB)
                if ($fileSize > 500 * 1024 * 1024) {
                    $uploadResults[] = "⚠️ קובץ $fileName גדול מדי (מעל 500MB)";
                    continue;
                }
                
                // Validate file type
                $allowedTypes = ['mp3', 'wav', 'mp4', 'm4a', 'pdf', 'doc', 'docx', 'txt'];
                $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                if (!in_array($fileExt, $allowedTypes)) {
                    $uploadResults[] = "⚠️ קובץ $fileName בפורמט לא נתמך";
                    continue;
                }
                
                // Send file to server container
                $result = sendFileToServer($tempFile, $fileName, $projectId, $userId);
                if ($result) {
                    $uploadResults[] = "✅ $fileName";
                    
                    // Determine file category
                    $category = in_array($fileExt, ['mp3', 'wav', 'mp4', 'm4a']) ? 'media' : 'helper';
                    
                    // Save file info to database
                    global $pdo;
                    $stmt = $pdo->prepare("INSERT INTO project_files (project_id, filename, file_path, file_type, file_category) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$projectId, $fileName, $result, $fileExt, $category]);
                } else {
                    $uploadResults[] = "❌ שגיאה בהעלאת $fileName";
                }
            }
        }
    } catch (Exception $e) {
        $uploadResults[] = "❌ שגיאה כללית: " . $e->getMessage();
    }
    
    return $uploadResults;
}

// Function to send file to server container
function sendFileToServer($tempFile, $fileName, $projectId, $userId) {
    $serverUrl = 'http://127.0.0.1:80/upload_media.php';
    
    $uniqueFileName = time() . '_' . rand(1000, 9999) . '_' . $fileName;
    $boundary = '----WebKitFormBoundary' . uniqid();
    $data = '';
    
    // Add form fields
    $data .= "--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"project_id\"\r\n\r\n";
    $data .= "$projectId\r\n";
    
    $data .= "--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"user_id\"\r\n\r\n";
    $data .= "$userId\r\n";
    
    $data .= "--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"filename\"\r\n\r\n";
    $data .= "$uniqueFileName\r\n";
    
    // Add file
    $data .= "--$boundary\r\n";
    $data .= "Content-Disposition: form-data; name=\"file\"; filename=\"$uniqueFileName\"\r\n";
    $data .= "Content-Type: application/octet-stream\r\n\r\n";
    $data .= file_get_contents($tempFile);
    $data .= "\r\n";
    
    $data .= "--$boundary--\r\n";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: multipart/form-data; boundary=$boundary\r\n",
            'content' => $data
        ]
    ]);
    
    $result = file_get_contents($serverUrl, false, $context);
    if ($result !== false) {
        $response = json_decode($result, true);
        if ($response && $response['success']) {
            return $response['file_path'];
        }
    }
    
    return false;
}

// Get clients for dropdown
$clientsStmt = $pdo->prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY name");
$clientsStmt->execute([$_SESSION['user_id']]);
$clients = $clientsStmt->fetchAll();

// Get transcribers for team assignment
$transcribersStmt = $pdo->prepare("
    SELECT t.*, u.permissions FROM transcribers t 
    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
    INNER JOIN users u ON t.user_id = u.id
    WHERE tc.company_id = (SELECT id FROM companies WHERE user_id = ?)
    ORDER BY t.name
");
$transcribersStmt->execute([$_SESSION['user_id']]);
$transcribers = $transcribersStmt->fetchAll();

// Separate transcribers by role
$transcriptors = array_filter($transcribers, function($t) { return strpos($t['permissions'], 'D') !== false; });
$proofreaders = array_filter($transcribers, function($t) { return strpos($t['permissions'], 'E') !== false; });
$exporters = array_filter($transcribers, function($t) { return strpos($t['permissions'], 'F') !== false; });

// Handle form submission
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action']) && $_POST['action'] == 'create_project') {
    try {
        // Validate required fields
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $client_id = $_POST['client_id'] ?? null;
        $project_type = $_POST['project_type'] ?? 'transcription';
        $priority = $_POST['priority'] ?? 'medium';
        $target_date = $_POST['target_date'] ?? null;
        $budget = $_POST['budget'] ?? 0;
        $notes = trim($_POST['notes'] ?? '');
        $speakers = trim($_POST['speakers'] ?? '');
        $estimated_pages = intval($_POST['estimated_pages'] ?? 0);
        $price_per_page = floatval($_POST['price_per_page'] ?? 0);
        
        // Team assignments
        $assigned_transcriber = $_POST['assigned_transcriber'] ?? null;
        $assigned_proofreader = $_POST['assigned_proofreader'] ?? null;
        $assigned_exporter = $_POST['assigned_exporter'] ?? null;
        
        if (empty($title)) {
            throw new Exception('יש להזין שם פרויקט');
        }
        
        // Get or create company
        $companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
        $companyStmt->execute([$_SESSION['user_id']]);
        $company = $companyStmt->fetch();
        
        if (!$company) {
            $companyName = $_SESSION['username'] . ' Company';
            $createCompanyStmt = $pdo->prepare("INSERT INTO companies (name, user_id, permissions) VALUES (?, ?, ?)");
            $createCompanyStmt->execute([$companyName, $_SESSION['user_id'], $_SESSION['permissions']]);
            $companyId = $pdo->lastInsertId();
        } else {
            $companyId = $company['id'];
        }
        
        // Create project
        $insertStmt = $pdo->prepare("
            INSERT INTO projects (
                company_id, title, description, project_type, priority, target_date, 
                budget, notes, speakers, estimated_pages, price_per_page, 
                assigned_transcriber, assigned_proofreader, assigned_exporter, 
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        ");
        
        $insertStmt->execute([
            $companyId, $title, $description, $project_type, $priority, $target_date,
            $budget, $notes, $speakers, $estimated_pages, $price_per_page,
            $assigned_transcriber, $assigned_proofreader, $assigned_exporter
        ]);
        
        $projectId = $pdo->lastInsertId();
        
        // Create folder structure in server container
        createServerFolder($projectId, $_SESSION['user_id'], $title);
        
        // Handle file uploads
        $uploadResults = [];
        if (isset($_FILES['media_files']) && !empty($_FILES['media_files']['name'][0])) {
            $uploadResults = array_merge($uploadResults, handleFileUploads($_FILES['media_files'], $projectId, $_SESSION['user_id']));
        }
        
        if (isset($_FILES['helper_files']) && !empty($_FILES['helper_files']['name'][0])) {
            $uploadResults = array_merge($uploadResults, handleFileUploads($_FILES['helper_files'], $projectId, $_SESSION['user_id']));
        }
        
        $message = "פרויקט '$title' נוצר בהצלחה! ID: $projectId";
        if (!empty($uploadResults)) {
            $message .= "<br>קבצים: " . implode(', ', $uploadResults);
        }
        
    } catch (Exception $e) {
        $error = "שגיאה ביצירת הפרויקט: " . $e->getMessage();
    }
}

?><!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>יצירת פרויקט חדש</title>
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
            max-width: 900px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        .header {
            background: linear-gradient(135deg, #8b6f47 0%, #785d3a 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
            position: relative;
        }

        .header h1 {
            font-size: 26px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .header p {
            font-size: 16px;
            opacity: 0.9;
        }

        .back-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }

        .back-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        .main-content {
            padding: 30px;
            background: linear-gradient(135deg, #faf9f6 0%, #f5f3ee 100%);
        }

        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
        }

        .step {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(139, 111, 71, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #8b6f47;
            margin: 0 10px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .step:hover {
            background: rgba(139, 111, 71, 0.3);
            transform: scale(1.05);
        }

        .step.active {
            background: #8b6f47;
            color: white;
        }

        .step.completed {
            background: #27ae60;
            color: white;
        }

        .step::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 100%;
            transform: translateY(-50%);
            width: 20px;
            height: 2px;
            background: rgba(139, 111, 71, 0.2);
        }

        .step:last-child::after {
            display: none;
        }

        .step.completed::after {
            background: #27ae60;
        }

        .form-section {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }

        .form-section.hidden {
            display: none;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #5a4831;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #5a4831;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(139, 111, 71, 0.2);
            border-radius: 10px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: #8b6f47;
            box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
        }

        .upload-area {
            border: 2px dashed rgba(139, 111, 71, 0.3);
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            background: rgba(139, 111, 71, 0.05);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .upload-area:hover {
            border-color: #8b6f47;
            background: rgba(139, 111, 71, 0.1);
        }

        .upload-icon {
            font-size: 48px;
            margin-bottom: 15px;
            color: #8b6f47;
        }

        .upload-text {
            font-size: 16px;
            color: #5a4831;
            margin-bottom: 8px;
        }

        .upload-hint {
            font-size: 12px;
            color: #8b6f47;
        }

        .team-assignment {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .team-member {
            background: rgba(139, 111, 71, 0.05);
            border: 2px solid rgba(139, 111, 71, 0.1);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .team-member:hover {
            border-color: #8b6f47;
            background: rgba(139, 111, 71, 0.1);
        }

        .team-member.selected {
            border-color: #8b6f47;
            background: rgba(139, 111, 71, 0.15);
        }

        .member-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b6f47, #785d3a);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            font-weight: bold;
            margin: 0 auto 10px;
        }

        .member-name {
            font-weight: 600;
            color: #5a4831;
            margin-bottom: 5px;
        }

        .member-role {
            font-size: 12px;
            color: #8b6f47;
            margin-bottom: 8px;
        }

        .member-status {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 500;
            text-transform: uppercase;
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
        }

        .priority-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .priority-option {
            flex: 1;
            padding: 12px;
            border: 2px solid rgba(139, 111, 71, 0.2);
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        }

        .priority-option:hover {
            border-color: #8b6f47;
        }

        .priority-option.selected {
            border-color: #8b6f47;
            background: rgba(139, 111, 71, 0.1);
        }

        .priority-high {
            border-color: #e74c3c !important;
            color: #e74c3c;
        }

        .priority-high.selected {
            background: rgba(231, 76, 60, 0.1) !important;
        }

        .priority-medium {
            border-color: #f39c12 !important;
            color: #f39c12;
        }

        .priority-medium.selected {
            background: rgba(243, 156, 18, 0.1) !important;
        }

        .priority-low {
            border-color: #27ae60 !important;
            color: #27ae60;
        }

        .priority-low.selected {
            background: rgba(39, 174, 96, 0.1) !important;
        }

        .cost-calculator {
            background: rgba(139, 111, 71, 0.05);
            border: 1px solid rgba(139, 111, 71, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }

        .cost-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(139, 111, 71, 0.1);
        }

        .cost-item:last-child {
            border-bottom: none;
            font-weight: bold;
            color: #5a4831;
            font-size: 18px;
            margin-top: 10px;
            padding-top: 15px;
            border-top: 2px solid rgba(139, 111, 71, 0.2);
        }

        .cost-label {
            color: #5a4831;
        }

        .cost-value {
            color: #8b6f47;
            font-weight: 500;
        }

        .navigation-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 30px;
        }

        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 30px;
        }

        .btn {
            padding: 15px 30px;
            border-radius: 25px;
            border: none;
            cursor: pointer;
            font-weight: 500;
            font-size: 16px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #8b6f47, #785d3a);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(139, 111, 71, 0.3);
        }

        .btn-secondary {
            background: rgba(139, 111, 71, 0.1);
            color: #5a4831;
        }

        .btn-secondary:hover {
            background: rgba(139, 111, 71, 0.2);
        }

        .message {
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid;
        }

        .message.success {
            background: #d4edda;
            color: #155724;
            border-left-color: #28a745;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
            border-left-color: #dc3545;
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .team-assignment {
                grid-template-columns: 1fr;
            }
            
            .navigation-buttons, .action-buttons {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <a href="index.php" class="back-btn">← חזור לפרויקטים</a>
            <h1>🚀 יצירת פרויקט חדש</h1>
            <p>צור פרויקט תמלול חדש עם כל הפרטים הנדרשים</p>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Step Indicator -->
            <div class="step-indicator">
                <div class="step active" data-step="1">1</div>
                <div class="step" data-step="2">2</div>
                <div class="step" data-step="3">3</div>
                <div class="step" data-step="4">4</div>
            </div>

            <!-- Messages -->
            <?php if (!empty($message)): ?>
                <div class="message success">
                    ✅ <?= $message ?>
                </div>
            <?php endif; ?>
            
            <?php if (!empty($error)): ?>
                <div class="message error">
                    ❌ <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form method="POST" enctype="multipart/form-data" id="projectForm">
                <input type="hidden" name="action" value="create_project">
                
                <!-- Step 1: Basic project details -->
                <div class="form-section" data-step="1">
                    <h3 class="section-title">📋 פרטי פרויקט בסיסיים</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>שם הפרויקט *</label>
                            <input type="text" name="title" class="form-control" placeholder="לדוגמה: תמלול פגישת דירקטוריון" required>
                        </div>
                        <div class="form-group">
                            <label>לקוח</label>
                            <select name="client_id" class="form-control">
                                <option value="">בחר לקוח</option>
                                <?php foreach ($clients as $client): ?>
                                    <option value="<?php echo $client['id']; ?>">
                                        <?php echo htmlspecialchars($client['name'] . ' - ' . $client['company']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>סוג עבודה</label>
                            <select name="project_type" class="form-control">
                                <option value="transcription">תמלול</option>
                                <option value="proofreading">הגהה</option>
                                <option value="translation">תרגום</option>
                                <option value="editing">עריכה</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>תאריך יעד</label>
                            <input type="date" name="target_date" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>דחיפות</label>
                            <div class="priority-selector">
                                <div class="priority-option priority-high" data-priority="high">
                                    <div>🔥 גבוהה</div>
                                </div>
                                <div class="priority-option priority-medium selected" data-priority="medium">
                                    <div>⚡ בינונית</div>
                                </div>
                                <div class="priority-option priority-low" data-priority="low">
                                    <div>✅ נמוכה</div>
                                </div>
                            </div>
                            <input type="hidden" name="priority" value="medium">
                        </div>
                        <div class="form-group">
                            <label>תקציב משוער</label>
                            <input type="number" name="budget" class="form-control" placeholder="₪0">
                        </div>
                        <div class="form-group full-width">
                            <label>תיאור הפרויקט</label>
                            <textarea name="description" class="form-control" rows="4" placeholder="תאר את הפרויקט, דרישות מיוחדות, הערות..."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Step 2: File upload -->
                <div class="form-section hidden" data-step="2">
                    <h3 class="section-title">📁 העלאת קבצי מדיה</h3>
                    <div class="form-group">
                        <label>קבצי מדיה *</label>
                        <div class="upload-area" onclick="document.getElementById('mediaFiles').click()">
                            <div class="upload-icon">📤</div>
                            <div class="upload-text">גרור קבצים לכאן או לחץ לבחירה</div>
                            <div class="upload-hint">תמיכה בפורמטים: MP3, WAV, MP4, M4A (עד 500MB לקובץ)</div>
                        </div>
                        <input type="file" id="mediaFiles" name="media_files[]" multiple accept=".mp3,.wav,.mp4,.m4a" style="display: none;">
                        <div id="mediaFilesList"></div>
                    </div>
                </div>

                <!-- Step 3: Helper documents and team assignment -->
                <div class="form-section hidden" data-step="3">
                    <h3 class="section-title">📄 דפי עזר ומסמכים</h3>
                    <div class="form-group">
                        <label>הערות למתמלל</label>
                        <textarea name="notes" class="form-control" rows="3" placeholder="הערות חשובות למתמלל (טרמינולוגיה, הנחיות מיוחדות...)"></textarea>
                    </div>
                    <div class="form-group">
                        <label>רשימת דוברים</label>
                        <textarea name="speakers" class="form-control" rows="3" placeholder="רשימת דוברים וזיהוי קולות (אופציונלי)"></textarea>
                    </div>
                    <div class="form-group">
                        <label>דפי עזר נוספים</label>
                        <div class="upload-area" onclick="document.getElementById('helperFiles').click()">
                            <div class="upload-icon" style="font-size: 24px;">📋</div>
                            <div class="upload-text" style="font-size: 14px;">העלה דפי עזר (PDF, DOC, DOCX, TXT)</div>
                        </div>
                        <input type="file" id="helperFiles" name="helper_files[]" multiple accept=".pdf,.doc,.docx,.txt" style="display: none;">
                        <div id="helperFilesList"></div>
                    </div>
                    
                    <!-- Team Assignment -->
                    <h3 class="section-title" style="margin-top: 30px;">👥 הקצאת צוות</h3>
                    <div class="team-assignment">
                        <?php foreach ($transcriptors as $transcriptor): ?>
                            <div class="team-member" data-role="transcriber" data-id="<?php echo $transcriptor['id']; ?>">
                                <div class="member-avatar"><?php echo strtoupper(substr($transcriptor['name'], 0, 1)); ?></div>
                                <div class="member-name"><?php echo htmlspecialchars($transcriptor['name']); ?></div>
                                <div class="member-role">מתמלל</div>
                                <div class="member-status">זמין</div>
                            </div>
                        <?php endforeach; ?>
                        
                        <?php foreach ($proofreaders as $proofreader): ?>
                            <div class="team-member" data-role="proofreader" data-id="<?php echo $proofreader['id']; ?>">
                                <div class="member-avatar"><?php echo strtoupper(substr($proofreader['name'], 0, 1)); ?></div>
                                <div class="member-name"><?php echo htmlspecialchars($proofreader['name']); ?></div>
                                <div class="member-role">מגיה</div>
                                <div class="member-status">זמין</div>
                            </div>
                        <?php endforeach; ?>
                        
                        <?php foreach ($exporters as $exporter): ?>
                            <div class="team-member" data-role="exporter" data-id="<?php echo $exporter['id']; ?>">
                                <div class="member-avatar"><?php echo strtoupper(substr($exporter['name'], 0, 1)); ?></div>
                                <div class="member-name"><?php echo htmlspecialchars($exporter['name']); ?></div>
                                <div class="member-role">מייצא</div>
                                <div class="member-status">זמין</div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Step 4: Cost calculation -->
                <div class="form-section hidden" data-step="4">
                    <h3 class="section-title">💰 חישוב עלויות</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>מספר עמודים משוער</label>
                            <input type="number" name="estimated_pages" class="form-control" placeholder="20" id="estimatedPages">
                        </div>
                        <div class="form-group">
                            <label>מחיר לעמוד</label>
                            <input type="number" name="price_per_page" class="form-control" placeholder="15" id="pricePerPage">
                        </div>
                    </div>
                    <div class="cost-calculator" id="costCalculator">
                        <div class="cost-item">
                            <span class="cost-label">תמלול (20 עמודים × ₪15)</span>
                            <span class="cost-value">₪300</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">הגהה (20%)</span>
                            <span class="cost-value">₪60</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">ייצוא וטיפול</span>
                            <span class="cost-value">₪40</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">דמי ניהול (5%)</span>
                            <span class="cost-value">₪20</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">סה"כ ללקוח</span>
                            <span class="cost-value">₪420</span>
                        </div>
                    </div>
                </div>

                <!-- Hidden fields for team assignments -->
                <input type="hidden" name="assigned_transcriber" id="assignedTranscriber">
                <input type="hidden" name="assigned_proofreader" id="assignedProofreader">
                <input type="hidden" name="assigned_exporter" id="assignedExporter">

                <!-- Navigation buttons -->
                <div class="navigation-buttons">
                    <button type="button" class="btn btn-secondary" id="prevStep" style="display: none;">
                        ⬅️ קודם
                    </button>
                    <button type="button" class="btn btn-primary" id="nextStep">
                        הבא ➡️
                    </button>
                </div>

                <!-- Final action buttons -->
                <div class="action-buttons" id="finalActions" style="display: none;">
                    <button type="submit" class="btn btn-primary">
                        🚀 יצור פרויקט
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="location.href='index.php'">
                        ❌ בטל
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Step navigation functionality
            let currentStep = 1;
            const totalSteps = 4;

            function showStep(step) {
                // Hide all form sections
                document.querySelectorAll('.form-section').forEach(section => {
                    section.classList.add('hidden');
                });

                // Show sections for current step
                document.querySelectorAll(`[data-step="${step}"]`).forEach(section => {
                    section.classList.remove('hidden');
                });

                // Update step indicators
                document.querySelectorAll('.step').forEach(stepEl => {
                    stepEl.classList.remove('active');
                });
                document.querySelector(`.step[data-step="${step}"]`).classList.add('active');

                // Update navigation buttons
                const prevBtn = document.getElementById('prevStep');
                const nextBtn = document.getElementById('nextStep');
                const finalActions = document.getElementById('finalActions');

                if (step === 1) {
                    prevBtn.style.display = 'none';
                } else {
                    prevBtn.style.display = 'inline-flex';
                }

                if (step === totalSteps) {
                    nextBtn.style.display = 'none';
                    finalActions.style.display = 'flex';
                } else {
                    nextBtn.style.display = 'inline-flex';
                    finalActions.style.display = 'none';
                }

                currentStep = step;
            }

            // Validation function for each step
            function validateStep(step) {
                let isValid = true;
                
                switch(step) {
                    case 1:
                        // Basic project details - check if project name is filled
                        const projectName = document.querySelector('[name="title"]').value;
                        if (!projectName.trim()) {
                            alert('אנא הכנס שם פרויקט');
                            isValid = false;
                        }
                        break;
                    case 2:
                        // File upload - check if media files are selected
                        const mediaFiles = document.getElementById('mediaFiles').files;
                        if (mediaFiles.length === 0) {
                            alert('אנא בחר לפחות קובץ מדיה אחד');
                            isValid = false;
                        }
                        break;
                    case 3:
                        // Team assignment - check if at least one team member is selected
                        const selectedMembers = document.querySelectorAll('.team-member.selected');
                        if (selectedMembers.length === 0) {
                            alert('אנא בחר לפחות חבר צוות אחד');
                            isValid = false;
                        }
                        break;
                    case 4:
                        // Cost calculation - no specific validation needed
                        break;
                }
                
                return isValid;
            }

            // Initialize first step
            showStep(1);

            // Step indicator click handlers
            document.querySelectorAll('.step').forEach(step => {
                step.addEventListener('click', function() {
                    const stepNumber = parseInt(this.getAttribute('data-step'));
                    showStep(stepNumber);
                });
            });

            // Navigation button handlers
            document.getElementById('nextStep').addEventListener('click', function() {
                if (validateStep(currentStep) && currentStep < totalSteps) {
                    showStep(currentStep + 1);
                }
            });

            document.getElementById('prevStep').addEventListener('click', function() {
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            });

            // File upload handlers
            function handleFileDisplay(input, listId) {
                const fileList = document.getElementById(listId);
                fileList.innerHTML = '';
                
                Array.from(input.files).forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;';
                    fileItem.innerHTML = `
                        <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)
                    `;
                    fileList.appendChild(fileItem);
                });
            }

            document.getElementById('mediaFiles').addEventListener('change', function() {
                handleFileDisplay(this, 'mediaFilesList');
            });

            document.getElementById('helperFiles').addEventListener('change', function() {
                handleFileDisplay(this, 'helperFilesList');
            });

            // Team member selection
            document.querySelectorAll('.team-member').forEach(member => {
                member.addEventListener('click', function() {
                    const role = this.getAttribute('data-role');
                    const id = this.getAttribute('data-id');
                    
                    // Remove selection from same role
                    document.querySelectorAll(`.team-member[data-role="${role}"]`).forEach(m => m.classList.remove('selected'));
                    
                    // Add selection to this member
                    this.classList.add('selected');
                    
                    // Update hidden field
                    if (role === 'transcriber') {
                        document.getElementById('assignedTranscriber').value = id;
                    } else if (role === 'proofreader') {
                        document.getElementById('assignedProofreader').value = id;
                    } else if (role === 'exporter') {
                        document.getElementById('assignedExporter').value = id;
                    }
                });
            });

            // Priority selection
            document.querySelectorAll('.priority-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    
                    const priority = this.getAttribute('data-priority');
                    document.querySelector('input[name="priority"]').value = priority;
                });
            });

            // Cost calculator
            function updateCosts() {
                const pages = parseInt(document.getElementById('estimatedPages').value) || 20;
                const pricePerPage = parseInt(document.getElementById('pricePerPage').value) || 15;
                
                const transcriptionCost = pages * pricePerPage;
                const proofreadingCost = Math.round(transcriptionCost * 0.2);
                const exportCost = 40;
                const managementCost = Math.round(transcriptionCost * 0.05);
                const totalCost = transcriptionCost + proofreadingCost + exportCost + managementCost;
                
                document.getElementById('costCalculator').innerHTML = `
                    <div class="cost-item">
                        <span class="cost-label">תמלול (${pages} עמודים × ₪${pricePerPage})</span>
                        <span class="cost-value">₪${transcriptionCost}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">הגהה (20%)</span>
                        <span class="cost-value">₪${proofreadingCost}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">ייצוא וטיפול</span>
                        <span class="cost-value">₪${exportCost}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">דמי ניהול (5%)</span>
                        <span class="cost-value">₪${managementCost}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">סה"כ ללקוח</span>
                        <span class="cost-value">₪${totalCost}</span>
                    </div>
                `;
            }

            document.getElementById('estimatedPages').addEventListener('input', updateCosts);
            document.getElementById('pricePerPage').addEventListener('input', updateCosts);

            // Initialize costs
            updateCosts();
        });
    </script>
</body>
</html>