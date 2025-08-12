<?php
/*
 * =========================================
 * File Manager for Independent Projects
 * components/independent-projects/file-manager.php
 * =========================================
 * Manages files for independent projects
 */

// Start session with correct namespace
session_name('TRANSCRIPTION_SESSION');
session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    header('Location: ../../index.php');
    exit;
}

// Get project ID
$projectId = $_GET['project_id'] ?? null;
if (!$projectId) {
    header('Location: ../../index.php');
    exit;
}

// Include functions
require_once __DIR__ . '/functions.php';

// Get project data
$independentPath = $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent/' . $_SESSION['user_id'];
$projectPath = $independentPath . '/' . $projectId;
$jsonFile = $projectPath . '/project_data.json';

if (!file_exists($jsonFile)) {
    die('Project not found');
}

$projectData = json_decode(file_get_contents($jsonFile), true);

// Verify user owns this project
if ($projectData['user_id'] != $_SESSION['user_id']) {
    die('Access denied');
}

?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ניהול קבצים - <?php echo htmlspecialchars($projectData['title']); ?></title>
    <link rel="stylesheet" href="../../styles/css/transcription-styles.css">
    <link rel="stylesheet" href="../../styles/css/inline-styles.css">
    <style>
        body {
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .file-manager-container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(32, 30, 32, 0.1);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(224, 169, 109, 0.2);
        }
        
        .upload-area {
            border: 3px dashed rgba(253, 126, 20, 0.3);
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            background: rgba(253, 126, 20, 0.05);
            margin-bottom: 30px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .upload-area:hover {
            border-color: rgba(253, 126, 20, 0.5);
            background: rgba(253, 126, 20, 0.1);
        }
        
        .upload-area.drag-over {
            border-color: #fd7e14;
            background: rgba(253, 126, 20, 0.15);
        }
        
        .files-section {
            margin-bottom: 30px;
        }
        
        .files-section h3 {
            color: #201e20;
            margin-bottom: 15px;
        }
        
        .file-list {
            display: grid;
            gap: 10px;
        }
        
        .file-item {
            background: white;
            border: 1px solid rgba(224, 169, 109, 0.2);
            border-radius: 10px;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s ease;
        }
        
        .file-item:hover {
            border-color: rgba(253, 126, 20, 0.3);
            box-shadow: 0 4px 10px rgba(32, 30, 32, 0.05);
        }
        
        .file-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .file-icon {
            font-size: 24px;
        }
        
        .file-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-small {
            padding: 5px 10px;
            font-size: 12px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-delete {
            background: #dc3545;
            color: white;
        }
        
        .btn-delete:hover {
            background: #c82333;
        }
        
        .btn-back {
            background: linear-gradient(135deg, #e0a96d 0%, #d4956b 100%);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
        }
        
        .btn-back:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(224, 169, 109, 0.3);
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 10px;
            opacity: 0.5;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="file-manager-container">
        <div class="header">
            <div>
                <h1>ניהול קבצים</h1>
                <h2><?php echo htmlspecialchars($projectData['title']); ?></h2>
            </div>
            <a href="../../index.php" class="btn-back">חזרה לדף הראשי</a>
        </div>
        
        <div class="upload-area" id="uploadArea">
            <input type="file" id="fileInput" multiple style="display: none;">
            <div class="upload-icon">📤</div>
            <h3>גרור קבצים לכאן או לחץ לבחירה</h3>
            <p>קבצי אודיו, וידאו, טקסט ומסמכים</p>
        </div>
        
        <div class="files-section">
            <h3>קבצי מדיה</h3>
            <div class="file-list" id="mediaFiles">
                <?php 
                $mediaFiles = array_filter($projectData['files'] ?? [], function($file) {
                    return $file['category'] === 'media';
                });
                
                if (empty($mediaFiles)): 
                ?>
                    <div class="empty-state">
                        <div class="empty-state-icon">🎵</div>
                        <p>אין קבצי מדיה</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($mediaFiles as $file): ?>
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-icon">🎵</div>
                                <div>
                                    <div style="font-weight: bold;"><?php echo htmlspecialchars($file['original_name']); ?></div>
                                    <div style="font-size: 12px; color: #666;">
                                        <?php echo number_format($file['size'] / 1024 / 1024, 2); ?> MB
                                    </div>
                                </div>
                            </div>
                            <div class="file-actions">
                                <button class="btn-small btn-delete" onclick="deleteFile('<?php echo $file['saved_name']; ?>', 'media')">מחק</button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="files-section">
            <h3>קבצי תמלול</h3>
            <div class="file-list" id="transcriptionFiles">
                <?php 
                $transcriptionFiles = array_filter($projectData['files'] ?? [], function($file) {
                    return $file['category'] === 'transcription';
                });
                
                if (empty($transcriptionFiles)): 
                ?>
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>אין קבצי תמלול</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($transcriptionFiles as $file): ?>
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-icon">📝</div>
                                <div>
                                    <div style="font-weight: bold;"><?php echo htmlspecialchars($file['original_name']); ?></div>
                                    <div style="font-size: 12px; color: #666;">
                                        <?php echo number_format($file['size'] / 1024, 2); ?> KB
                                    </div>
                                </div>
                            </div>
                            <div class="file-actions">
                                <button class="btn-small btn-delete" onclick="deleteFile('<?php echo $file['saved_name']; ?>', 'transcription')">מחק</button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="files-section">
            <h3>קבצים אחרים</h3>
            <div class="file-list" id="otherFiles">
                <?php 
                $helperFiles = array_filter($projectData['files'] ?? [], function($file) {
                    return $file['category'] === 'helper_files';
                });
                
                if (empty($helperFiles)): 
                ?>
                    <div class="empty-state">
                        <div class="empty-state-icon">📎</div>
                        <p>אין קבצים נוספים</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($helperFiles as $file): ?>
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-icon">📎</div>
                                <div>
                                    <div style="font-weight: bold;"><?php echo htmlspecialchars($file['original_name']); ?></div>
                                    <div style="font-size: 12px; color: #666;">
                                        <?php echo number_format($file['size'] / 1024, 2); ?> KB
                                    </div>
                                </div>
                            </div>
                            <div class="file-actions">
                                <button class="btn-small btn-delete" onclick="deleteFile('<?php echo $file['saved_name']; ?>', 'helper_files')">מחק</button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
    // File upload functionality
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const formData = new FormData();
        formData.append('project_id', '<?php echo $projectId; ?>');
        
        // Add all files to form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }
        
        // Show upload progress
        uploadArea.innerHTML = `
            <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 10px; border: 3px solid #f3f3f3; border-top: 3px solid #fd7e14; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h3>מעלה קבצים...</h3>
            <p>0 / ${files.length} קבצים</p>
        `;
        
        // Upload files
        fetch('upload-handler.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload page to show new files
                location.reload();
            } else {
                alert('שגיאה בהעלאת קבצים: ' + (data.error || 'Unknown error'));
                resetUploadArea();
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('שגיאה בהעלאת קבצים');
            resetUploadArea();
        });
    }
    
    function resetUploadArea() {
        uploadArea.innerHTML = `
            <input type="file" id="fileInput" multiple style="display: none;">
            <div class="upload-icon">📤</div>
            <h3>גרור קבצים לכאן או לחץ לבחירה</h3>
            <p>קבצי אודיו, וידאו, טקסט ומסמכים</p>
        `;
        document.getElementById('fileInput').addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }
    </script>
</body>
</html>