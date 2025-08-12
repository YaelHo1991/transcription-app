<div class="combined-navigation-bar">
    <!-- Project Navigation - Left Side (appears right in RTL) -->
    <div class="nav-section project-nav compact">
        <button class="nav-btn" id="prevProjectBtn" onclick="previousProject()" disabled>►</button>
        <div class="nav-info-group">
            <span class="nav-label">פרויקט</span>
            <span class="nav-value large-counter" id="projectCounter">1/1</span>
        </div>
        <button class="nav-btn" id="nextProjectBtn" onclick="nextProject()">◄</button>
    </div>
    
    <div class="nav-divider"></div>
    
    <!-- Media Navigation with File Info - Right Side (appears left in RTL) -->
    <div class="nav-section media-nav">
        <button class="nav-btn test-media-btn" onclick="loadTestMedia()" style="background: #4CAF50; color: white; padding: 8px 15px; margin-right: 10px; border-radius: 5px; font-weight: bold;">
            📁 העלה מדיה מהמחשב
        </button>
        <button class="nav-btn" id="prevMediaBtn" onclick="previousMedia()" disabled>►</button>
        <div class="file-info-section">
            <div class="file-main-info">
                <span class="file-counter" id="mediaCounter">1/1</span>
                <div class="file-name-wrapper">
                    <span class="file-name" id="fileName">-</span>
                </div>
            </div>
            <div class="file-details">
                <span class="file-detail-item">
                    <span class="detail-icon">⏱️</span>
                    <span id="fileDuration">00:00:00</span>
                </span>
                <span class="file-detail-item">
                    <span class="detail-icon">📁</span>
                    <span id="fileSize">0 MB</span>
                </span>
                <span class="file-detail-item">
                    <span class="detail-icon">🎵</span>
                    <span id="fileType">-</span>
                </span>
            </div>
        </div>
        <button class="nav-btn" id="nextMediaBtn" onclick="nextMedia()">◄</button>
    </div>
</div>

