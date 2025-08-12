<?php
// Check if we're in developer navigation mode (came from developer dashboard)
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// Only set isDevelopmentMode if not already set
if (!isset($isDevelopmentMode)) {
    $isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
}

// Check if we're on the development page itself
$isDevelopmentPage = strpos($_SERVER['PHP_SELF'], 'development.php') !== false;

// Only show navigation if we came from developer dashboard or we're on development page
if (!$showDevNav && !$isDevelopmentPage) {
    return;
}

// Debug - ensure devnav parameter is preserved in all links
global $navParams;
if (!isset($navParams)) {
    $navParams = '';
    if ($isDevelopmentMode) $navParams .= '?dev=1';
    if ($showDevNav) {
        $navParams .= ($navParams ? '&' : '?') . 'devnav=1';
    }
}

// Start output buffering to prevent header issues
ob_start();
?>
<!-- Developer Navigation Bar -->
<nav id="dev-navigation-bar" style="background: #34495e !important; padding: 0 !important; box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; z-index: 2147483647 !important; margin: 0 !important; display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: 50px !important;">
    <div style="max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
        <a href="/index.php" style="display: flex; align-items: center; padding: 15px 20px; color: white; text-decoration: none; background: #2c3e50;">
            <span style="font-size: 20px; margin-left: 8px;">🏠</span>
            <span>דף הבית</span>
        </a>
        <div style="display: flex; flex: 1;">
            <?php if ($isDevelopmentMode): ?>
                <a href="/src/developer-tools/development.php?dev=1&devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    🔧 לוח פיתוח
                </a>
                <a href="/src/selling/index.php?dev=1&devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    📋 מכירת רישיונות
                </a>
                <a href="/src/crm/dashboard/index.php?dev=1&devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    👥 CRM
                </a>
                <a href="/src/transcription/pages/main/index.php?dev=1&devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    🎯 תמלול
                </a>
                <a href="http://localhost:8080?dev=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;" target="_blank">
                    🖥️ שרת
                </a>
            <?php else: ?>
                <a href="/src/developer-tools/development.php?devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    🔧 לוח פיתוח
                </a>
                <a href="/src/selling/index.php?devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    📋 מכירת רישיונות
                </a>
                <a href="/src/crm/index.php?devnav=1&force_login=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    👥 CRM
                </a>
                <a href="/src/transcription/pages/main/index.php?devnav=1" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;">
                    🎯 תמלול
                </a>
                <a href="http://localhost:8080" style="padding: 15px 30px; color: white; text-decoration: none; transition: background 0.3s;" target="_blank">
                    🖥️ שרת
                </a>
            <?php endif; ?>
        </div>
        <?php 
        $currentFile = basename($_SERVER['PHP_SELF']);
        $currentPath = dirname($_SERVER['PHP_SELF']);
        
        // Create URLs that will clear sessions when switching modes
        if ($isDevelopmentMode) {
            // Switching to regular mode
            if ($isDevelopmentPage) {
                // On development page, keep navigation
                $toggleUrl = '/src/developer-tools/logout.php?redirect=' . urlencode($currentPath . '/' . $currentFile . '?devnav=1');
            } else {
                // On other pages, remove dev parameter but KEEP devnav
                $cleanUrl = $currentPath . '/' . $currentFile . '?devnav=1';
                $toggleUrl = '/src/developer-tools/logout.php?redirect=' . urlencode($cleanUrl);
            }
        } else {
            // Switching to dev mode - clear any existing sessions first
            $toggleUrl = '/src/developer-tools/logout.php?redirect=' . urlencode($currentPath . '/' . $currentFile . '?dev=1&devnav=1');
        }
        ?>
        <?php if ($isDevelopmentMode): ?>
            <a href="<?php echo $toggleUrl; ?>" onclick="return confirmModeSwitch('regular')" style="padding: 10px 20px; margin-left: 10px; color: white; text-decoration: none; background: #27ae60; border-radius: 5px;">
                🔒 מצב רגיל
            </a>
        <?php else: ?>
            <a href="<?php echo $toggleUrl; ?>" onclick="return confirmModeSwitch('dev')" style="padding: 10px 20px; margin-left: 10px; color: white; text-decoration: none; background: #e74c3c; border-radius: 5px;">
                🔓 מצב פיתוח
            </a>
        <?php endif; ?>
    </div>
