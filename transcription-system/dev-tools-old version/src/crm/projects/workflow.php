<?php
/*
 * =========================================
 * מערכת CRM - ניהול שלבי עבודה
 * crm_system/projects/workflow.php
 * =========================================
 * מודול ניהול שלבי העבודה של פרויקט ספציפי
 * מאפשר שליחה בין שלבי תמלול, הגהה וייצוא
 * תמיכה בסוגי פרויקטים שונים עם גמישות בזרימת העבודה
 * נגיש למשתמשים עם הרשאה B
 */

session_name('CRM_SESSION');
session_start();

// Function to preserve development navigation parameters
function preserveDevParams($url) {
    $params = [];
    if (isset($_GET['devnav'])) $params[] = 'devnav=' . $_GET['devnav'];
    if (isset($_GET['dev'])) $params[] = 'dev=' . $_GET['dev'];
    
    if (empty($params)) {
        return $url;
    }
    
    $separator = (strpos($url, '?') !== false) ? '&' : '?';
    return $url . $separator . implode('&', $params);
}

// Database connection
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // **UTF-8 encoding settings**
    $pdo->exec("SET NAMES utf8");
    $pdo->exec("SET CHARACTER SET utf8");
    $pdo->exec("SET character_set_connection=utf8");
    $pdo->exec("SET character_set_client=utf8");
    $pdo->exec("SET character_set_results=utf8");
    
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// פונקציה משופרת לקריאת קבצים שונים עם קידוד UTF-8 נכון
function readFileContent($filePath) {
    if (!file_exists($filePath)) {
        error_log("File not found: $filePath");
        return false;
    }
    
    $fileInfo = pathinfo($filePath);
    $extension = strtolower($fileInfo['extension'] ?? '');
    $fileSize = filesize($filePath);
    
    // בדיקת גודל קובץ
    if ($fileSize === 0) {
        error_log("Empty file: $filePath");
        return false;
    }
    
    if ($fileSize > 50 * 1024 * 1024) { // 50MB
        error_log("File too large: $filePath, size: $fileSize");
        return false;
    }
    
    error_log("Processing file: $filePath, extension: $extension, size: $fileSize");
    
    switch ($extension) {
        case 'txt':
            return processTxtFile($filePath);
            
        case 'doc':
            return processDocFile($filePath);
            
        case 'docx':
            // קובץ DOCX - נשתמש בהמרה מ-JavaScript
            error_log("DOCX file detected, returning false for JS conversion: $filePath");
            return false;
            
        default:
            // קובץ לא נתמך - נסה לקרוא כטקסט רק אם זה נראה כמו טקסט
            return processUnknownFile($filePath);
    }
}

// פונקציה לעיבוד קבצי TXT
function processTxtFile($filePath) {
    $content = file_get_contents($filePath);
    if ($content === false) {
        error_log("Failed to read TXT file: $filePath");
        return false;
    }
    
    // הסר BOM אם קיים
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
    
    // בדיקה אם התוכן כבר UTF-8 תקין
    if (mb_check_encoding($content, 'UTF-8')) {
        return $content;
    }
    
    return convertTextToUTF8($content);
}

// פונקציה לעיבוד קבצי DOC
function processDocFile($filePath) {
    $content = file_get_contents($filePath);
    if ($content === false) {
        error_log("Failed to read DOC file: $filePath");
        return false;
    }
    
    // בדיקה אם זה באמת קובץ DOC ולא קובץ בינארי אחר
    if (substr($content, 0, 2) === 'PK') {
        error_log("DOC file appears to be ZIP format (possibly DOCX): $filePath");
        return false; // זה DOCX או ZIP
    }
    
    // הסרת תווים בינאריים ושמירה על טקסט בלבד
    $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u', '', $content);
    
    // נסה להמיר רק אם יש תוכן משמעותי
    if (strlen(trim($content)) < 10) {
        error_log("DOC file contains insufficient text content: $filePath");
        return false;
    }
    
    return convertTextToUTF8($content);
}

// פונקציה לעיבוד קבצים לא מוכרים
function processUnknownFile($filePath) {
    $content = file_get_contents($filePath);
    if ($content === false) {
        return false;
    }
    
    // בדיקה אם זה קובץ בינארי (ZIP, etc.)
    if (substr($content, 0, 2) === 'PK' || 
        substr($content, 0, 4) === "\x50\x4B\x03\x04" ||
        !mb_check_encoding($content, 'ASCII')) {
        error_log("File appears to be binary, not text: $filePath");
        return false;
    }
    
    return convertTextToUTF8($content);
}

