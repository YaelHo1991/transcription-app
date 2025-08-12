/**
 * Smart Upload Handler
 * Automatically handles large files with chunking and background processing
 */

class SmartUploader {
    constructor(options = {}) {
        this.maxChunkSize = options.maxChunkSize || 10 * 1024 * 1024; // 10MB
        this.chunkThreshold = options.chunkThreshold || 100 * 1024 * 1024; // 100MB
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
        this.uploadEndpoint = options.uploadEndpoint || 'smart-upload-handler.php';
        this.uploadedFiles = [];
    }

    async uploadFiles(files) {
        this.uploadedFiles = []; // Reset uploaded files list
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await this.uploadSingleFile(file, i + 1, files.length);
                this.uploadedFiles.push(result);
            } catch (error) {
                this.onError(error, file);
                throw error;
            }
        }
        this.onComplete(this.uploadedFiles);
    }

    async uploadSingleFile(file, fileIndex, totalFiles) {
        const fileSize = file.size;
        const fileName = file.name;

        // Progress tracking
        let uploadedBytes = 0;
        const updateProgress = (chunkBytes) => {
            uploadedBytes += chunkBytes;
            const progress = Math.round((uploadedBytes / fileSize) * 100);
            this.onProgress({
                file: fileName,
                fileIndex,
                totalFiles,
                progress,
                uploadedBytes,
                totalBytes: fileSize,
                isChunked: fileSize > this.chunkThreshold
            });
        };

        // Small files - regular upload
        if (fileSize <= this.chunkThreshold) {
            return await this.regularUpload(file, updateProgress);
        }

        // Large files - chunked upload
        return await this.chunkedUpload(file, updateProgress);
    }

    async regularUpload(file, updateProgress) {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    updateProgress(e.loaded);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.status === 'success') {
                            resolve({
                                fileName: response.fileName || file.name,
                                fileId: response.fileId,
                                size: file.size,
                                type: file.type
                            });
                        } else {
                            reject(new Error(response.message || 'Upload failed'));
                        }
                    } catch (e) {
                        resolve({
                            fileName: file.name,
                            size: file.size,
                            type: file.type
                        });
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.open('POST', this.uploadEndpoint);
            xhr.withCredentials = true; // Include cookies/session
            xhr.send(formData);
        });
    }

    async chunkedUpload(file, updateProgress) {
        const chunks = Math.ceil(file.size / this.maxChunkSize);
        const fileName = file.name;
        let lastChunkResponse = null;

        for (let chunk = 0; chunk < chunks; chunk++) {
            const start = chunk * this.maxChunkSize;
            const end = Math.min(start + this.maxChunkSize, file.size);
            const chunkData = file.slice(start, end);

            const formData = new FormData();
            formData.append('file', chunkData);
            formData.append('name', fileName);
            formData.append('chunk', chunk);
            formData.append('chunks', chunks);

            const response = await fetch(this.uploadEndpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include' // Include cookies/session
            });

            if (!response.ok) {
                throw new Error(`Chunk ${chunk + 1} upload failed`);
            }

            const chunkResponse = await response.json();
            if (chunkResponse.status !== 'success') {
                throw new Error(`Chunk ${chunk + 1} upload failed: ${chunkResponse.message}`);
            }

            updateProgress(chunkData.size);

            // Store the response from the last chunk
            if (chunk === chunks - 1) {
                lastChunkResponse = chunkResponse;
            }
        }

        // Return file info with data from the last chunk
        return {
            fileName: (lastChunkResponse && lastChunkResponse.fileName) || fileName,
            fileId: (lastChunkResponse && lastChunkResponse.fileId) || `temp_${Date.now()}_${fileName}`,
            size: file.size,
            type: file.type
        };
    }
}

