<!--
 * =========================================
 * Project Management Component
 * components/project-management/project-management.php
 * =========================================
 * Unified project creation and management
-->
<div id="projectManagement" class="project-management-container">
    <!-- Create Project Section -->
    <div class="create-project-section">
        <h3>יצירת פרויקט חדש</h3>
        
        <div class="create-methods">
            <!-- Method 1: Quick Create -->
            <div class="create-method">
                <div class="method-icon">⚡</div>
                <h4>יצירה מהירה</h4>
                <p>צור פרויקט ריק והוסף קבצים מאוחר יותר</p>
                <button class="btn-primary" onclick="ProjectManager.showQuickCreate()">צור פרויקט</button>
            </div>
            
            <!-- Method 2: Upload Files -->
            <div class="create-method">
                <div class="method-icon">📁</div>
                <h4>העלאת קבצים</h4>
                <p>גרור קבצים או בחר מהמחשב</p>
                <div class="upload-area" id="uploadArea">
                    <input type="file" id="fileInput" multiple accept="audio/*,video/*" style="display: none;">
                    <div class="upload-placeholder" onclick="document.getElementById('fileInput').click()">
                        <div class="upload-icon">📤</div>
                        <p>לחץ לבחירת קבצים או גרור לכאן</p>
                        <small>קבצי אודיו ווידאו בלבד</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Project List Section -->
    <div class="project-list-section">
        <div class="section-header">
            <h3>הפרויקטים שלי (<span id="projectCount">0</span>)</h3>
            <button class="btn-refresh" onclick="ProjectManager.refreshProjects()">🔄 רענן</button>
        </div>
        
        <div id="projectsList" class="projects-grid">
            <!-- Projects will be loaded here -->
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>טוען פרויקטים...</p>
            </div>
        </div>
    </div>
</div>

<!-- Quick Create Modal -->
<div id="quickCreateModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>יצירת פרויקט חדש</h3>
            <button class="close-btn" onclick="ProjectManager.closeQuickCreate()">×</button>
        </div>
        
        <form id="quickCreateForm" onsubmit="ProjectManager.createProject(event)">
            <div class="form-group">
                <label>שם הפרויקט:</label>
                <input type="text" name="project_name" required placeholder="הכנס שם פרויקט">
            </div>
            
            <div class="form-group">
                <label>סוג עבודה:</label>
                <select name="work_type" required>
                    <option value="transcription">תמלול</option>
                    <option value="proofreading">הגהה</option>
                    <option value="export">ייצוא</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>תיאור (אופציונלי):</label>
                <textarea name="description" rows="3" placeholder="הוסף תיאור לפרויקט"></textarea>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="ProjectManager.closeQuickCreate()">ביטול</button>
                <button type="submit" class="btn-primary">צור פרויקט</button>
            </div>
        </form>
    </div>
</div>

<style>
.project-management-container {
    padding: 20px;
}

.create-project-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.create-methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
}

.create-method {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    transition: all 0.3s ease;
}

.create-method:hover {
    border-color: #2196f3;
    box-shadow: 0 4px 8px rgba(33,150,243,0.1);
}

.method-icon {
    font-size: 48px;
    margin-bottom: 10px;
}

.upload-area {
    margin-top: 15px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 30px;
    background: #f9f9f9;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-area:hover {
    border-color: #2196f3;
    background: #e3f2fd;
}

.upload-area.drag-over {
    border-color: #4caf50;
    background: #e8f5e9;
}

.upload-placeholder {
    text-align: center;
}

.upload-icon {
    font-size: 36px;
    margin-bottom: 10px;
}

.project-list-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.btn-refresh {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-refresh:hover {
    background: #e0e0e0;
}

.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.loading-placeholder {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 20px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Modal Styles */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    padding: 0;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.close-btn:hover {
    color: #333;
}

.modal form {
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e0e0e0;
}

.btn-primary {
    background: #2196f3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-primary:hover {
    background: #1976d2;
}

.btn-secondary {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-secondary:hover {
    background: #e0e0e0;
}
</style>