<!--
 * =========================================
 * Header Component
 * pages/main/components/header.php
 * =========================================
-->
<header class="header">
    <div class="header-content">
        <div class="logo-section">
            <h1>אפליקציית תמלול</h1>
        </div>
        <div class="user-info">
            <div class="user-profile">
                <span>שלום, <?php echo htmlspecialchars($fullName); ?></span>
            </div>
            <a href="?logout=1<?php echo $showDevNav ? '&devnav=1' : ''; ?>" class="logout-btn">התנתק</a>
        </div>
    </div>
</header>