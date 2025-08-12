<?php
/*
 * Configuration
 * includes/config.php
 */

// Base configuration
define('BASE_URL', 'http://localhost:8080');
define('API_URL', BASE_URL . '/api');

// Build query string for navigation links
function getQueryString() {
    global $isDevelopmentMode, $showDevNav;
    
    $queryParams = [];
    if ($isDevelopmentMode) $queryParams[] = 'dev=1';
    if ($showDevNav) $queryParams[] = 'devnav=1';
    
    return !empty($queryParams) ? '?' . implode('&', $queryParams) : '';
}

// Include developer navigation if needed
if ($showDevNav) {
    include '../../../developer-tools/includes/dev-nav.php';
}