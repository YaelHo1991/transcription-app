<!-- Helper Files Section -->
<div class="helper-files-section" id="helperFilesSection">
    <div class="helper-files-wrapper">
        <button class="helper-files-toggle" id="helperFilesToggle" title="הראה/הסתר דפי עזר">
            <span style="font-size: 14px;">📋</span>
            <span>דפי עזר</span>
            <span id="helperToggleIcon" style="font-size: 10px;">▼</span>
        </button>
        <div class="helper-files-content" id="helperFilesContent">
            <div class="helper-files-viewer" id="helperFilesViewer">
                <div class="empty-helper-files">
                    <div class="empty-helper-files-icon">📁</div>
                    <h4>אין דפי עזר זמינים</h4>
                    <p>לא נמצאו דפי עזר עבור פרויקט זה</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Direct toggle function for helper files
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('helperFilesToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const sideWorkspace = document.querySelector('.side-workspace');
            const toggleIcon = document.getElementById('helperToggleIcon');
            
            if (sideWorkspace) {
                sideWorkspace.classList.toggle('helper-files-active');
                
                if (sideWorkspace.classList.contains('helper-files-active')) {
                    toggleIcon.textContent = '▲';
                } else {
                    toggleIcon.textContent = '▼';
                }
            }
        });
    }
});
</script>