<?php
/*
 * File Manager for Large Files
 * Handles copying large files directly to project folders
 * Bypasses browser upload limits
 */

session_name('CRM_SESSION');
session_start();

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    die("No company found for user");
}

// Get projects
$projectsStmt = $pdo->prepare("SELECT id, title, folder_path FROM projects WHERE company_id = ? ORDER BY created_at DESC");
$projectsStmt->execute([$company['id']]);
$projects = $projectsStmt->fetchAll();

// Handle file operations
$message = null;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['action']) && $_POST['action'] == 'copy_files') {
        $projectId = $_POST['project_id'];
        $sourceFolder = $_POST['source_folder'];
        $fileCategory = $_POST['file_category'] ?? 'media';
        
        // Get project details
        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
        $projectStmt->execute([$projectId, $company['id']]);
        $project = $projectStmt->fetch();
        
        if ($project) {
            $targetFolder = $project['folder_path'];
            
            // Create target subdirectory based on category
            $categoryFolder = $targetFolder . '/' . $fileCategory;
            if (!file_exists($categoryFolder)) {
                mkdir($categoryFolder, 0777, true);
            }
            
            // Copy files from source to target
            if (is_dir($sourceFolder)) {
                $files = scandir($sourceFolder);
                $copiedFiles = 0;
                
                foreach ($files as $file) {
                    if ($file != '.' && $file != '..') {
                        $sourcePath = $sourceFolder . '/' . $file;
                        $targetPath = $categoryFolder . '/' . $file;
                        
                        if (is_file($sourcePath)) {
                            if (copy($sourcePath, $targetPath)) {
                                // Add to database
                                $fileType = pathinfo($file, PATHINFO_EXTENSION);
                                $relativePath = str_replace('../../', '', $targetPath);
                                
                                $fileStmt = $pdo->prepare("INSERT INTO project_files (project_id, filename, file_path, file_type, file_category) VALUES (?, ?, ?, ?, ?)");
                                $fileStmt->execute([$projectId, $file, $relativePath, $fileType, $fileCategory]);
                                
                                $copiedFiles++;
                            }
                        }
                    }
                }
                
                $message = "הועתקו {$copiedFiles} קבצים בהצלחה";
            } else {
                $message = "התיקיה לא נמצאה";
            }
        } else {
            $message = "פרויקט לא נמצא";
        }
    }
}

// Get available source folders (you can customize this)
$possibleSourceFolders = [
    '/var/www/html/uploads/temp_large_files/',
    '/tmp/large_files/',
    '/var/www/html/uploads/manual_upload/',
];

$availableFolders = [];
foreach ($possibleSourceFolders as $folder) {
    if (is_dir($folder)) {
        $availableFolders[] = $folder;
    }
}
?>

<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <title>מנהל קבצים גדולים - CRM</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        select, input, button { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background: #007cba; color: white; cursor: pointer; width: auto; }
        button:hover { background: #005a8b; }
        .message { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .file-list { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .back-link { display: inline-block; margin-bottom: 20px; color: #007cba; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="index.php" class="back-link">← חזרה לדף הראשי</a>
        
        <h1>מנהל קבצים גדולים</h1>
        
        <div class="info">
            <h3>הוראות שימוש:</h3>
            <p>1. העתק את הקבצים הגדולים שלך לתיקיית השרת (באמצעות FTP, SSH, או גישה פיזית)</p>
            <p>2. בחר את הפרויקט שאליו תרצה להעתיק את הקבצים</p>
            <p>3. בחר את תיקיית המקור ואת סוג הקבצים</p>
            <p>4. הקבצים יועתקו ויתווספו למסד הנתונים אוטומטית</p>
        </div>

        <?php if ($message): ?>
            <div class="message <?php echo strpos($message, 'שגיאה') !== false ? 'error' : ''; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>

        <div class="card">
            <h2>העתקת קבצים גדולים</h2>
            
            <form method="POST">
                <input type="hidden" name="action" value="copy_files">
                
                <div class="form-group">
                    <label>בחר פרויקט:</label>
                    <select name="project_id" required>
                        <option value="">-- בחר פרויקט --</option>
                        <?php foreach ($projects as $project): ?>
                            <option value="<?php echo $project['id']; ?>">
                                <?php echo htmlspecialchars($project['title']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>תיקיית מקור:</label>
                    <select name="source_folder" required>
                        <option value="">-- בחר תיקיית מקור --</option>
                        <?php foreach ($availableFolders as $folder): ?>
                            <option value="<?php echo $folder; ?>"><?php echo $folder; ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>סוג קבצים:</label>
                    <select name="file_category">
                        <option value="media">מדיה (אודיו/וידאו)</option>
                        <option value="documents">מסמכים</option>
                        <option value="helper">קבצי עזר</option>
                        <option value="general">כללי</option>
                    </select>
                </div>
                
                <button type="submit">העתק קבצים</button>
            </form>
        </div>

        <div class="card">
            <h2>רשימת פרויקטים</h2>
            <?php if (empty($projects)): ?>
                <p>אין פרויקטים זמינים</p>
            <?php else: ?>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; border: 1px solid #ddd;">כותרת</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">תיקיית פרויקט</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">מספר קבצים</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($projects as $project): ?>
                            <?php
                            $filesStmt = $pdo->prepare("SELECT COUNT(*) FROM project_files WHERE project_id = ?");
                            $filesStmt->execute([$project['id']]);
                            $filesCount = $filesStmt->fetchColumn();
                            ?>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><?php echo htmlspecialchars($project['title']); ?></td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><?php echo htmlspecialchars($project['folder_path']); ?></td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><?php echo $filesCount; ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>