</nav>
<style>
    /* Navigation specific styles */
    nav a:hover {
        background: #3d566e !important;
    }
    /* Reset body margin/padding without affecting fonts */
    body {
        margin: 0;
        padding: 0;
        /* Preserve original font - don't override */
    }
    /* Force navigation to use its own font, not inherit from page */
    #dev-navigation-bar,
    #dev-navigation-bar * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }
    #dev-navigation-bar a {
        font-size: 14px !important;
    }
    /* Force body padding when dev nav is present */
    body {
        padding-top: 50px !important;
        margin-top: 0 !important;
    }
    /* Ensure container doesn't cover nav */
    .container {
        margin-top: 0 !important;
        position: relative !important;
    }
    /* Fix for transcription app headers */
    .header-reveal-zone,
    .collapsible-header {
        top: 50px !important;
        z-index: 1000 !important; /* Below dev nav */
    }
    /* Adjust sidebar for transcription app */
    .sidebar {
        top: 50px !important;
        z-index: 999 !important; /* Below dev nav */
    }
    /* Force all transcription app elements below dev nav */
    .overlay {
        z-index: 997 !important;
    }
    /* Ensure dev nav is always on top */
    #dev-navigation-bar {
        z-index: 2147483647 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    }
</style>
<script>
// Immediately add padding to body and ensure nav is visible
(function() {
    // Force body padding
    function forcePadding() {
        if (document.body) {
            document.body.style.paddingTop = '50px';
            document.body.style.marginTop = '0';
        }
    }
    
    // Force nav visibility
    function forceNavVisible() {
        var nav = document.getElementById('dev-navigation-bar');
        if (nav) {
            nav.style.cssText = nav.getAttribute('style') + ' display: block !important; visibility: visible !important; opacity: 1 !important; position: fixed !important; top: 0 !important; z-index: 2147483647 !important;';
        }
    }
    
    // Run immediately
    forcePadding();
    forceNavVisible();
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            forcePadding();
            forceNavVisible();
        });
    }
    
    // Run after a delay to override any late-loading CSS
    setTimeout(function() {
        forcePadding();
        forceNavVisible();
    }, 100);
    
    // Fix z-index issues with transcription app
    setTimeout(function() {
        // Force all elements with high z-index to be below dev nav
        var elements = document.querySelectorAll('[style*="z-index"]');
        elements.forEach(function(el) {
            var zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex && zIndex > 1000 && el.id !== 'dev-navigation-bar') {
                el.style.zIndex = '1000';
            }
        });
        
        // Force transcription app headers below dev nav
        var headers = document.querySelectorAll('.header-reveal-zone, .collapsible-header, .sidebar, .overlay');
        headers.forEach(function(el) {
            el.style.zIndex = '1000';
        });
        
        forceNavVisible();
    }, 500);
})();

// Force navigation visibility
document.addEventListener('DOMContentLoaded', function() {
    var nav = document.getElementById('dev-navigation-bar');
    if (nav) {
        nav.style.display = 'block !important';
        nav.style.visibility = 'visible !important';
        nav.style.opacity = '1 !important';
        console.log('Navigation forced visible');
    }
});

// Confirm mode switch and show loading message
function confirmModeSwitch(mode) {
    var message = mode === 'dev' ? 'לעבור למצב פיתוח?' : 'לעבור למצב רגיל?';
    if (confirm(message)) {
        // Show loading message
        document.body.style.cursor = 'wait';
        var loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 999999; font-size: 18px;';
        loadingMsg.textContent = 'מנקה סשנים ועובר מצב...';
        document.body.appendChild(loadingMsg);
        return true;
    }
    return false;
}
</script>
<?php
// End output buffering and flush
ob_end_flush();
?>