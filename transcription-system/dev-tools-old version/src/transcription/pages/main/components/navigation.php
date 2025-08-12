<!--
 * =========================================
 * Navigation Component
 * pages/main/components/navigation.php
 * =========================================
-->
<nav class="nav">
    <div class="nav-content">
        <div class="nav-links">
            <?php
            // Build query string for navigation links
            $queryParams = [];
            if ($isDevelopmentMode) $queryParams[] = 'dev=1';
            if ($showDevNav) $queryParams[] = 'devnav=1';
            $queryString = !empty($queryParams) ? '?' . implode('&', $queryParams) : '';
            ?>
            <a href="index.php<?php echo $queryString; ?>" class="active">דף הבית</a>
            <a href="../transcription/index.php<?php echo $queryString; ?>">תמלול</a>
            <a href="../proofreading/index.php<?php echo $queryString; ?>">הגהה</a>
            <a href="../export/index.php<?php echo $queryString; ?>">ייצוא</a>
            <a href="../records/index.php<?php echo $queryString; ?>">רישומים</a>
        </div>
    </div>
</nav>