// פונקציה עזר להמרת טקסט ל-UTF-8
function convertTextToUTF8($content) {
    // רשימת קידודים נפוצים בפורמט הנכון ל-PHP
    $encodings = [
        'UTF-8',
        'ISO-8859-8',     // עברית ISO
        'CP1255',         // עברית Windows (הפורמט הנכון)
        'CP862',          // עברית DOS
        'ISO-8859-1',     // Latin-1
        'CP1252',         // Windows Latin
        'ASCII'
    ];
    
    // בדיקה והמרה עם כל קידוד
    foreach ($encodings as $encoding) {
        try {
            // בדוק אם הקידוד נתמך
            if (!in_array($encoding, mb_list_encodings())) {
                continue;
            }
            
            // בדוק אם התוכן תואם לקידוד הזה
            if (mb_check_encoding($content, $encoding)) {
                if ($encoding === 'UTF-8') {
                    return $content; // כבר UTF-8
                } else {
                    $converted = mb_convert_encoding($content, 'UTF-8', $encoding);
                    if ($converted !== false) {
                        return $converted;
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Encoding conversion failed for $encoding: " . $e->getMessage());
            continue; // נסה הקידוד הבא
        }
    }
    
    // אם שום קידוד לא עבד, נסה עם IGNORE
    try {
        return mb_convert_encoding($content, 'UTF-8', 'UTF-8//IGNORE');
    } catch (Exception $e) {
        error_log("Final fallback encoding failed: " . $e->getMessage());
        return false;
    }
}

// פונקציה לשמירת טקסט עם קידוד UTF-8 נכון
function saveTextWithUTF8($filePath, $content) {
    if (empty($content)) {
        error_log("Attempting to save empty content to: $filePath");
        return false;
    }
    
    // ודא שהתוכן הוא UTF-8 תקין
    if (!mb_check_encoding($content, 'UTF-8')) {
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8//IGNORE');
    }
    
    // הוסף BOM לוידוא קריאה נכונה
    $content = "\xEF\xBB\xBF" . $content;
    
    $result = file_put_contents($filePath, $content, LOCK_EX);
    if ($result === false) {
        error_log("Failed to save file: $filePath");
    } else {
        error_log("Successfully saved file: $filePath, bytes: $result");
    }
    
    return $result;
}

// פונקציה לבדיקת תקינות קובץ לפני עיבוד
function validateFileForProcessing($filePath) {
    if (!file_exists($filePath)) {
        return ['valid' => false, 'error' => 'קובץ לא נמצא'];
    }
    
    $fileSize = filesize($filePath);
    if ($fileSize === 0) {
        return ['valid' => false, 'error' => 'קובץ ריק'];
    }
    
    if ($fileSize > 50 * 1024 * 1024) { // 50MB
        return ['valid' => false, 'error' => 'קובץ גדול מדי (מעל 50MB)'];
    }
    
    $fileInfo = pathinfo($filePath);
    $allowedExtensions = ['txt', 'doc', 'docx'];
    
    if (!in_array(strtolower($fileInfo['extension'] ?? ''), $allowedExtensions)) {
        return ['valid' => false, 'error' => 'סוג קובץ לא נתמך. נתמכים: TXT, DOC, DOCX'];
    }
    
    // בדיקה נוספת לקבצים בינאריים
    if (in_array(strtolower($fileInfo['extension'] ?? ''), ['doc', 'docx'])) {
        $handle = fopen($filePath, 'rb');
        if ($handle) {
            $header = fread($handle, 4);
            fclose($handle);
            
            // זיהוי קבצי ZIP (DOCX)
            if ($header === "PK\x03\x04") {
                return ['valid' => true, 'info' => 'קובץ DOCX זוהה - יעבור המרה ב-JavaScript'];
            }
        }
    }
    
    return ['valid' => true];
}

// פונקציה עזר לבדיקת קידודים נתמכים
function getSupportedEncodings() {
    $allEncodings = mb_list_encodings();
    $hebrewEncodings = [];
    
    $hebrewEncodingNames = ['UTF-8', 'ISO-8859-8', 'CP1255', 'CP862'];
    
    foreach ($hebrewEncodingNames as $encoding) {
        if (in_array($encoding, $allEncodings)) {
            $hebrewEncodings[] = $encoding;
        }
    }
    
    return $hebrewEncodings;
}

// הוספת עמודות חסרות לטבלת projects
try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_backup TEXT NULL");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_backup_date DATETIME NULL");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN transcription_completed_by INT NULL");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'pending'");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN project_type VARCHAR(50) DEFAULT 'regular'");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN initial_transcription_uploaded BOOLEAN DEFAULT FALSE");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN initial_proofread_uploaded BOOLEAN DEFAULT FALSE");
} catch (Exception $e) {}

// Login check
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

// Check permissions
$userPermissions = $_SESSION['permissions'];
$hasA = strpos($userPermissions, 'A') !== false;
$hasB = strpos($userPermissions, 'B') !== false;
$hasC = strpos($userPermissions, 'C') !== false;

if (!$hasB) {
    header("Location: ../index.php");
    exit;
}

// Get user's company
$companyStmt = $pdo->prepare("SELECT id FROM companies WHERE user_id = ?");
$companyStmt->execute([$_SESSION['user_id']]);
$company = $companyStmt->fetch();

if (!$company) {
    die("Company not found");
}

