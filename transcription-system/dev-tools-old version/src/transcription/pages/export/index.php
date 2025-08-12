<?php
// Determine which session namespace to use based on devnav parameter
$sessionName = (isset($_GET['devnav']) && $_GET['devnav'] === '1') 
    ? 'TRANSCRIPTION_DEV_SESSION' 
    : 'TRANSCRIPTION_SESSION';

// Use the appropriate session namespace
session_name($sessionName);
session_start();

// Include developer navigation
require_once __DIR__ . '/../../../developer-tools/includes/dev-nav.php';

// Check if we're in developer mode
$isDevelopmentMode = isset($_GET['dev']) && $_GET['dev'] === '1';
$showDevNav = isset($_GET['devnav']) && $_GET['devnav'] === '1';

// In dev mode, set up session if not already set
if ($isDevelopmentMode && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Developer';
    $_SESSION['permissions'] = 'ABCDEF';
    $_SESSION['transcriber_code'] = 'DEV001';
    $_SESSION['logged_in'] = true;
    $_SESSION['can_transcribe'] = true;
    $_SESSION['can_proofread'] = true;
    $_SESSION['can_export'] = true;
    $_SESSION['full_name'] = 'Developer Mode';
}

// Check if user is logged in (skip in development mode)
if (!$isDevelopmentMode && (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'])) {
    $loginRedirect = "../../login.php";
    if ($showDevNav) {
        $loginRedirect .= "?devnav=1";
    }
    header("Location: " . $loginRedirect);
    exit;
}

// Check permission for export (F) - skip in development mode
if (!$isDevelopmentMode && (!isset($_SESSION['can_export']) || !$_SESSION['can_export'])) {
    $_SESSION['access_error'] = "אין לך הרשאה לגשת לעמוד הייצוא";
    header("Location: ../main/index.php");
    exit;
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    // Preserve devnav parameter when logging out
    $logoutRedirect = "../../login.php";
    if ($showDevNav) {
        $logoutRedirect .= "?devnav=1";
    }
    header("Location: " . $logoutRedirect);
    exit;
}

$username = $_SESSION['full_name'] ?? $_SESSION['username'] ?? 'משתמש';

// Include the developer navigation if needed (AFTER all header redirects)
if ($showDevNav) {
    include '../../../developer-tools/includes/dev-nav.php';
}
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אפליקציית תמלול - ממשק ייצוא</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            color: #201e20;
            overflow-x: hidden;
        }

        /* ===== HOVERING HEADER ===== */
        .header-reveal-zone {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 120px;
            z-index: 999;
            background: transparent;
        }

        .collapsible-header {
            background: linear-gradient(135deg, #201e20 0%, #3d3a3c 100%);
            color: white;
            padding: 10px 20px;
            box-shadow: 0 2px 15px rgba(32, 30, 32, 0.3);
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1001;
        }

        .collapsible-header.show {
            transform: translateY(0);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-section h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .user-profile {
            background: rgba(111, 66, 193, 0.1);
            padding: 8px 15px;
            border-radius: 20px;
            border: 1px solid rgba(111, 66, 193, 0.3);
            font-size: 14px;
        }

        .nav {
            background: rgba(32, 30, 32, 0.9);
            padding: 10px 20px;
            backdrop-filter: blur(10px);
        }

        .nav-links {
            display: flex;
            gap: 20px;
        }

        .nav-links a {
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 14px;
        }

        .nav-links a:hover,
        .nav-links a.active {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            transform: translateY(-2px);
        }

        /* ===== HOVERING SIDEBAR ===== */
        .sidebar-reveal-zone {
            position: fixed;
            top: 0;
            right: 0;
            width: 50px;
            height: 100vh;
            z-index: 998;
            background: transparent;
        }

        .sidebar {
            position: fixed;
            top: 0;
            right: -350px;
            width: 350px;
            height: 100vh;
            background: linear-gradient(135deg, #201e20 0%, #3d3a3c 100%);
            color: white;
            transition: right 0.3s ease;
            z-index: 999;
            box-shadow: -5px 0 20px rgba(32, 30, 32, 0.3);
            overflow-y: auto;
        }

        .sidebar.show {
            right: 0;
        }

        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(111, 66, 193, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-title {
            font-size: 18px;
            font-weight: 700;
            color: #e83e8c;
        }

        .sidebar-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
        }

        .sidebar-close:hover {
            color: #e83e8c;
        }

        .sidebar-content {
            padding: 20px;
        }

        .sidebar-stats {
            background: rgba(111, 66, 193, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid rgba(111, 66, 193, 0.2);
        }

        .sidebar-stats-title {
            font-size: 14px;
            font-weight: 600;
            color: #e83e8c;
            margin-bottom: 10px;
        }

        .sidebar-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .sidebar-stat-item {
            text-align: center;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
        }

        .sidebar-stat-number {
            font-size: 18px;
            font-weight: 700;
            color: #e83e8c;
        }

        .sidebar-stat-label {
            font-size: 10px;
            opacity: 0.8;
            margin-top: 2px;
        }

        .project-list {
            margin-top: 20px;
        }

        .project-item {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }

        .project-item:hover {
            background: rgba(111, 66, 193, 0.2);
            transform: translateY(-2px);
        }

        .project-item.active {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            border-color: #6f42c1;
        }

        .project-item-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 16px;
        }

        .project-item-meta {
            font-size: 12px;
            opacity: 0.8;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }

        .project-type-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .project-type-badge.crm {
            background: rgba(40, 167, 69, 0.8);
            color: white;
        }

        .project-type-badge.independent {
            background: rgba(253, 126, 20, 0.8);
            color: white;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 997;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .overlay.show {
            opacity: 1;
            visibility: visible;
        }

        /* ===== MAIN CONTENT ===== */
        .main-content {
            margin-right: 0;
            transition: margin-right 0.3s ease;
            min-height: 100vh;
            padding: 0;
        }

        .main-content.sidebar-open {
            margin-right: 350px;
        }

        .export-workspace {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 0;
            padding: 30px;
            box-shadow: none;
            backdrop-filter: blur(10px);
            border: none;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .workspace-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(111, 66, 193, 0.2);
            flex-shrink: 0;
        }

        .workspace-title-section {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .workspace-title {
            font-size: 28px;
            font-weight: 700;
            color: #201e20;
        }

        .project-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .document-info {
            font-size: 14px;
            color: #666;
            font-weight: 500;
        }

        .project-nav {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .nav-btn {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            color: #6f42c1;
            padding: 8px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .nav-btn:hover:not(:disabled) {
            background: rgba(111, 66, 193, 0.2);
            transform: translateY(-1px);
        }

        .nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .workspace-status {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .status-badge {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .export-progress {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            color: #6f42c1;
        }

        /* ===== MAIN WORKSPACE GRID ===== */
        .workspace-grid {
            display: grid;
            grid-template-columns: 1fr 400px;
            grid-template-rows: auto 1fr;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }

        /* ===== MEDIA PLAYER SECTION ===== */
        .media-section {
            grid-column: 1 / -1;
            grid-row: 1;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            min-height: 150px;
            display: flex;
            flex-direction: column;
        }

        .media-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .media-controls-header {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .media-nav-btn {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            color: #6f42c1;
            padding: 8px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .media-nav-btn:hover:not(:disabled) {
            background: rgba(111, 66, 193, 0.2);
            transform: translateY(-1px);
        }

        .media-nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .media-info {
            background: rgba(111, 66, 193, 0.1);
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 12px;
            color: #6f42c1;
            font-weight: 600;
        }

        .playback-speed {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .speed-btn {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            color: #6f42c1;
            padding: 4px 8px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .speed-btn:hover {
            background: rgba(111, 66, 193, 0.2);
        }

        .speed-btn.active {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
        }

        .media-player-container {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: center;
        }

        .media-player {
            background: linear-gradient(135deg, rgba(111, 66, 193, 0.05) 0%, rgba(232, 62, 140, 0.05) 100%);
            padding: 15px;
            border-radius: 12px;
            border: 1px solid rgba(111, 66, 193, 0.2);
        }

        .current-media-title {
            font-weight: 600;
            color: #6f42c1;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .media-player audio,
        .media-player video {
            width: 100%;
            height: 45px;
            border-radius: 8px;
        }

        .media-metadata {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 200px;
        }

        .metadata-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            font-size: 12px;
        }

        .metadata-label {
            color: #666;
            font-weight: 600;
        }

        .metadata-value {
            color: #6f42c1;
            font-weight: 700;
        }

        .timestamp-display {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 10px;
            text-align: center;
            font-family: 'Courier New', monospace;
            font-weight: 700;
            font-size: 14px;
        }

        /* ===== EXPORT PANEL ===== */
        .export-panel {
            grid-column: 1;
            grid-row: 2;
            display: flex;
            flex-direction: column;
            gap: 20px;
            height: 100%;
        }

        .document-preview-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #201e20;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }

        .preview-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px 15px;
            background: rgba(111, 66, 193, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(111, 66, 193, 0.1);
        }

        .zoom-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .zoom-btn {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            color: #6f42c1;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .zoom-btn:hover {
            background: rgba(111, 66, 193, 0.2);
        }

        .page-navigation {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .page-btn {
            background: rgba(111, 66, 193, 0.1);
            border: 1px solid rgba(111, 66, 193, 0.3);
            color: #6f42c1;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .page-btn:hover:not(:disabled) {
            background: rgba(111, 66, 193, 0.2);
        }

        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .page-info {
            background: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            color: #6f42c1;
            font-weight: 600;
        }

        .document-preview {
            flex: 1;
            background: white;
            border: 2px solid rgba(111, 66, 193, 0.2);
            border-radius: 12px;
            padding: 20px;
            overflow-y: auto;
            min-height: 400px;
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
        }

        .document-preview:focus {
            outline: none;
            border-color: #6f42c1;
            box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.1);
        }

        /* ===== TOOLS PANEL ===== */
        .tools-panel {
            grid-column: 2;
            grid-row: 2;
            display: flex;
            flex-direction: column;
            gap: 20px;
            height: 100%;
        }

        /* ===== TEMPLATE SELECTION ===== */
        .template-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            flex: 0 0 auto;
        }

        .template-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }

        .template-option {
            background: white;
            border: 2px solid rgba(111, 66, 193, 0.2);
            border-radius: 10px;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
        }

        .template-option:hover {
            border-color: #6f42c1;
            background: rgba(111, 66, 193, 0.05);
        }

        .template-option.selected {
            border-color: #6f42c1;
            background: linear-gradient(135deg, rgba(111, 66, 193, 0.1) 0%, rgba(232, 62, 140, 0.1) 100%);
        }

        .template-icon {
            font-size: 20px;
            margin-bottom: 5px;
        }

        .template-name {
            font-weight: 600;
            color: #6f42c1;
            margin-bottom: 3px;
        }

        .template-desc {
            font-size: 10px;
            color: #666;
        }

        /* ===== FORMAT OPTIONS ===== */
        .format-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            flex: 0 0 auto;
        }

        .format-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .format-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid rgba(111, 66, 193, 0.1);
        }

        .format-label {
            font-size: 13px;
            font-weight: 600;
            color: #666;
        }

        .format-control {
            display: flex;
            gap: 5px;
            align-items: center;
        }

        .format-input {
            padding: 4px 8px;
            border: 1px solid rgba(111, 66, 193, 0.3);
            border-radius: 4px;
            font-size: 12px;
            width: 60px;
            text-align: center;
        }

        .format-toggle {
            width: 40px;
            height: 20px;
            background: rgba(111, 66, 193, 0.2);
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .format-toggle.active {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
        }

        .format-toggle::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: all 0.3s ease;
        }

        .format-toggle.active::after {
            left: 22px;
        }

        /* ===== EXPORT ACTIONS ===== */
        .export-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(111, 66, 193, 0.1);
            flex: 0 0 auto;
        }

        .export-progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(111, 66, 193, 0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 15px;
            display: none;
        }

        .export-progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            width: 0%;
            transition: width 0.3s ease;
        }

        .export-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(111, 66, 193, 0.4);
        }

        .btn-success {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }

        .btn-success:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        .btn-secondary {
            background: rgba(108, 117, 125, 0.1);
            color: #6c757d;
            border: 1px solid rgba(108, 117, 125, 0.3);
        }

        .btn-secondary:hover:not(:disabled) {
            background: rgba(108, 117, 125, 0.2);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        /* ===== MESSAGES ===== */
        .message {
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        }

        .message.success {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            color: #155724;
            border: 1px solid rgba(40, 167, 69, 0.3);
        }

        .message.error {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            color: #721c24;
            border: 1px solid rgba(220, 53, 69, 0.3);
        }

        .message.info {
            background: linear-gradient(135deg, #e1d4f1 0%, #d6c7eb 100%);
            color: #4a2c5a;
            border: 1px solid rgba(111, 66, 193, 0.3);
        }

        @keyframes slideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 1200px) {
            .workspace-grid {
                grid-template-columns: 1fr 300px;
            }
        }

        @media (max-width: 768px) {
            .workspace-grid {
                grid-template-columns: 1fr;
                grid-template-rows: auto auto 1fr;
                gap: 20px;
            }

            .media-player-container {
                grid-template-columns: 1fr;
                gap: 15px;
            }

            .media-metadata {
                grid-template-columns: 1fr 1fr;
                grid-auto-rows: auto;
                gap: 8px;
            }

            .tools-panel {
                order: 3;
                flex-direction: row;
                overflow-x: auto;
            }

            .template-section,
            .format-section,
            .export-section {
                flex: 0 0 250px;
            }

            .template-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 480px) {
            .export-workspace {
                padding: 15px;
            }

            .workspace-header {
                flex-direction: column;
                gap: 15px;
                align-items: flex-start;
            }

            .tools-panel {
                flex-direction: column;
            }

            .media-controls-header {
                flex-wrap: wrap;
                gap: 8px;
            }

            .media-metadata {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>
    <!-- Header Reveal Zone -->
    <div class="header-reveal-zone" onmouseenter="showHeader()" onmouseleave="hideHeader()"></div>

    <!-- Collapsible Header -->
    <div class="collapsible-header" id="collapsibleHeader" onmouseenter="showHeader()" onmouseleave="hideHeader()">
        <div class="header-content">
            <div class="logo-section">
                <h1>ממשק ייצוא</h1>
            </div>
            <div class="user-info">
                <div class="user-profile">
                    <span>שלום <?php echo htmlspecialchars($username); ?></span>
                </div>
                <a href="index.php?logout=1<?php echo $showDevNav ? '&devnav=1' : ''; ?>" style="color: white; text-decoration: none; padding: 5px 15px; background: rgba(255,255,255,0.2); border-radius: 5px;">יציאה</a>
            </div>
        </div>
        <div class="nav">
            <?php
            // Build query string for navigation links
            $queryParams = [];
            if ($isDevelopmentMode) $queryParams[] = 'dev=1';
            if ($showDevNav) $queryParams[] = 'devnav=1';
            $queryString = !empty($queryParams) ? '?' . implode('&', $queryParams) : '';
            ?>
            <div class="nav-links">
                <a href="../main/index.php<?php echo $queryString; ?>">דף הבית</a>
                <a href="../transcription/index.php<?php echo $queryString; ?>">תמלול</a>
                <a href="../proofreading/index.php<?php echo $queryString; ?>">הגהה</a>
                <a href="index.php<?php echo $queryString; ?>" class="active">ייצוא</a>
                <a href="../records/index.php<?php echo $queryString; ?>">רישומים</a>
            </div>
        </div>
    </div>

    <!-- Sidebar Reveal Zone -->
    <div class="sidebar-reveal-zone" onmouseenter="showSidebar()" onmouseleave="hideSidebar()"></div>

    <!-- Sidebar -->
    <div class="sidebar" id="sidebar" onmouseenter="showSidebar()" onmouseleave="hideSidebar()">
        <div class="sidebar-header">
            <h3 class="sidebar-title">פרויקטים לייצוא</h3>
            <button class="sidebar-close" onclick="toggleSidebar()">×</button>
        </div>
        <div class="sidebar-content">
            <!-- Statistics -->
            <div class="sidebar-stats">
                <div class="sidebar-stats-title">סטטיסטיקות ייצוא</div>
                <div class="sidebar-stats-grid">
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">12</div>
                        <div class="sidebar-stat-label">ממתינים לייצוא</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">5</div>
                        <div class="sidebar-stat-label">בעיבוד</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">28</div>
                        <div class="sidebar-stat-label">יוצאו השבוע</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">98%</div>
                        <div class="sidebar-stat-label">איכות פורמט</div>
                    </div>
                </div>
            </div>

            <!-- Projects List -->
            <div class="project-list">
                <div class="project-item active">
                    <div class="project-type-badge crm">חברת משפטים</div>
                    <div class="project-item-title">ייצוא פסק דין - בית משפט עליון</div>
                    <div class="project-item-meta">
                        <span>עמודים: 24</span>
                        <span>תבנית: משפטית</span>
                        <span>עדיפות: גבוהה</span>
                    </div>
                </div>

                <div class="project-item">
                    <div class="project-type-badge crm">חברת ייעוץ</div>
                    <div class="project-item-title">דוח ישיבת הנהלה לייצוא</div>
                    <div class="project-item-meta">
                        <span>עמודים: 15</span>
                        <span>תבנית: עסקית</span>
                        <span>עדיפות: רגילה</span>
                    </div>
                </div>

                <div class="project-item">
                    <div class="project-type-badge independent">עצמאי</div>
                    <div class="project-item-title">ייצוא מסמך אישי</div>
                    <div class="project-item-meta">
                        <span>סוג: ייצוא</span>
                        <span>עמודים: 8</span>
                        <span>תבנית: כללית</span>
                    </div>
                </div>

                <div class="project-item">
                    <div class="project-type-badge crm">מוסד אקדמי</div>
                    <div class="project-item-title">תמלול הרצאה לפרסום</div>
                    <div class="project-item-meta">
                        <span>עמודים: 32</span>
                        <span>תבנית: אקדמית</span>
                        <span>עדיפות: נמוכה</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Overlay -->
    <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

    <!-- Main Content -->
    <div class="main-content" id="mainContent">
        <div class="export-workspace">
            <div class="workspace-header">
                <div class="workspace-title-section">
                    <div class="project-info">
                        <div class="workspace-title">ייצוא פסק דין - בית משפט עליון</div>
                        <div class="document-info">מקור: הגהה מושלמת | 24 עמודים | פורמט: DOC + PDF</div>
                    </div>
                    <div class="project-nav">
                        <button class="nav-btn">◀ פרויקט קודם</button>
                        <button class="nav-btn">פרויקט הבא ▶</button>
                    </div>
                </div>
                <div class="workspace-status">
                    <span class="status-badge">מוכן לייצוא</span>
                    <span class="export-progress">שלב 3 מתוך 3</span>
                </div>
            </div>

            <div class="workspace-grid">
                <!-- Media Player Section -->
                <div class="media-section">
                    <div class="media-header">
                        <div class="section-title">
                            <div class="section-icon">🎵</div>
                            נגן מדיה לבדיקה
                        </div>
                        <div class="media-controls-header">
                            <button class="media-nav-btn">◀ קובץ קודם</button>
                            <div class="media-info">
                                <span>1 מתוך 2</span>
                            </div>
                            <button class="media-nav-btn">קובץ הבא ▶</button>
                            
                            <div class="playback-speed">
                                <span style="font-size: 12px; color: #666; font-weight: 600;">מהירות:</span>
                                <button class="speed-btn">0.75x</button>
                                <button class="speed-btn active">1.0x</button>
                                <button class="speed-btn">1.25x</button>
                                <button class="speed-btn">1.5x</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="media-player-container">
                        <div class="media-player">
                            <div class="current-media-title">supreme_court_ruling.mp3</div>
                            <audio controls style="width: 100%;">
                                <source src="#" type="audio/mpeg">
                                <p>הדפדפן שלך לא תומך בנגינת אודיו HTML5.</p>
                            </audio>
                        </div>
                        
                        <div class="media-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">משך כולל</span>
                                <span class="metadata-value">1:23:47</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">זמן נוכחי</span>
                                <span class="metadata-value">00:00</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">קובץ נוכחי</span>
                                <span class="metadata-value">1/2</span>
                            </div>
                            <div class="timestamp-display">
                                00:00 / 1:23:47
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Export Panel -->
                <div class="export-panel">
                    <div class="document-preview-section">
                        <div class="section-title">
                            <div class="section-icon">📄</div>
                            תצוגה מקדימה של המסמך
                        </div>
                        <div class="preview-controls">
                            <div class="zoom-controls">
                                <span style="font-size: 12px; color: #666; font-weight: 600;">זום:</span>
                                <button class="zoom-btn">🔍-</button>
                                <button class="zoom-btn">התאמה</button>
                                <button class="zoom-btn">🔍+</button>
                            </div>
                            <div class="page-navigation">
                                <button class="page-btn">◀</button>
                                <div class="page-info">עמוד 1 מתוך 24</div>
                                <button class="page-btn">▶</button>
                            </div>
                        </div>
                        <div class="document-preview">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <h2>בית המשפט העליון</h2>
                                <h3>בג"ץ 12345/25</h3>
                                <hr style="margin: 20px 0;">
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <strong>בפני:</strong> כבוד השופט דוד כהן, נשיא בית המשפט העליון<br>
                                <strong>העותרים:</strong> אברהם לוי ואח'<br>
                                <strong>המשיבים:</strong> מדינת ישראל - משרד הפנים ואח'<br>
                                <strong>תאריך הישיבה:</strong> י"ז תמוז תשפ"ה (17 ביולי 2025)
                            </div>

                            <h4>פסק דין</h4>
                            
                            <p>בהתחשב בנסיבות העניין ולאחר עיון בחומר שהובא בפניי, אני מוצא לנכון לקבל את העתירה בחלקה.</p>
                            
                            <p>העובדות הן כדלקמן: העותרים פנו למשרד הפנים בבקשה לקבלת זכויות מסוימות, ובקשתם נדחתה ללא נימוק מספק. לאחר בחינה מדוקדקת של החומר, אני סבור כי יש יסוד לטענות העותרים.</p>
                            
                            <p>המשיבים טענו כי פעלו על פי הוראות החוק והנהלים הקיימים. אולם, בחינת ההנחיות הרלוונטיות מעלה כי לא ניתן נימוק מספק לדחיית הבקשה.</p>
                            
                            <p>לפיכך, אני מורה למשיבים לבחון מחדש את בקשת העותרים תוך 30 יום מיום מתן פסק דין זה, ולתת נימוק מפורט לכל החלטה שתתקבל.</p>
                            
                            <p>העותרים זכאים להוצאות משפט בסך 15,000 ₪.</p>
                            
                            <div style="margin-top: 40px; text-align: left;">
                                <p>דוד כהן, שופט</p>
                                <p>ניתן היום, י"ז תמוז תשפ"ה (17 ביולי 2025)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tools Panel -->
                <div class="tools-panel">
                    <!-- Template Selection -->
                    <div class="template-section">
                        <div class="section-title">
                            <div class="section-icon">📋</div>
                            בחירת תבנית
                        </div>
                        <div class="template-grid">
                            <div class="template-option selected">
                                <div class="template-icon">⚖️</div>
                                <div class="template-name">משפטית</div>
                                <div class="template-desc">פסקי דין ומסמכים משפטיים</div>
                            </div>
                            <div class="template-option">
                                <div class="template-icon">💼</div>
                                <div class="template-name">עסקית</div>
                                <div class="template-desc">ישיבות הנהלה ודוחות</div>
                            </div>
                            <div class="template-option">
                                <div class="template-icon">🎓</div>
                                <div class="template-name">אקדמית</div>
                                <div class="template-desc">הרצאות ומחקרים</div>
                            </div>
                            <div class="template-option">
                                <div class="template-icon">📄</div>
                                <div class="template-name">כללית</div>
                                <div class="template-desc">מסמכים רגילים</div>
                            </div>
                        </div>
                    </div>

                    <!-- Format Options -->
                    <div class="format-section">
                        <div class="section-title">
                            <div class="section-icon">🔧</div>
                            אפשרויות פורמט
                        </div>
                        <div class="format-options">
                            <div class="format-option">
                                <span class="format-label">גודל גופן</span>
                                <div class="format-control">
                                    <input type="number" class="format-input" value="12" min="8" max="18">
                                    <span style="font-size: 11px; color: #666;">pt</span>
                                </div>
                            </div>
                            <div class="format-option">
                                <span class="format-label">ריווח שורות</span>
                                <div class="format-control">
                                    <input type="number" class="format-input" value="1.5" min="1" max="3" step="0.1">
                                </div>
                            </div>
                            <div class="format-option">
                                <span class="format-label">מספור עמודים</span>
                                <div class="format-control">
                                    <div class="format-toggle active"></div>
                                </div>
                            </div>
                            <div class="format-option">
                                <span class="format-label">כותרת עליונה</span>
                                <div class="format-control">
                                    <div class="format-toggle active"></div>
                                </div>
                            </div>
                            <div class="format-option">
                                <span class="format-label">חתימה דיגיטלית</span>
                                <div class="format-control">
                                    <div class="format-toggle"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Export Actions -->
                    <div class="export-section">
                        <div class="section-title">
                            <div class="section-icon">📤</div>
                            ייצוא מסמך
                        </div>
                        <div class="export-progress-bar">
                            <div class="export-progress-fill"></div>
                        </div>
                        <div class="export-actions">
                            <button class="btn btn-primary">ייצא לוורד (DOCX)</button>
                            <button class="btn btn-primary">ייצא ל-PDF</button>
                            <button class="btn btn-secondary">תצוגה מקדימה</button>
                            <button class="btn btn-success">השלם ושלח ללקוח</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Header and Sidebar hover effects
        let headerTimeout;
        let sidebarTimeout;

        function showHeader() {
            clearTimeout(headerTimeout);
            document.getElementById('collapsibleHeader').classList.add('show');
        }

        function hideHeader() {
            headerTimeout = setTimeout(() => {
                document.getElementById('collapsibleHeader').classList.remove('show');
            }, 1500);
        }

        function showSidebar() {
            clearTimeout(sidebarTimeout);
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const overlay = document.getElementById('overlay');

            sidebar.classList.add('show');
            mainContent.classList.add('sidebar-open');
            overlay.classList.add('show');
        }

        function hideSidebar() {
            sidebarTimeout = setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const mainContent = document.getElementById('mainContent');
                const overlay = document.getElementById('overlay');

                sidebar.classList.remove('show');
                mainContent.classList.remove('sidebar-open');
                overlay.classList.remove('show');
            }, 1500);
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const overlay = document.getElementById('overlay');

            sidebar.classList.toggle('show');
            mainContent.classList.toggle('sidebar-open');
            overlay.classList.toggle('show');
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const overlay = document.getElementById('overlay');

            sidebar.classList.remove('show');
            mainContent.classList.remove('sidebar-open');
            overlay.classList.remove('show');
        }

        // Add click interactions for visual feedback
        document.addEventListener('DOMContentLoaded', function() {
            // Template selection
            document.querySelectorAll('.template-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });

            // Format toggles
            document.querySelectorAll('.format-toggle').forEach(toggle => {
                toggle.addEventListener('click', function() {
                    this.classList.toggle('active');
                });
            });

            // Speed buttons
            document.querySelectorAll('.speed-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            // Project items
            document.querySelectorAll('.project-item').forEach(item => {
                item.addEventListener('click', function() {
                    document.querySelectorAll('.project-item').forEach(itm => itm.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        });
    </script>
</body>

</html>