// UI Components
class UploadUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.uploadedFiles = [];
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        this.container.innerHTML = `
            <div class="smart-upload-container">
                <div class="upload-drop-zone" id="uploadDropZone">
                    <div class="upload-icon">📁</div>
                    <h3>העלאת קבצים חכמה</h3>
                    <p>גרור קבצים לכאן או לחץ לבחירה</p>
                    <p class="upload-info">תמיכה בקבצים גדולים עד 5GB</p>
                    <input type="file" id="fileInput" multiple accept=".mp3,.mp4,.wav,.avi,.mov,.wmv,.flv,audio/*,video/*" style="display: none;">
                    <button type="button" class="upload-btn" id="selectFilesBtn">בחר קבצים</button>
                </div>
                
                <div class="upload-progress" id="uploadProgress" style="display: none;">
                    <div class="progress-header">
                        <h4>מעלה קבצים...</h4>
                        <span class="progress-cancel" id="cancelUpload">✕</span>
                    </div>
                    <div class="current-file">
                        <span id="currentFileName"></span>
                        <span id="fileCounter"></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                        <span class="progress-text" id="progressText">0%</span>
                    </div>
                    <div class="upload-details">
                        <span id="uploadSpeed"></span>
                        <span id="uploadETA"></span>
                    </div>
                </div>

                <div class="upload-complete" id="uploadComplete" style="display: none;">
                    <div class="success-icon">✅</div>
                    <h4>העלאה הושלמה בהצלחה!</h4>
                    <p id="completionMessage"></p>
                    <button type="button" class="upload-btn" id="uploadMoreBtn">העלה קבצים נוספים</button>
                </div>
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .smart-upload-container {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                background: #fafafa;
                transition: all 0.3s ease;
            }

            .upload-drop-zone {
                padding: 40px 20px;
            }

            .upload-drop-zone.dragover {
                border-color: #007cba;
                background: #f0f8ff;
            }

            .upload-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }

            .upload-btn {
                background: #007cba;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 10px;
            }

            .upload-btn:hover {
                background: #005a8b;
            }

            .upload-info {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
            }

            .upload-progress {
                padding: 20px;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .progress-cancel {
                cursor: pointer;
                font-size: 18px;
                color: #999;
            }

            .progress-cancel:hover {
                color: #666;
            }

            .current-file {
                margin-bottom: 10px;
                font-weight: bold;
            }

            .progress-bar {
                position: relative;
                background: #e0e0e0;
                height: 20px;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                background: linear-gradient(45deg, #007cba, #00a8e6);
                height: 100%;
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                font-weight: bold;
                color: #333;
            }

            .upload-details {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #666;
            }

            .upload-complete {
                padding: 40px 20px;
            }

            .success-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const dropZone = document.getElementById('uploadDropZone');
        const fileInput = document.getElementById('fileInput');
        const selectBtn = document.getElementById('selectFilesBtn');

        // File selection
        selectBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Upload more button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'uploadMoreBtn') {
                this.resetUI();
            }
        });
    }

    handleFiles(files) {
        if (files.length === 0) return;

        const uploader = new SmartUploader({
            onProgress: (data) => this.updateProgress(data),
            onComplete: (uploadedFiles) => this.showComplete(uploadedFiles),
            onError: (error) => this.showError(error)
        });

        this.showProgress();
        this.startTime = Date.now();

        uploader.uploadFiles(Array.from(files))
            .then((uploadedFiles) => {
                console.log('Upload completed:', uploadedFiles);
                this.uploadedFiles = uploadedFiles;
                this.showComplete(uploadedFiles);
            })
            .catch((error) => {
                console.error('Upload failed:', error);
                this.showError(error);
            });
    }

    showProgress() {
        document.getElementById('uploadDropZone').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'block';
        document.getElementById('uploadComplete').style.display = 'none';
    }

    updateProgress(data) {
        document.getElementById('currentFileName').textContent = data.file;
        document.getElementById('fileCounter').textContent = `(${data.fileIndex}/${data.totalFiles})`;
        document.getElementById('progressFill').style.width = data.progress + '%';
        document.getElementById('progressText').textContent = data.progress + '%';

        // Calculate upload speed and ETA
        const elapsed = (Date.now() - this.startTime) / 1000;
        const speed = data.uploadedBytes / elapsed;
        const remaining = data.totalBytes - data.uploadedBytes;
        const eta = remaining / speed;

        document.getElementById('uploadSpeed').textContent = this.formatSpeed(speed);
        document.getElementById('uploadETA').textContent = this.formatTime(eta);
    }

    showComplete(uploadedFiles) {
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadComplete').style.display = 'block';
        
        // Update uploaded files if provided
        if (uploadedFiles && Array.isArray(uploadedFiles)) {
            this.uploadedFiles = uploadedFiles;
        }
        
        // Ensure we have a valid array
        const files = Array.isArray(this.uploadedFiles) ? this.uploadedFiles : [];
        const fileCount = files.length;
        const message = `${fileCount} קבצים הועלו בהצלחה ומוכנים לעיבוד`;
        document.getElementById('completionMessage').textContent = message;
        
        // Hide the original file input since we have uploaded files  
        const mediaSection = document.getElementById('media_files_section');
        if (mediaSection && mediaSection.querySelector('input[type="file"]')) {
            mediaSection.querySelector('input[type="file"]').required = false;
        }
        
        // Add console logging to debug form submission
        console.log('Smart upload completed - files ready for project creation');
        
        // Store uploaded files for form submission
        this.storeUploadedFilesForSubmission();
    }

    showError(error) {
        alert('שגיאה בהעלאה: ' + error.message);
        this.resetUI();
    }

    resetUI() {
        document.getElementById('uploadDropZone').style.display = 'block';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadComplete').style.display = 'none';
        document.getElementById('fileInput').value = '';
    }

    formatSpeed(bytesPerSecond) {
        const mbps = bytesPerSecond / (1024 * 1024);
        return mbps < 1 ? `${(mbps * 1024).toFixed(1)} KB/s` : `${mbps.toFixed(1)} MB/s`;
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')} נותרו`;
    }

    storeUploadedFilesForSubmission() {
        // Remove any existing uploaded file inputs
        const existingInputs = document.querySelectorAll('input[name="smart_uploaded_files[]"]');
        existingInputs.forEach(input => input.remove());

        // Ensure we have valid uploaded files
        const files = Array.isArray(this.uploadedFiles) ? this.uploadedFiles : [];
        console.log('Storing uploaded files for submission:', files);

        // Create hidden inputs for each uploaded file
        const form = document.querySelector('form#projectForm');
        if (!form) {
            console.error('Project form not found!');
            return;
        }
        
        if (files.length > 0) {
            console.log('Adding', files.length, 'files to form');
            files.forEach((file, index) => {
                if (file && file.fileId) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'smart_uploaded_files[]';
                    const fileData = {
                        fileId: file.fileId,
                        fileName: file.fileName || 'unknown',
                        size: file.size || 0,
                        type: file.type || 'application/octet-stream'
                    };
                    input.value = JSON.stringify(fileData);
                    form.appendChild(input);
                    console.log('Added file', index, 'to form:', fileData);
                }
            });
        } else {
            console.log('No files to store');
        }
    }

    // Method to get uploaded files (for external use)
    getUploadedFiles() {
        return this.uploadedFiles;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the projects page and have the upload container
    if (document.getElementById('smartUploadContainer')) {
        new UploadUI('smartUploadContainer');
    }
});