$message = null;

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            
            case 'send_to_transcription':
                $projectId = $_POST['project_id'];
                $transcriberId = $_POST['transcriber_id'];
                
                try {
                    // Handle optional transcription file upload
                    if (isset($_FILES['transcription_file']) && $_FILES['transcription_file']['error'] == 0) {
                        $uploadedFile = $_FILES['transcription_file']['tmp_name'];
                        $transcriptionContent = readFileContent($uploadedFile);
                        
                        if ($transcriptionContent !== false) {
                            // שמירה בתיקיית הפרויקט
                            $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                            $projectStmt->execute([$projectId, $company['id']]);
                            $project = $projectStmt->fetch();
                            
                            if ($project) {
                                $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                                saveTextWithUTF8($transcriptionFile, $transcriptionContent);
                                
                                // שמירה בגיבוי במסד הנתונים
                                $backupStmt = $pdo->prepare("UPDATE projects SET transcription_backup = ?, transcription_backup_date = NOW() WHERE id = ?");
                                $backupStmt->execute([$transcriptionContent, $projectId]);
                            }
                        }
                    }
                    
                    // Handle converted content from JavaScript
                    if (isset($_POST['converted_content']) && !empty($_POST['converted_content'])) {
                        $convertedContent = $_POST['converted_content'];
                        
                        // שמירה בתיקיית הפרויקט
                        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                            saveTextWithUTF8($transcriptionFile, $convertedContent);
                            
                            // שמירה בגיבוי במסד הנתונים
                            $backupStmt = $pdo->prepare("UPDATE projects SET transcription_backup = ?, transcription_backup_date = NOW() WHERE id = ?");
                            $backupStmt->execute([$convertedContent, $projectId]);
                        }
                    }
                    
                    // Update project
                    $stmt = $pdo->prepare("UPDATE projects SET assigned_transcriber_id = ?, status = 'in_progress', workflow_status = 'ready_for_transcription' WHERE id = ? AND company_id = ?");
                    $stmt->execute([$transcriberId, $projectId, $company['id']]);
                    
                    $message = "הפרויקט נשלח לתמלול בהצלחה";
                    
                } catch (Exception $e) {
                    $message = "שגיאה בשליחה לתמלול: " . $e->getMessage();
                }
                break;
                
            case 'send_to_proofreading':
                $projectId = $_POST['project_id'];
                $proofreaderId = $_POST['proofreader_id'];
                
                try {
                    $contentToSave = null;
                    
                    // Handle optional transcription file upload for proofreading
                    if (isset($_FILES['transcription_file']) && $_FILES['transcription_file']['error'] == 0) {
                        $uploadedFile = $_FILES['transcription_file']['tmp_name'];
                        $contentToSave = readFileContent($uploadedFile);
                    }
                    
                    // Handle converted content from JavaScript
                    if (isset($_POST['converted_content']) && !empty($_POST['converted_content'])) {
                        $contentToSave = $_POST['converted_content'];
                    }
                    
                    if ($contentToSave !== null) {
                        // Get project details
                        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                            $proofreadFile = $project['folder_path'] . '/proofread.txt';
                            
                            // שמירת התמלול
                            saveTextWithUTF8($transcriptionFile, $contentToSave);
                            // שמירת עותק להגהה
                            saveTextWithUTF8($proofreadFile, $contentToSave);
                            
                            // שמירה בגיבוי במסד הנתונים
                            $backupStmt = $pdo->prepare("UPDATE projects SET transcription_backup = ?, transcription_backup_date = NOW() WHERE id = ?");
                            $backupStmt->execute([$contentToSave, $projectId]);
                        }
                    } else {
                        // אם לא הועלה קובץ, השתמש בתמלול קיים
                        $projectStmt = $pdo->prepare("SELECT folder_path, transcription_backup FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $proofreadFile = $project['folder_path'] . '/proofread.txt';
                            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                            
                            // קבע תוכן להגהה
                            $contentForProofread = '';
                            if (!empty($project['transcription_backup'])) {
                                $contentForProofread = $project['transcription_backup'];
                            } elseif (file_exists($transcriptionFile)) {
                                $contentForProofread = file_get_contents($transcriptionFile);
                            }
                            
                            // צור קובץ הגהה
                            if (!empty($contentForProofread)) {
                                saveTextWithUTF8($proofreadFile, $contentForProofread);
                            }
                        }
                    }
                    
                    // Update project
                    $stmt = $pdo->prepare("UPDATE projects SET assigned_proofreader_id = ?, workflow_status = 'ready_for_proofreading' WHERE id = ? AND company_id = ?");
                    $stmt->execute([$proofreaderId, $projectId, $company['id']]);
                    
                    $message = "הפרויקט נשלח להגהה בהצלחה";
                    
                } catch (Exception $e) {
                    $message = "שגיאה בשליחה להגהה: " . $e->getMessage();
                }
                break;
                
            case 'send_to_export':
                $projectId = $_POST['project_id'];
                $exporterId = $_POST['exporter_id'];
                
                try {
                    $contentToSave = null;
                    
                    // Handle optional proofread file upload for export
                    if (isset($_FILES['proofread_file']) && $_FILES['proofread_file']['error'] == 0) {
                        $uploadedFile = $_FILES['proofread_file']['tmp_name'];
                        $contentToSave = readFileContent($uploadedFile);
                    }
                    
                    // Handle converted content from JavaScript
                    if (isset($_POST['converted_proofread_content']) && !empty($_POST['converted_proofread_content'])) {
                        $contentToSave = $_POST['converted_proofread_content'];
                    }
                    
                    if ($contentToSave !== null) {
                        // Save uploaded proofread file
                        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $proofreadFile = $project['folder_path'] . '/proofread.txt';
                            saveTextWithUTF8($proofreadFile, $contentToSave);
                        }
                    }
                    
                    // Update project
                    $stmt = $pdo->prepare("UPDATE projects SET assigned_exporter_id = ?, status = 'completed', workflow_status = 'ready_for_export' WHERE id = ? AND company_id = ?");
                    $stmt->execute([$exporterId, $projectId, $company['id']]);
                    
                    $message = "הפרויקט נשלח לייצוא בהצלחה";
                    
                } catch (Exception $e) {
                    $message = "שגיאה בשליחה לייצוא: " . $e->getMessage();
                }
                break;
                
            case 'send_direct_to_proofreading':
                // שליחה ישירה להגהה ללא תלות בתמלול
                $projectId = $_POST['project_id'];
                $proofreaderId = $_POST['proofreader_id'];
                
                try {
                    $contentToSave = null;
                    
                    // Handle transcription file upload for proofreading
                    if (isset($_FILES['transcription_file']) && $_FILES['transcription_file']['error'] == 0) {
                        $uploadedFile = $_FILES['transcription_file']['tmp_name'];
                        $contentToSave = readFileContent($uploadedFile);
                    }
                    
                    // Handle converted content from JavaScript
                    if (isset($_POST['converted_content']) && !empty($_POST['converted_content'])) {
                        $contentToSave = $_POST['converted_content'];
                    }
                    
                    if ($contentToSave !== null) {
                        // Save transcription file
                        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                            $proofreadFile = $project['folder_path'] . '/proofread.txt';
                            
                            // שמירת התמלול
                            saveTextWithUTF8($transcriptionFile, $contentToSave);
                            // שמירת עותק להגהה
                            saveTextWithUTF8($proofreadFile, $contentToSave);
                            
                            // שמירה בגיבוי במסד הנתונים
                            $backupStmt = $pdo->prepare("UPDATE projects SET transcription_backup = ?, transcription_backup_date = NOW() WHERE id = ?");
                            $backupStmt->execute([$contentToSave, $projectId]);
                        }
                    }
                    
                    // Update project
                    $stmt = $pdo->prepare("UPDATE projects SET assigned_proofreader_id = ?, workflow_status = 'ready_for_proofreading', status = 'in_progress' WHERE id = ? AND company_id = ?");
                    $stmt->execute([$proofreaderId, $projectId, $company['id']]);
                    
                    $message = "הפרויקט נשלח ישירות להגהה בהצלחה";
                    
                } catch (Exception $e) {
                    $message = "שגיאה בשליחה ישירות להגהה: " . $e->getMessage();
                }
                break;
                
            case 'send_direct_to_export':
                // שליחה ישירה לייצוא ללא תלות בשלבים קודמים
                $projectId = $_POST['project_id'];
                $exporterId = $_POST['exporter_id'];
                
                try {
                    $contentToSave = null;
                    
                    // Handle proofread file upload for export
                    if (isset($_FILES['proofread_file']) && $_FILES['proofread_file']['error'] == 0) {
                        $uploadedFile = $_FILES['proofread_file']['tmp_name'];
                        $contentToSave = readFileContent($uploadedFile);
                    }
                    
                    // Handle converted content from JavaScript
                    if (isset($_POST['converted_proofread_content']) && !empty($_POST['converted_proofread_content'])) {
                        $contentToSave = $_POST['converted_proofread_content'];
                    }
                    
                    if ($contentToSave !== null) {
                        // Save proofread file
                        $projectStmt = $pdo->prepare("SELECT folder_path FROM projects WHERE id = ? AND company_id = ?");
                        $projectStmt->execute([$projectId, $company['id']]);
                        $project = $projectStmt->fetch();
                        
                        if ($project) {
                            $proofreadFile = $project['folder_path'] . '/proofread.txt';
                            $transcriptionFile = $project['folder_path'] . '/transcription.txt';
                            
                            // שמירת קובץ ההגהה
                            saveTextWithUTF8($proofreadFile, $contentToSave);
                            
                            // אם אין תמלול, שמור גם שם
                            if (!file_exists($transcriptionFile)) {
                                saveTextWithUTF8($transcriptionFile, $contentToSave);
                                
                                // שמירה בגיבוי במסד הנתונים
                                $backupStmt = $pdo->prepare("UPDATE projects SET transcription_backup = ?, transcription_backup_date = NOW() WHERE id = ?");
                                $backupStmt->execute([$contentToSave, $projectId]);
                            }
                        }
                    }
                    
                    // Update project
                    $stmt = $pdo->prepare("UPDATE projects SET assigned_exporter_id = ?, workflow_status = 'ready_for_export', status = 'completed' WHERE id = ? AND company_id = ?");
                    $stmt->execute([$exporterId, $projectId, $company['id']]);
                    
                    $message = "הפרויקט נשלח ישירות לייצוא בהצלחה";
                    
                } catch (Exception $e) {
                    $message = "שגיאה בשליחה ישירות לייצוא: " . $e->getMessage();
                }
                break;
        }
    }
}

