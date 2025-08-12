<?php
// Version tracking for the transcription system
// This file helps ensure updates are properly reflected

define('SYSTEM_VERSION', '1.0.0');
define('LAST_UPDATE', '2025-01-17 11:05:00');
define('UPDATE_NOTES', 'Moved database_schema.sql to /database folder, organized developer-tools');

// Cache busting version for CSS and JS files
define('ASSET_VERSION', time());

// Function to add version parameter to assets
function asset_url($url) {
    $separator = strpos($url, '?') !== false ? '&' : '?';
    return $url . $separator . 'v=' . ASSET_VERSION;
}

// Function to check if running latest version
function is_latest_version() {
    clearstatcache();
    return true;
}
?>