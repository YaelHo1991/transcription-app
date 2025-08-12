<!-- Sidebar Reveal Zone - Top Corner Only -->
<div class="sidebar-reveal-zone" id="sidebarRevealZone"></div>

<!-- Sidebar -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <h3 class="sidebar-title">פרויקטים זמינים</h3>
        <button class="sidebar-close" onclick="toggleSidebar()">×</button>
    </div>
    <div class="sidebar-content">
        <!-- Statistics -->
        <div class="sidebar-stats">
            <div class="sidebar-stats-title">סטטיסטיקות תמלול</div>
            <div class="sidebar-stats-grid">
                <div class="sidebar-stat-item">
                    <div class="sidebar-stat-number" id="totalProjectsCount">0</div>
                    <div class="sidebar-stat-label">סה"כ פרויקטים</div>
                </div>
                <div class="sidebar-stat-item">
                    <div class="sidebar-stat-number" id="activeProjectsCount">0</div>
                    <div class="sidebar-stat-label">פעילים</div>
                </div>
                <div class="sidebar-stat-item">
                    <div class="sidebar-stat-number" id="completedThisMonth">0</div>
                    <div class="sidebar-stat-label">הושלמו החודש</div>
                </div>
                <div class="sidebar-stat-item">
                    <div class="sidebar-stat-number" id="pendingProjects">0</div>
                    <div class="sidebar-stat-label">ממתינים</div>
                </div>
            </div>
        </div>

        <!-- Projects List -->
        <div class="project-list" id="projectList">
            <!-- Projects will be loaded dynamically -->
            <div class="loading-placeholder" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.8);">
                <div class="spinner" style="width: 30px; height: 30px; margin: 0 auto 10px; border: 3px solid rgba(255, 255, 255, 0.2); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="font-size: 14px;">טוען פרויקטים...</p>
            </div>
        </div>
    </div>
</div>

<!-- Overlay -->
<div class="overlay" id="overlay" onclick="closeSidebar()"></div>