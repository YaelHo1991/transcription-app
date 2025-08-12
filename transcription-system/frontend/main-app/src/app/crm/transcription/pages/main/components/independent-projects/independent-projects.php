<?php
/*
 * =========================================
 * Independent Projects Component
 * components/independent-projects/independent-projects.php
 * =========================================
 * Handles display and management of independent projects
 */

// Get the functions from the parent file
if (!function_exists('getIndependentProjects')) {
    require_once __DIR__ . '/functions.php';
}

// Get user's independent projects
$independentProjects = getIndependentProjects($_SESSION['user_id']);
?>

<!-- Independent Projects Section -->
<div class="independent-projects">
    <div class="independent-header">
        <div class="independent-icon">🚀</div>
        <div>
            <div class="section-title">פרויקטים עצמאיים</div>
            <p class="independent-subtitle">צור פרויקט חדש ללא מערכת CRM</p>
        </div>
    </div>

    <!-- הודעות פרויקטים עצמאיים -->
    <?php if (isset($independentProjectMessage)): ?>
        <div class="independent-project-message <?php echo $independentProjectMessage['type']; ?>">
            <?php echo htmlspecialchars($independentProjectMessage['text']); ?>
        </div>
    <?php endif; ?>

    <!-- Project Creator -->
    <div class="project-creator">
        <div class="creator-header">
            <div class="creator-icon">➕</div>
            <h3>יצירת פרויקט חדש</h3>
        </div>

        <form method="POST" class="creator-form">
            <input type="hidden" name="action" value="create_independent_project">

            <div class="form-group">
                <label>סוג העבודה:</label>
                <div class="work-type-selector">
                    <label class="work-type-option">
                        <input type="radio" name="work_type" value="transcription" checked>
                        <div class="work-type-content">
                            <div class="work-type-icon">📝</div>
                            <div class="work-type-title">תמלול</div>
                            <div class="work-type-desc">תמלול אודיו/וידאו</div>
                        </div>
                    </label>
                    <label class="work-type-option">
                        <input type="radio" name="work_type" value="proofreading">
                        <div class="work-type-content">
                            <div class="work-type-icon">✏️</div>
                            <div class="work-type-title">הגהה</div>
                            <div class="work-type-desc">הגהת תמלול קיים</div>
                        </div>
                    </label>
                    <label class="work-type-option">
                        <input type="radio" name="work_type" value="export">
                        <div class="work-type-content">
                            <div class="work-type-icon">📄</div>
                            <div class="work-type-title">ייצוא</div>
                            <div class="work-type-desc">ייצוא לוורד</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label>שם הפרויקט (אופציונלי):</label>
                <input type="text" name="custom_title" placeholder="אם לא תמלא, יווצר שם אוטומטי עם תאריך ושעה">
                <small class="project-hint">
                    💡 אם תשאיר ריק, השם יהיה: "תמלול - 07/07/2025 14:30"
                </small>
            </div>

            <div class="create-btn-wrapper">
                <button type="submit" class="create-btn">צור פרויקט חדש</button>
            </div>
        </form>
    </div>

    <!-- Existing Independent Projects -->
    <div class="independent-projects-list">
        <h3 class="projects-count-title">הפרויקטים שלי (<?php echo count($independentProjects); ?>)</h3>

        <?php if (empty($independentProjects)): ?>
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>אין פרויקטים עצמאיים כרגע</h3>
                <p>צור פרויקט חדש למעלה כדי להתחיל</p>
            </div>
        <?php else: ?>
            <?php foreach ($independentProjects as $project): ?>
                <div class="independent-project-card">
                    <div class="independent-project-header">
                        <div class="independent-project-title"><?php echo htmlspecialchars($project['title']); ?></div>
                        <div class="independent-project-type <?php echo $project['work_type']; ?>">
                            <?php
                            $workTypeHebrew = [
                                'transcription' => 'תמלול',
                                'proofreading' => 'הגהה',
                                'export' => 'ייצוא'
                            ];
                            echo $workTypeHebrew[$project['work_type']];
                            ?>
                        </div>
                    </div>

                    <div class="independent-project-meta">
                        <span class="independent-project-stat">
                            נוצר: <?php echo date('d/m/Y H:i', strtotime($project['created_at'])); ?>
                        </span>
                        <span class="independent-project-stat">
                            עודכן: <?php echo date('d/m/Y H:i', strtotime($project['updated_at'])); ?>
                        </span>
                        <span class="independent-project-stat">
                            סטטוס: <?php echo $project['status']; ?>
                        </span>
                        <span class="independent-project-stat">
                            קבצים: <?php echo count($project['files']); ?>
                        </span>
                        <?php 
                        $mediaInfo = getProjectMediaInfo($project);
                        if ($mediaInfo['total_files'] > 0):
                        ?>
                            <div class="project-media-info">
                                <div class="project-media-info-item">
                                    🎵 <?php echo $mediaInfo['total_files']; ?> קבצי מדיה
                                </div>
                                <div class="project-media-info-item">
                                    ⏱️ <?php echo $mediaInfo['duration_formatted']; ?>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>

                    <div class="independent-project-actions">
                        <a href="components/independent-projects/file-manager.php?project_id=<?php echo $project['id']; ?>" class="btn-independent">
                            נהל קבצים
                        </a>
                        <form method="POST" class="delete-project-form" onsubmit="return confirm('האם אתה בטוח שברצונך למחוק את הפרויקט \'<?php echo htmlspecialchars($project['title']); ?>\'?');">
                            <input type="hidden" name="action" value="delete_independent_project">
                            <input type="hidden" name="project_id" value="<?php echo $project['id']; ?>">
                            <button type="submit" class="btn-independent btn-danger">מחק</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<script>
// Auto-hide success/error messages after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const message = document.querySelector('.independent-project-message');
    if (message) {
        setTimeout(() => {
            message.classList.add('fade-message', 'fade-out');
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    }
});
</script>