// Get project info if specified
$projectId = isset($_GET['project']) ? (int)$_GET['project'] : null;
$project = null;

if ($projectId) {
    $projectStmt = $pdo->prepare("
        SELECT p.*, c.name as client_name, c.company as client_company
        FROM projects p 
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = ? AND p.company_id = ?
    ");
    $projectStmt->execute([$projectId, $company['id']]);
    $project = $projectStmt->fetch();
}

if (!$project && $projectId) {
    die("Project not found");
}

// Check file existence and project type
if ($project) {
    $transcriptionFile = $project['folder_path'] . '/transcription.txt';
    $proofreadFile = $project['folder_path'] . '/proofread.txt';
    $exportFile = $project['folder_path'] . '/export.docx';
    
    $hasTranscription = file_exists($transcriptionFile) || !empty($project['transcription_backup']) || $project['initial_transcription_uploaded'];
    $hasProofread = file_exists($proofreadFile) || $project['initial_proofread_uploaded'];
    $hasExport = file_exists($exportFile);
    
    $projectType = $project['project_type'] ?? 'regular';
}
?>

<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ניהול שלבי עבודה - מערכת CRM לתמלול</title>
    
    <!-- Include JSZip for Word conversion -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    
    <!-- Include our Word converter -->
    <script src="word-converter.js"></script>
    
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: #007cba; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .nav { background: #005a8b; padding: 10px; }
        .nav a { color: white; text-decoration: none; margin-left: 20px; padding: 8px 15px; border-radius: 4px; }
        .nav a:hover, .nav a.active { background: #007cba; }
        .container { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #005a8b; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .project-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .workflow-step { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .workflow-step.active { border-color: #007cba; background: #f0f8ff; }
        .workflow-step.completed { border-color: #28a745; background: #f0fff0; }
        .workflow-step.available { border-color: #ffc107; background: #fffbf0; }
        .btn-transcription { background: #28a745; }
        .btn-transcription:hover { background: #218838; }
        .btn-proofreading { background: #ffc107; color: #212529; }
        .btn-proofreading:hover { background: #e0a800; }
        .btn-export { background: #6c5ce7; }
        .btn-export:hover { background: #5a4de0; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        .btn-direct { background: #17a2b8; }
        .btn-direct:hover { background: #138496; }
        .file-upload { border: 2px dashed #ddd; padding: 15px; text-align: center; margin: 10px 0; border-radius: 4px; }
        .file-upload:hover { border-color: #007cba; background: #f8f9fa; }
        .project-type-info { background: #e8f5e8; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .project-type-badge { padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        .project-type-badge.regular { background: #e9ecef; color: #495057; }
        .project-type-badge.with_transcription { background: #d1ecf1; color: #0c5460; }
        .project-type-badge.with_proofread { background: #d4edda; color: #155724; }
        .direct-actions { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .direct-actions h5 { margin-top: 0; color: #856404; }
        .file-conversion-info { background: #d1ecf1; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px; color: #0c5460; }
        
        /* Word conversion indicators */
        .conversion-status { font-size: 12px; color: #666; margin-top: 5px; }
        .conversion-status.processing { color: #ffc107; }
        .conversion-status.completed { color: #28a745; }
        .conversion-status.error { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>מערכת CRM לתמלול - ניהול שלבי עבודה</h1>
        <div>
            <span>שלום <?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></span>
            <a href="../index.php?logout=1" style="color: white; margin-right: 20px;">התנתק</a>
        </div>
    </div>
    
    <div class="nav">
        <a href="<?php echo preserveDevParams('../index.php'); ?>">דף הבית</a>
        <a href="<?php echo preserveDevParams('index.php'); ?>">ניהול עבודות</a>
        <?php if ($hasA): ?>
            <a href="<?php echo preserveDevParams('../clients/'); ?>">ניהול לקוחות</a>
        <?php endif; ?>
        <?php if ($hasC): ?>
            <a href="<?php echo preserveDevParams('../transcribers/'); ?>">ניהול מתמללים</a>
        <?php endif; ?>
    </div>
    
    <div class="container">
        <?php if ($message): ?>
            <div class="message <?php echo strpos($message, 'שגיאה') !== false ? 'error' : ''; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($project): ?>
            <div class="project-info">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2><?php echo htmlspecialchars($project['title']); ?></h2>
                    <span class="project-type-badge <?php echo $projectType; ?>">
                        <?php 
                        $projectTypeHebrew = [
                            'regular' => 'פרויקט רגיל',
                            'with_transcription' => 'עם תמלול קיים',
                            'with_proofread' => 'עם הגהה קיימת'
                        ];
                        echo $projectTypeHebrew[$projectType] ?? 'רגיל';
                        ?>
                    </span>
                </div>
                <p><strong>לקוח:</strong> <?php echo htmlspecialchars($project['client_name'] . ' - ' . $project['client_company']); ?></p>
                <p><strong>תיאור:</strong> <?php echo htmlspecialchars($project['description']); ?></p>
                <p><strong>סטטוס נוכחי:</strong> <?php echo htmlspecialchars($project['workflow_status'] ?? 'pending'); ?></p>
                
                <div class="file-conversion-info">
                    <strong>ℹ️ מידע חשוב:</strong> המערכת מזהה וממירה קבצים מסוגים שונים (TXT, DOC, DOCX) לפורמט טקסט עם קידוד עברית נכון. קבצי DOCX יעברו המרה משופרת עם שמירה על טאבים.
                </div>
            </div>
            
            <!-- פעולות ישירות -->
            <div class="direct-actions">
                <h5>🚀 פעולות מהירות - עקיפת שלבים</h5>
                <p>השתמש בפעולות אלו להעלאת קבצים חיצוניים ושליחה ישירה לשלב הרצוי:</p>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <!-- שליחה ישירה להגהה -->
                    <form method="POST" enctype="multipart/form-data" style="display: inline-block; background: white; padding: 15px; border-radius: 4px; margin: 5px;" id="directProofreadForm">
                        <input type="hidden" name="action" value="send_direct_to_proofreading">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="converted_content" id="directProofreadConverted">
                        
                        <h6>שליחה ישירה להגהה</h6>
                        <div class="form-group">
                            <label>העלה קובץ תמלול:</label>
                            <input type="file" name="transcription_file" id="directProofreadFile" accept=".txt,.doc,.docx" required>
                            <div id="directProofreadStatus" class="conversion-status"></div>
                            <small>נתמך: TXT, DOC, DOCX - עם המרה אוטומטית לעברית</small>
                        </div>
                        
                        <div class="form-group">
                            <label>בחר מגיה:</label>
                            <select name="proofreader_id" required>
                                <option value="">בחר מגיה...</option>
                                <?php
                                $proofStmt = $pdo->prepare("
                                    SELECT t.* FROM transcribers t 
                                    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                    INNER JOIN users u ON t.user_id = u.id
                                    WHERE tc.company_id = ? AND u.permissions LIKE '%E%'
                                    ORDER BY t.name
                                ");
                                $proofStmt->execute([$company['id']]);
                                while ($proofreader = $proofStmt->fetch()):
                                ?>
                                    <option value="<?php echo $proofreader['id']; ?>"><?php echo htmlspecialchars($proofreader['name']); ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn-direct">שלח ישירות להגהה</button>
                    </form>
                    
                    <!-- שליחה ישירה לייצוא -->
                    <form method="POST" enctype="multipart/form-data" style="display: inline-block; background: white; padding: 15px; border-radius: 4px; margin: 5px;" id="directExportForm">
                        <input type="hidden" name="action" value="send_direct_to_export">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="converted_proofread_content" id="directExportConverted">
                        
                        <h6>שליחה ישירה לייצוא</h6>
                        <div class="form-group">
                            <label>העלה קובץ מוגה:</label>
                            <input type="file" name="proofread_file" id="directExportFile" accept=".txt,.doc,.docx" required>
                            <div id="directExportStatus" class="conversion-status"></div>
                            <small>נתמך: TXT, DOC, DOCX - עם המרה אוטומטית לעברית</small>
                        </div>
                        
                        <div class="form-group">
                            <label>בחר מייצא:</label>
                            <select name="exporter_id" required>
                                <option value="">בחר מייצא...</option>
                                <?php
                                $exportStmt = $pdo->prepare("
                                    SELECT t.* FROM transcribers t 
                                    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                    INNER JOIN users u ON t.user_id = u.id
                                    WHERE tc.company_id = ? AND u.permissions LIKE '%F%'
                                    ORDER BY t.name
                                ");
                                $exportStmt->execute([$company['id']]);
                                
                                // אם אין מייצאים, הצג אדמינים
                                if ($exportStmt->rowCount() == 0) {
                                    $exportStmt = $pdo->prepare("
                                        SELECT t.* FROM transcribers t 
                                        INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                        INNER JOIN users u ON t.user_id = u.id
                                        WHERE tc.company_id = ? AND (u.permissions LIKE '%A%' OR u.permissions LIKE '%B%' OR u.permissions LIKE '%C%')
                                        ORDER BY t.name
                                    ");
                                    $exportStmt->execute([$company['id']]);
                                }
                                
                                while ($exporter = $exportStmt->fetch()):
                                ?>
                                    <option value="<?php echo $exporter['id']; ?>"><?php echo htmlspecialchars($exporter['name']); ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn-direct">שלח ישירות לייצוא</button>
                    </form>
                </div>
            </div>
            
            <!-- שלב 1: תמלול -->
            <div class="workflow-step <?php 
                echo $hasTranscription ? 'completed' : 
                    (($project['workflow_status'] == 'ready_for_transcription' || $projectType == 'regular') ? 'active' : 'available'); 
            ?>">
                <h3>שלב 1: תמלול</h3>
                
                <?php if ($hasTranscription): ?>
                    <p>✅ יש תמלול זמין</p>
                    <?php if ($project['assigned_transcriber_id']): ?>
                        <?php
                        $assignedTransStmt = $pdo->prepare("SELECT name FROM transcribers WHERE id = ?");
                        $assignedTransStmt->execute([$project['assigned_transcriber_id']]);
                        $assignedTrans = $assignedTransStmt->fetch();
                        ?>
                        <p><strong>מתמלל מוקצה:</strong> <?php echo htmlspecialchars($assignedTrans['name']); ?></p>
                    <?php endif; ?>
                    
                <?php elseif ($projectType == 'regular' && ($project['workflow_status'] == 'pending' || $project['workflow_status'] == null)): ?>
                    <form method="POST" enctype="multipart/form-data" id="transcriptionForm">
                        <input type="hidden" name="action" value="send_to_transcription">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="converted_content" id="transcriptionConverted">
                        
                        <div class="form-group">
                            <label>בחר מתמלל:</label>
                            <select name="transcriber_id" required>
                                <option value="">בחר מתמלל...</option>
                                <?php
                                $transStmt = $pdo->prepare("
                                    SELECT t.* FROM transcribers t 
                                    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                    INNER JOIN users u ON t.user_id = u.id
                                    WHERE tc.company_id = ? AND u.permissions LIKE '%D%'
                                    ORDER BY t.name
                                ");
                                $transStmt->execute([$company['id']]);
                                while ($trans = $transStmt->fetch()):
                                ?>
                                    <option value="<?php echo $trans['id']; ?>"><?php echo htmlspecialchars($trans['name']); ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>תמלול חלקי (אופציונלי):</label>
                            <div class="file-upload">
                                <input type="file" name="transcription_file" id="transcriptionFile" accept=".txt,.doc,.docx">
                                <div id="transcriptionStatus" class="conversion-status"></div>
                                <p>העלה תמלול חלקי אם קיים (TXT, DOC, DOCX)</p>
                                <small>המערכת תמיר אוטומטית את הקובץ לפורמט טקסט עם קידוד עברית נכון</small>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-transcription">שלח לתמלול</button>
                    </form>
                    
                <?php else: ?>
                    <p><?php echo $projectType != 'regular' ? '⏭️ שלב זה דולג (פרויקט עם תמלול קיים)' : '⏳ ממתין לשליחה'; ?></p>
                <?php endif; ?>
            </div>
            
            <!-- שלב 2: הגהה -->
            <div class="workflow-step <?php 
                echo $hasProofread ? 'completed' : 
                    (($project['workflow_status'] == 'ready_for_proofreading' || $projectType == 'with_transcription') ? 'active' : 'available'); 
            ?>">
                <h3>שלב 2: הגהה</h3>
                
                <?php if ($hasProofread): ?>
                    <p>✅ יש הגהה זמינה</p>
                    <?php if ($project['assigned_proofreader_id']): ?>
                        <?php
                        $assignedProofStmt = $pdo->prepare("SELECT name FROM transcribers WHERE id = ?");
                        $assignedProofStmt->execute([$project['assigned_proofreader_id']]);
                        $assignedProof = $assignedProofStmt->fetch();
                        ?>
                        <p><strong>מגיה מוקצה:</strong> <?php echo htmlspecialchars($assignedProof['name']); ?></p>
                    <?php endif; ?>
                    
                <?php elseif ($hasTranscription || $projectType == 'with_transcription'): ?>
                    <form method="POST" enctype="multipart/form-data" id="proofreadForm">
                        <input type="hidden" name="action" value="send_to_proofreading">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="converted_content" id="proofreadConverted">
                        
                        <div class="form-group">
                            <label>בחר מגיה:</label>
                            <select name="proofreader_id" required>
                                <option value="">בחר מגיה...</option>
                                <?php
                                $proofStmt = $pdo->prepare("
                                    SELECT t.* FROM transcribers t 
                                    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                    INNER JOIN users u ON t.user_id = u.id
                                    WHERE tc.company_id = ? AND u.permissions LIKE '%E%'
                                    ORDER BY t.name
                                ");
                                $proofStmt->execute([$company['id']]);
                                while ($proofreader = $proofStmt->fetch()):
                                ?>
                                    <option value="<?php echo $proofreader['id']; ?>"><?php echo htmlspecialchars($proofreader['name']); ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>תמלול מוכן להגהה (אופציונלי):</label>
                            <div class="file-upload">
                                <input type="file" name="transcription_file" id="proofreadFile" accept=".txt,.doc,.docx">
                                <div id="proofreadStatus" class="conversion-status"></div>
                                <p>העלה תמלול מוכן מהמחשב במקום מהמתמלל (TXT, DOC, DOCX)</p>
                                <small>המערכת תמיר אוטומטית את הקובץ לפורמט טקסט עם קידוד עברית נכון</small>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-proofreading">שלח להגהה</button>
                    </form>
                    
                <?php else: ?>
                    <p><?php echo $projectType == 'with_proofread' ? '⏭️ שלב זה דולג (פרויקט עם הגהה קיימת)' : '❌ ממתין לסיום התמלול'; ?></p>
                <?php endif; ?>
            </div>
            
            <!-- שלב 3: ייצוא -->
            <div class="workflow-step <?php 
                echo $hasExport ? 'completed' : 
                    (($project['workflow_status'] == 'ready_for_export' || $projectType == 'with_proofread') ? 'active' : 'available'); 
            ?>">
                <h3>שלב 3: ייצוא</h3>
                
                <?php if ($hasExport): ?>
                    <p>✅ יש קובץ ייצוא מוכן</p>
                    <?php if ($project['assigned_exporter_id']): ?>
                        <?php
                        $assignedExportStmt = $pdo->prepare("SELECT name FROM transcribers WHERE id = ?");
                        $assignedExportStmt->execute([$project['assigned_exporter_id']]);
                        $assignedExport = $assignedExportStmt->fetch();
                        ?>
                        <p><strong>מייצא מוקצה:</strong> <?php echo htmlspecialchars($assignedExport['name']); ?></p>
                    <?php endif; ?>
                    
                <?php elseif ($hasProofread || $projectType == 'with_proofread'): ?>
                    <form method="POST" enctype="multipart/form-data" id="exportForm">
                        <input type="hidden" name="action" value="send_to_export">
                        <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                        <input type="hidden" name="converted_proofread_content" id="exportConverted">
                        
                        <div class="form-group">
                            <label>בחר מייצא:</label>
                            <select name="exporter_id" required>
                                <option value="">בחר מייצא...</option>
                                <?php
                                $exportStmt = $pdo->prepare("
                                    SELECT t.* FROM transcribers t 
                                    INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                    INNER JOIN users u ON t.user_id = u.id
                                    WHERE tc.company_id = ? AND u.permissions LIKE '%F%'
                                    ORDER BY t.name
                                ");
                                $exportStmt->execute([$company['id']]);
                                
                                // אם אין מייצאים, הצג אדמינים
                                if ($exportStmt->rowCount() == 0) {
                                    $exportStmt = $pdo->prepare("
                                        SELECT t.* FROM transcribers t 
                                        INNER JOIN transcriber_companies tc ON t.id = tc.transcriber_id 
                                        INNER JOIN users u ON t.user_id = u.id
                                        WHERE tc.company_id = ? AND (u.permissions LIKE '%A%' OR u.permissions LIKE '%B%' OR u.permissions LIKE '%C%')
                                        ORDER BY t.name
                                    ");
                                    $exportStmt->execute([$company['id']]);
                                }
                                
                                while ($exporter = $exportStmt->fetch()):
                                ?>
                                    <option value="<?php echo $exporter['id']; ?>"><?php echo htmlspecialchars($exporter['name']); ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>קובץ מוגה מוכן (אופציונלי):</label>
                            <div class="file-upload">
                                <input type="file" name="proofread_file" id="exportFile" accept=".txt,.doc,.docx">
                                <div id="exportStatus" class="conversion-status"></div>
                                <p>העלה קובץ מוגה מוכן מהמחשב במקום מהמגיה (TXT, DOC, DOCX)</p>
                                <small>המערכת תמיר אוטומטית את הקובץ לפורמט טקסט עם קידוד עברית נכון</small>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-export">שלח לייצוא</button>
                    </form>
                    
                <?php else: ?>
                    <p>❌ ממתין לסיום ההגהה</p>
                <?php endif; ?>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="<?php echo preserveDevParams('index.php'); ?>">
                    <button class="btn-secondary">חזור לרשימת פרויקטים</button>
                </a>
                
                <a href="<?php echo preserveDevParams('view.php?project=' . $project['id']); ?>">
                    <button class="btn-secondary">צפה בפרויקט</button>
                </a>
            </div>
            
        <?php else: ?>
            <div class="card">
                <h2>בחר פרויקט לניהול שלבי עבודה</h2>
                <p>העמוד הזה מיועד לניהול שלבי העבודה של פרויקט ספציפי.</p>
                <a href="<?php echo preserveDevParams('index.php'); ?>">
                    <button class="btn-secondary">חזור לרשימת פרויקטים</button>
                </a>
            </div>
        <?php endif; ?>
    </div>

    <script>
        // Word file conversion handlers
        async function handleWordFileConversion(fileInput, statusElement, hiddenFieldId) {
            const file = fileInput.files[0];
            if (!file) return;

            if (needsConversion(file)) {
                statusElement.textContent = 'מעבד קובץ Word...';
                statusElement.className = 'conversion-status processing';
                
                try {
                    const convertedText = await convertWordFileToText(file);
                    document.getElementById(hiddenFieldId).value = convertedText;
                    
                    statusElement.textContent = 'קובץ Word הומר בהצלחה לטקסט עם שמירה על טאבים';
                    statusElement.className = 'conversion-status completed';
                } catch (error) {
                    statusElement.textContent = 'שגיאה בהמרת קובץ Word: ' + error.message;
                    statusElement.className = 'conversion-status error';
                    console.error('Word conversion error:', error);
                }
            } else {
                statusElement.textContent = 'קובץ טקסט רגיל - לא נדרשת המרה';
                statusElement.className = 'conversion-status completed';
            }
        }

        // Initialize file handlers
        document.addEventListener('DOMContentLoaded', function() {
            
            // Regular workflow forms
            const transcriptionFileInput = document.getElementById('transcriptionFile');
            const transcriptionStatus = document.getElementById('transcriptionStatus');
            const proofreadFileInput = document.getElementById('proofreadFile');
            const proofreadStatus = document.getElementById('proofreadStatus');
            const exportFileInput = document.getElementById('exportFile');
            const exportStatus = document.getElementById('exportStatus');

            // Direct action forms
            const directProofreadFileInput = document.getElementById('directProofreadFile');
            const directProofreadStatus = document.getElementById('directProofreadStatus');
            const directExportFileInput = document.getElementById('directExportFile');
            const directExportStatus = document.getElementById('directExportStatus');

            // Add event listeners
            if (transcriptionFileInput) {
                transcriptionFileInput.addEventListener('change', function() {
                    handleWordFileConversion(this, transcriptionStatus, 'transcriptionConverted');
                });
            }

            if (proofreadFileInput) {
                proofreadFileInput.addEventListener('change', function() {
                    handleWordFileConversion(this, proofreadStatus, 'proofreadConverted');
                });
            }

            if (exportFileInput) {
                exportFileInput.addEventListener('change', function() {
                    handleWordFileConversion(this, exportStatus, 'exportConverted');
                });
            }

            if (directProofreadFileInput) {
                directProofreadFileInput.addEventListener('change', function() {
                    handleWordFileConversion(this, directProofreadStatus, 'directProofreadConverted');
                });
            }

            if (directExportFileInput) {
                directExportFileInput.addEventListener('change', function() {
                    handleWordFileConversion(this, directExportStatus, 'directExportConverted');
                });
            }

            // Handle form submissions - prevent submission while processing
            const forms = ['transcriptionForm', 'proofreadForm', 'exportForm', 'directProofreadForm', 'directExportForm'];
            
            forms.forEach(formId => {
                const form = document.getElementById(formId);
                if (form) {
                    form.addEventListener('submit', function(e) {
                        const processingStatuses = this.querySelectorAll('.conversion-status.processing');
                        if (processingStatuses.length > 0) {
                            e.preventDefault();
                            alert('נא להמתין לסיום עיבוד קבצי Word לפני שליחת הטופס');
                            return false;
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>