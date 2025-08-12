<?php
$pageTitle = "יצירת עבודה חדשה - מערכת CRM";

// Direct database connection - use main database
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

session_name('CRM_SESSION');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['create_project'])) {
    $title = trim($_POST['title']);
    $description = trim($_POST['description']);
    $client_name = trim($_POST['client_name']);
    $pricing_per_page = floatval($_POST['pricing_per_page']);
    $estimated_pages = intval($_POST['estimated_pages']);
    $notes = trim($_POST['notes']);
    
    // Validation
    $errors = [];
    if (empty($title)) {
        $errors[] = "שם העבודה הוא שדה חובה";
    }
    if (empty($client_name)) {
        $errors[] = "שם הלקוח הוא שדה חובה";
    }
    
    if (empty($errors)) {
        try {
            // Insert project
            $stmt = $pdo->prepare("
                INSERT INTO projects (title, description, client_name, user_id, pricing_per_page, estimated_pages, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $result = $stmt->execute([
                $title,
                $description,
                $client_name,
                $_SESSION['user_id'],
                $pricing_per_page,
                $estimated_pages,
                $notes
            ]);
            
            if ($result) {
                $project_id = $pdo->lastInsertId();
                
                // Handle file uploads if any
                if (!empty($_FILES['project_files']['name'][0])) {
                    $upload_dir = "/var/www/html/uploads/users/" . $_SESSION['user_id'] . "/projects/" . $project_id . "/original/";
                    
                    // Create directory if it doesn't exist
                    if (!is_dir($upload_dir)) {
                        mkdir($upload_dir, 0755, true);
                    }
                    
                    $uploaded_files = [];
                    
                    for ($i = 0; $i < count($_FILES['project_files']['name']); $i++) {
                        if ($_FILES['project_files']['error'][$i] == 0) {
                            $original_name = $_FILES['project_files']['name'][$i];
                            $temp_name = $_FILES['project_files']['tmp_name'][$i];
                            $file_size = $_FILES['project_files']['size'][$i];
                            $mime_type = $_FILES['project_files']['type'][$i];
                            
                            // Generate unique filename
                            $file_extension = pathinfo($original_name, PATHINFO_EXTENSION);
                            $unique_filename = uniqid() . '_' . time() . '.' . $file_extension;
                            $file_path = $upload_dir . $unique_filename;
                            
                            // Move uploaded file
                            if (move_uploaded_file($temp_name, $file_path)) {
                                // Determine file type
                                $file_type = getFileType($original_name);
                                
                                // Insert file record
                                $file_stmt = $pdo->prepare("
                                    INSERT INTO project_files (project_id, filename, original_filename, file_type, file_size, file_path, mime_type, uploaded_by)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                ");
                                
                                $relative_path = "uploads/users/" . $_SESSION['user_id'] . "/projects/" . $project_id . "/original/" . $unique_filename;
                                
                                $file_stmt->execute([
                                    $project_id,
                                    $unique_filename,
                                    $original_name,
                                    $file_type,
                                    $file_size,
                                    $relative_path,
                                    $mime_type,
                                    $_SESSION['user_id']
                                ]);
                                
                                $uploaded_files[] = $original_name;
                            }
                        }
                    }
                    
                    // Update project with file info
                    if (!empty($uploaded_files)) {
                        $file_info = json_encode($uploaded_files);
                        $update_stmt = $pdo->prepare("UPDATE projects SET original_files = ? WHERE id = ?");
                        $update_stmt->execute([$file_info, $project_id]);
                    }
                }
                
                $success_message = "העבודה נוצרה בהצלחה! מספר עבודה: " . $project_id;
                
                // Redirect to project list after 2 seconds
                header("refresh:2;url=index.php");
            }
            
        } catch (Exception $e) {
            $errors[] = "שגיאה ביצירת העבודה: " . $e->getMessage();
        }
    }
}

// Helper function to determine file type
function getFileType($filename) {
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    $audioTypes = ['mp3', 'wav', 'aac', 'flac', 'm4a'];
    $videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'mkv'];
    $documentTypes = ['pdf', 'doc', 'docx', 'txt'];
    
    if (in_array($extension, $audioTypes)) return 'audio';
    if (in_array($extension, $videoTypes)) return 'video';
    if (in_array($extension, $documentTypes)) return 'document';
    
    return 'other';
}

// Get user permissions
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'] ?? false;
$hasB = strpos($userPermissions, 'B') !== false;

if (!$hasB && !$isAdmin) {
    header("Location: ../index.php");
    exit;
}

include '../components/header.php';
?>

<style>
/* Additional styles for create form */
.file-upload-area {
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    background: #fafbfc;
    transition: all 0.3s ease;
    cursor: pointer;
    margin: 20px 0;
}

.file-upload-area:hover {
    border-color: #b85042;
    background: rgba(184, 80, 66, 0.05);
}

.file-upload-area.dragover {
    border-color: #b85042;
    background: rgba(184, 80, 66, 0.1);
}

.upload-icon {
    font-size: 48px;
    color: #6c757d;
    margin-bottom: 15px;
}

.upload-text {
    font-size: 16px;
    color: #6c757d;
    margin-bottom: 10px;
}

.upload-subtext {
    font-size: 12px;
    color: #adb5bd;
}

.file-list {
    margin-top: 20px;
}

.file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 5px;
    margin-bottom: 10px;
}

.file-info {
    flex-grow: 1;
}

.file-name {
    font-weight: 500;
}

.file-size {
    font-size: 12px;
    color: #6c757d;
}

.btn-sm {
    padding: 5px 10px;
    font-size: 12px;
}
</style>

<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>יצירת עבודה חדשה</h2>
    <a href="index.php" class="btn btn-outline">🔙 חזרה לרשימה</a>
</div>

<!-- Success/Error Messages -->
<?php if (isset($success_message)): ?>
    <div class="alert alert-success">
        ✅ <?php echo $success_message; ?>
        <br><small>מעביר אותך לרשימת העבודות...</small>
    </div>
<?php endif; ?>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger">
        ❌ <strong>שגיאות:</strong>
        <ul style="margin: 10px 0 0 20px;">
            <?php foreach ($errors as $error): ?>
                <li><?php echo $error; ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<!-- Project Creation Form -->
<div class="form-container">
    <form method="POST" enctype="multipart/form-data" data-validate>
        
        <!-- Basic Information -->
        <div class="card-header">
            <h3 class="card-title">פרטי העבודה</h3>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>שם העבודה: <span style="color: red;">*</span></label>
                <input type="text" name="title" required 
                       value="<?php echo isset($_POST['title']) ? htmlspecialchars($_POST['title']) : ''; ?>"
                       placeholder="הכנס שם תיאורי לעבודה">
            </div>
            
            <div class="form-group">
                <label>שם הלקוח: <span style="color: red;">*</span></label>
                <input type="text" name="client_name" required
                       value="<?php echo isset($_POST['client_name']) ? htmlspecialchars($_POST['client_name']) : ''; ?>"
                       placeholder="שם הלקוח או החברה">
            </div>
        </div>

        <div class="form-group">
            <label>תיאור העבודה:</label>
            <textarea name="description" rows="4" 
                      placeholder="תיאור מפורט של העבודה, הוראות מיוחדות, רשימת דוברים וכו'"><?php echo isset($_POST['description']) ? htmlspecialchars($_POST['description']) : ''; ?></textarea>
        </div>

        <!-- Pricing Information -->
        <div class="card-header" style="margin-top: 30px;">
            <h3 class="card-title">פרטי תמחור</h3>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>מחיר לעמוד (₪):</label>
                <input type="number" name="pricing_per_page" step="0.01" min="0"
                       value="<?php echo isset($_POST['pricing_per_page']) ? $_POST['pricing_per_page'] : '5.00'; ?>"
                       placeholder="5.00">
            </div>
            
            <div class="form-group">
                <label>הערכת מספר עמודים:</label>
                <input type="number" name="estimated_pages" min="0"
                       value="<?php echo isset($_POST['estimated_pages']) ? $_POST['estimated_pages'] : ''; ?>"
                       placeholder="הערכה ראשונית">
            </div>
        </div>

        <!-- File Upload Section -->
        <div class="card-header" style="margin-top: 30px;">
            <h3 class="card-title">קבצי מדיה</h3>
        </div>
        
        <div class="file-upload-area" onclick="document.getElementById('fileInput').click()">
            <div class="upload-icon">📁</div>
            <div class="upload-text">לחץ להעלאת קבצים או גרור קבצים לכאן</div>
            <div class="upload-subtext">תמיכה בקבצי אודיו, וידאו ומסמכים (עד 5GB לקובץ)</div>
            <input type="file" id="fileInput" name="project_files[]" multiple style="display: none;" 
                   accept=".mp3,.mp4,.wav,.avi,.mov,.docx,.pdf,.m4a,.flac,.wmv,.mkv">
        </div>
        
        <div id="fileList" class="file-list"></div>

        <!-- Notes -->
        <div class="form-group">
            <label>הערות נוספות:</label>
            <textarea name="notes" rows="3" 
                      placeholder="הערות פנימיות, הוראות מיוחדות למתמלל וכו'"><?php echo isset($_POST['notes']) ? htmlspecialchars($_POST['notes']) : ''; ?></textarea>
        </div>

        <!-- Actions -->
        <div class="d-flex gap-2 justify-content-between" style="margin-top: 30px;">
            <div>
                <button type="submit" name="create_project" class="btn btn-primary">
                    ✅ צור עבודה
                </button>
                <button type="button" onclick="resetForm()" class="btn btn-secondary">
                    🔄 נקה טופס
                </button>
            </div>
            <a href="index.php" class="btn btn-outline">❌ ביטול</a>
        </div>
    </form>
</div>

<script>
// File upload handling
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.querySelector('.file-upload-area');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        fileInput.files = files;
        displayFiles(files);
    });
    
    // File input change
    fileInput.addEventListener('change', function() {
        displayFiles(this.files);
    });
    
    function displayFiles(files) {
        fileList.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeFile(${index})">
                    ✕ הסר
                </button>
            `;
            fileList.appendChild(fileItem);
        });
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    window.removeFile = function(index) {
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        
        files.forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });
        
        fileInput.files = dt.files;
        displayFiles(fileInput.files);
    };
    
    window.resetForm = function() {
        if (confirm('האם אתה בטוח שברצונך לנקות את הטופס? כל המידע שהוזן יאבד.')) {
            document.querySelector('form').reset();
            fileList.innerHTML = '';
        }
    };
});

// Form validation
document.querySelector('form').addEventListener('submit', function(e) {
    const title = document.querySelector('input[name="title"]').value.trim();
    const clientName = document.querySelector('input[name="client_name"]').value.trim();
    
    if (!title) {
        alert('שם העבודה הוא שדה חובה');
        e.preventDefault();
        return;
    }
    
    if (!clientName) {
        alert('שם הלקוח הוא שדה חובה');
        e.preventDefault();
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('button[name="create_project"]');
    submitBtn.innerHTML = '<span class="loading"></span> יוצר עבודה...';
    submitBtn.disabled = true;
});
</script>

<?php include '../components/footer.php'; ?>