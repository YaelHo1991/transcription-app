<div class="header-reveal-zone" id="headerRevealZone">
    <div class="collapsible-header" id="collapsibleHeader">
        <div class="nav">
            <div class="nav-links">
                <a href="../main/index.php<?php echo getQueryString(); ?>">דף הבית</a>
                <a href="index.php<?php echo getQueryString(); ?>" class="active">תמלול</a>
                <a href="../proofreading/index.php<?php echo getQueryString(); ?>">הגהה</a>
                <a href="../export/index.php<?php echo getQueryString(); ?>">ייצוא</a>
                <a href="../records/index.php<?php echo getQueryString(); ?>">רישומים</a>
            </div>
            <div class="user-info">
                <div class="user-profile">
                    <span>שלום, <?php echo htmlspecialchars($fullName); ?></span>
                </div>
                <a href="?logout=1<?php echo getQueryString(); ?>" class="btn btn-secondary">התנתק</a>
            </div>
        </div>
    </div>
</div>