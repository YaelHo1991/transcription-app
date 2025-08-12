<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מערכת תמלול - Client</title>    
    <link rel="stylesheet" href="styles/main.css?v=<?php echo time(); ?>">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 מערכת תמלול - Client Interface</h1>
        </div>
        
        <p class="welcome-text">Welcome to the new client-side interface of the transcription system.</p>
        
        <!-- Top buttons moved here -->
        <div class="top-nav-grid">
            <a href="src/developer-tools/development.php?devnav=1" class="nav-link">⚙️ כלי פיתוח</a>
            <a href="http://localhost:8080" class="nav-link" target="_blank">🖥️ Server (Original)</a>
        </div>
        
        <!-- Main navigation buttons -->
        <div class="nav-grid">
            <a href="src/selling/index.php" class="nav-link license-theme">📋 מכירת רישיונות</a>
            <a href="src/logout-to-crm.php" class="nav-link crm-theme">👥 CRM</a>
            <a href="src/logout-to-transcription.php" class="nav-link transcription-theme">🎯 תמלול</a>
        </div>
        
        <!-- Preview Windows -->
        <div class="preview-container">
            <div class="preview-window" data-service="licenses">
                <div class="preview-header">
                    <h4>📋 מכירת רישיונות - תצוגה מקדימה</h4>
                    <div class="preview-indicators">
                        <span class="indicator active" data-slide="0"></span>
                        <span class="indicator" data-slide="1"></span>
                        <span class="indicator" data-slide="2"></span>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="preview-slide active">
                        <div class="mock-license-page">
                            <div class="mock-header">
                                <span class="client-badge">CLIENT</span>
                                <h3>מערכת מכירת רישיונות תמלול</h3>
                            </div>
                            <div class="mock-stats">
                                <div class="mock-stat">
                                    <div class="stat-num">5</div>
                                    <div class="stat-label">מנהלי מערכת</div>
                                </div>
                                <div class="mock-stat">
                                    <div class="stat-num">12</div>
                                    <div class="stat-label">מנהלי CRM</div>
                                </div>
                                <div class="mock-stat">
                                    <div class="stat-num">8</div>
                                    <div class="stat-label">מתמללים</div>
                                </div>
                            </div>
                            <div class="mock-form">
                                <h4>רכישת רישיונות</h4>
                                <div class="mock-input">שם מלא</div>
                                <div class="mock-input">אימייל</div>
                                <div class="mock-permissions">
                                    <div class="permission-block">
                                        <div class="perm-title">מערכת CRM</div>
                                        <div class="perm-options">
                                            <div class="perm-option">A - ניהול לקוחות</div>
                                            <div class="perm-option">B - ניהול עבודות</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mock-button">רכישת רישיון</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="preview-window" data-service="crm">
                <div class="preview-header">
                    <h4>👥 CRM - תצוגה מקדימה</h4>
                    <div class="preview-indicators">
                        <span class="indicator active" data-slide="0"></span>
                        <span class="indicator" data-slide="1"></span>
                        <span class="indicator" data-slide="2"></span>
                        <span class="indicator" data-slide="3"></span>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="preview-slide active">
                        <div class="mock-crm-dashboard">
                            <div class="mock-header">
                                <h3>🏢 מערכת CRM למתמלל - דף הבית</h3>
                                <div class="mock-user">שלום משתמש</div>
                            </div>
                            <div class="mock-stats">
                                <div class="mock-stat red">
                                    <div class="stat-num">24</div>
                                    <div class="stat-label">לקוחות פעילים</div>
                                </div>
                                <div class="mock-stat brown">
                                    <div class="stat-num">8</div>
                                    <div class="stat-label">פרויקטים בעבודה</div>
                                </div>
                                <div class="mock-stat green">
                                    <div class="stat-num">12</div>
                                    <div class="stat-label">מתמללים זמינים</div>
                                </div>
                                <div class="mock-stat blue">
                                    <div class="stat-num">₪45K</div>
                                    <div class="stat-label">הכנסות החודש</div>
                                </div>
                            </div>
                            <div class="mock-quick-actions">
                                <div class="action-btn">➕ פרויקט חדש</div>
                                <div class="action-btn">👥 לקוח חדש</div>
                                <div class="action-btn">📊 דוח חודשי</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="preview-window" data-service="transcription">
                <div class="preview-header">
                    <h4>🎯 תמלול - תצוגה מקדימה</h4>
                    <div class="preview-indicators">
                        <span class="indicator active" data-slide="0"></span>
                        <span class="indicator" data-slide="1"></span>
                        <span class="indicator" data-slide="2"></span>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="preview-slide active">
                        <div class="mock-transcription">
                            <div class="mock-header">
                                <h3>🎯 מערכת תמלול - דף הבית</h3>
                                <div class="mock-user">מתמלל פעיל</div>
                            </div>
                            <div class="mock-stats">
                                <div class="mock-stat transcription-stat">
                                    <div class="stat-num">8</div>
                                    <div class="stat-label">עבודות תמלול</div>
                                </div>
                                <div class="mock-stat transcription-stat">
                                    <div class="stat-num">5</div>
                                    <div class="stat-label">עבודות הגהה</div>
                                </div>
                                <div class="mock-stat transcription-stat">
                                    <div class="stat-num">3</div>
                                    <div class="stat-label">עבודות ייצוא</div>
                                </div>
                            </div>
                            <div class="mock-work-sections">
                                <div class="work-section-preview">
                                    <div class="section-header-preview">
                                        <span class="section-icon-preview">📝</span>
                                        <span class="section-title-preview">תמלול</span>
                                        <span class="section-count-preview">8 עבודות</span>
                                    </div>
                                    <div class="project-preview-item">
                                        <div class="project-preview-title">תמלול פגישת דירקטוריון</div>
                                        <div class="project-preview-meta">
                                            <span>🎵 3 מדיה</span>
                                            <span>⏱️ 02:15:30</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        
    </div>
    
    <script src="assets/js/app.js"></script>
    <script>
        // Initialize homepage functionality
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Homepage loaded with new client architecture');
            
            // Add smooth scrolling and interactive effects
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                link.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-8px) scale(1.02)';
                });
                
                link.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });
            
            // Add CSS for ripple animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        });
    </script>
</body>
</html>