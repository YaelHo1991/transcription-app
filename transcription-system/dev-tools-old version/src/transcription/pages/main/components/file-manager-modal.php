<!--
 * =========================================
 * File Manager Modal Component
 * pages/main/components/file-manager-modal.php
 * =========================================
-->
<div class="file-manager-overlay" id="fileManagerOverlay">
    <div class="file-manager-modal">
        <div class="file-manager-header">
            <div>
                <h1 class="file-manager-title">ניהול קבצים</h1>
                <div class="project-id">מזהה פרויקט: <span id="modalProjectId"></span></div>
            </div>
            <button class="close-btn" onclick="closeFileManager()">✕ סגור</button>
        </div>

        <div class="project-info">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span class="project-type-badge" id="modalProjectType">תמלול</span>
                <h2 id="modalProjectTitle"></h2>
            </div>
            <div class="media-info">
                <div class="media-info-item">
                    <span>📁</span>
                    <span id="totalFiles">0 קבצים</span>
                </div>
                <div class="media-info-item">
                    <span>🎵</span>
                    <span id="mediaFiles">0 מדיה</span>
                </div>
                <div class="media-info-item">
                    <span>⏱️</span>
                    <span id="mediaDuration">00:00:00</span>
                </div>
                <div class="media-info-item">
                    <span>💾</span>
                    <span id="totalSize">0 MB</span>
                </div>
            </div>
        </div>

        <!-- Step 1: Upload Files -->
        <div class="step-section">
            <div class="step-header">
                <div class="step-number">1</div>
                <div>
                    <div class="step-title">העלאת קבצים</div>
                    <div class="step-description">גרור קבצים לכאן או לחץ לבחירה</div>
                </div>
            </div>

            <div class="storage-type-selector" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="radio" name="storageType" value="server" checked onchange="storageType = 'server'">
                    <span>שמור בשרת</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="radio" name="storageType" value="local" onchange="storageType = 'local'">
                    <span>שמור הפניה לקובץ המקומי</span>
                </label>
            </div>

            <div class="file-drop-zone" onclick="document.getElementById('fileInput').click()" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                <div class="drop-icon">📁</div>
                <p>גרור קבצים לכאן או לחץ לבחירה</p>
                <input type="file" id="fileInput" multiple style="display: none;" onchange="handleFileSelect(event)">
            </div>

            <div class="upload-progress" id="uploadProgress">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">מעלה קבצים... 0%</div>
            </div>
        </div>

        <!-- Step 2: Manage Files -->
        <div class="step-section">
            <div class="step-header">
                <div class="step-number">2</div>
                <div>
                    <div class="step-title">ניהול קבצים</div>
                    <div class="step-description">הצג, נהל וארגן את הקבצים שלך</div>
                </div>
            </div>

            <div class="files-display" id="filesDisplay">
                <!-- Files will be loaded dynamically -->
                <div class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">
                    <p>אין קבצים בפרויקט זה</p>
                    <p style="font-size: 14px;">העלה קבצים באמצעות האזור למעלה</p>
                </div>
            </div>
        </div>

        <!-- Step 3: Project Actions -->
        <div class="step-section">
            <div class="step-header">
                <div class="step-number">3</div>
                <div>
                    <div class="step-title">פעולות פרויקט</div>
                    <div class="step-description">גיבוי, ייצוא וסיום עבודה</div>
                </div>
            </div>

            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <button class="btn-independent" onclick="backupProject()">גבה פרויקט</button>
                <button class="btn-independent" onclick="exportProject()">ייצא לוורד</button>
                <button class="btn-independent" onclick="archiveProject()">העבר לארכיון</button>
                <button class="btn-independent btn-danger" onclick="deleteProjectComplete()">מחק פרויקט</button>
            </div>
        </div>
    </div>
</div>