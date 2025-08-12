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

// Check permission for proofreading (E) - skip in development mode
if (!$isDevelopmentMode && (!isset($_SESSION['can_proofread']) || !$_SESSION['can_proofread'])) {
    $_SESSION['access_error'] = "אין לך הרשאה לגשת לעמוד ההגהה";
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
    <title>אפליקציית תמלול - ממשק הגהה</title>
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
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
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
            background: rgba(0, 123, 255, 0.1);
            padding: 8px 15px;
            border-radius: 20px;
            border: 1px solid rgba(0, 123, 255, 0.3);
            font-size: 14px;
        }

        .logout-btn {
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .logout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
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
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
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
            border-bottom: 1px solid rgba(0, 123, 255, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-title {
            font-size: 18px;
            font-weight: 700;
            color: #17a2b8;
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
            color: #17a2b8;
        }

        .sidebar-content {
            padding: 20px;
        }

        .sidebar-stats {
            background: rgba(0, 123, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid rgba(0, 123, 255, 0.2);
        }

        .sidebar-stats-title {
            font-size: 14px;
            font-weight: 600;
            color: #17a2b8;
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
            color: #17a2b8;
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
            background: rgba(0, 123, 255, 0.1);
            border: 1px solid rgba(0, 123, 255, 0.3);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }

        .project-item:hover {
            background: rgba(0, 123, 255, 0.2);
            transform: translateY(-2px);
        }

        .project-item.active {
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            border-color: #007bff;
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

        .proofreading-workspace {
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
            border-bottom: 2px solid rgba(0, 123, 255, 0.2);
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

        .transcription-info {
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
            background: rgba(0, 123, 255, 0.1);
            border: 1px solid rgba(0, 123, 255, 0.3);
            color: #007bff;
            padding: 8px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .nav-btn:hover:not(:disabled) {
            background: rgba(0, 123, 255, 0.2);
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
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .progress-indicator {
            background: rgba(0, 123, 255, 0.1);
            border: 1px solid rgba(0, 123, 255, 0.3);
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            color: #007bff;
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
            border: 1px solid rgba(0, 123, 255, 0.1);
            min-height: 120px;
            display: flex;
            flex-direction: column;
            border-top: none;
            border-left: none;
            border-right: none;
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
            background: rgba(0, 123, 255, 0.1);
            border: 1px solid rgba(0, 123, 255, 0.3);
            color: #007bff;
            padding: 8px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .media-nav-btn:hover:not(:disabled) {
            background: rgba(0, 123, 255, 0.2);
            transform: translateY(-1px);
        }

        .media-nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .media-info {
            background: rgba(0, 123, 255, 0.1);
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 12px;
            color: #007bff;
            font-weight: 600;
        }

        .playback-speed {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .speed-btn {
            background: rgba(0, 123, 255, 0.1);
            border: 1px solid rgba(0, 123, 255, 0.3);
            color: #007bff;
            padding: 4px 8px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .speed-btn:hover {
            background: rgba(0, 123, 255, 0.2);
        }

        .speed-btn.active {
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            color: white;
        }

        .media-player-container {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: center;
        }

        .media-player {
            background: linear-gradient(135deg, rgba(0, 123, 255, 0.05) 0%, rgba(23, 162, 184, 0.05) 100%);
            padding: 15px;
            border-radius: 12px;
            border: 1px solid rgba(0, 123, 255, 0.2);
        }

        .current-media-title {
            font-weight: 600;
            color: #007bff;
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
            border: 1px solid rgba(0, 123, 255, 0.1);
            font-size: 12px;
        }

        .metadata-label {
            color: #666;
            font-weight: 600;
        }

        .metadata-value {
            color: #007bff;
            font-weight: 700;
        }

        .timestamp-display {
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 10px;
            text-align: center;
            font-family: 'Courier New', monospace;
            font-weight: 700;
            font-size: 14px;
        }

        /* ===== PROOFREADING PANEL ===== */
        .proofreading-panel {
            grid-column: 1;
            grid-row: 2;
            display: flex;
            flex-direction: column;
            gap: 20px;
            height: 100%;
        }

        .comparison-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(0, 123, 255, 0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            border-left: none;
            border-bottom: none;
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
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }

        .comparison-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
            flex: 1;
            min-height: 0;
        }

        .text-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            flex: 1;
            min-height: 400px;
        }

        .original-text,
        .proofread-text {
            background: white;
            border: 2px solid rgba(0, 123, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
            overflow-y: auto;
            min-height: 0;
        }

        .original-text {
            border-color: rgba(108, 117, 125, 0.3);
        }

        .proofread-text {
            border-color: rgba(0, 123, 255, 0.3);
        }

        .text-label {
            font-weight: 600;
            margin-bottom: 10px;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 14px;
        }

        .original-label {
            background: rgba(108, 117, 125, 0.1);
            color: #6c757d;
        }

        .proofread-label {
            background: rgba(0, 123, 255, 0.1);
            color: #007bff;
        }

        .text-content {
            font-family: 'David', 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            white-space: pre-wrap;
            min-height: 300px;
        }

        .editable-text {
            outline: none;
            padding: 10px;
            border: 1px solid transparent;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .editable-text:focus {
            border-color: #007bff;
            background: rgba(0, 123, 255, 0.05);
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

        /* ===== CHANGES TRACKER ===== */
        .changes-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(0, 123, 255, 0.1);
            flex: 0 0 250px;
            border-right: none;
        }

        .changes-list {
            max-height: 180px;
            overflow-y: auto;
            background: white;
            border-radius: 8px;
            border: 1px solid rgba(0, 123, 255, 0.2);
        }

        .change-item {
            padding: 10px;
            border-bottom: 1px solid rgba(0, 123, 255, 0.1);
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .change-item:last-child {
            border-bottom: none;
        }

        .change-type {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }

        .change-type.addition {
            background: rgba(40, 167, 69, 0.2);
            color: #28a745;
        }

        .change-type.deletion {
            background: rgba(220, 53, 69, 0.2);
            color: #dc3545;
        }

        .change-type.modification {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
        }

        .change-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }

        .stat-item {
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            background: white;
            border: 1px solid rgba(0, 123, 255, 0.1);
        }

        .stat-number {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 2px;
        }

        .stat-label {
            font-size: 10px;
            color: #666;
        }

        .stat-item.additions .stat-number {
            color: #28a745;
        }

        .stat-item.deletions .stat-number {
            color: #dc3545;
        }

        .stat-item.modifications .stat-number {
            color: #ffc107;
        }

        /* ===== QUALITY CONTROL ===== */
        .quality-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(0, 123, 255, 0.1);
            flex: 0 0 200px;
            border-right: none;
        }

        .quality-metrics {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid rgba(0, 123, 255, 0.1);
        }

        .metric-label {
            font-size: 13px;
            font-weight: 600;
            color: #666;
        }

        .metric-value {
            font-size: 14px;
            font-weight: 700;
        }

        .metric-value.good {
            color: #28a745;
        }

        .metric-value.warning {
            color: #ffc107;
        }

        .metric-value.error {
            color: #dc3545;
        }

        .quality-score {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 15px;
        }

        .score-number {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .score-label {
            font-size: 12px;
            opacity: 0.9;
        }

        /* ===== ACTIONS SECTION ===== */
        .actions-section {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0;
            padding: 20px;
            border: 1px solid rgba(0, 123, 255, 0.1);
            flex: 0 0 150px;
            border-right: none;
            border-bottom: none;
        }

        .actions-grid {
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
            background: linear-gradient(135deg, #007bff 0%, #17a2b8 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
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
            background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
            color: #0c5460;
            border: 1px solid rgba(0, 123, 255, 0.3);
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

            .text-comparison {
                grid-template-columns: 1fr;
                grid-template-rows: 1fr 1fr;
                min-height: 600px;
            }

            .tools-panel {
                order: 3;
                flex-direction: row;
                overflow-x: auto;
            }

            .changes-section,
            .quality-section,
            .actions-section {
                flex: 0 0 250px;
            }
        }

        @media (max-width: 480px) {
            .proofreading-workspace {
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

        /* ===== HIGHLIGHT ANIMATIONS ===== */
        .highlight-added {
            background: rgba(40, 167, 69, 0.2);
            animation: highlightPulse 1s ease-in-out;
        }

        .highlight-removed {
            background: rgba(220, 53, 69, 0.2);
            animation: highlightPulse 1s ease-in-out;
        }

        .highlight-modified {
            background: rgba(255, 193, 7, 0.2);
            animation: highlightPulse 1s ease-in-out;
        }

        @keyframes highlightPulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
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
                <h1>ממשק הגהה</h1>
            </div>
            <div class="user-info">
                <div class="user-profile">
                    <span>שלום <?php echo htmlspecialchars($username); ?></span>
                </div>
                <a href="?logout=1<?php echo $showDevNav ? '&devnav=1' : ''; ?>" class="logout-btn">התנתק</a>
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
                <a href="index.php<?php echo $queryString; ?>" class="active">הגהה</a>
                <a href="../export/index.php<?php echo $queryString; ?>">ייצוא</a>
                <a href="../records/index.php<?php echo $queryString; ?>">רישומים</a>
            </div>
        </div>
    </div>

    <!-- Sidebar Reveal Zone -->
    <div class="sidebar-reveal-zone" onmouseenter="showSidebar()" onmouseleave="hideSidebar()"></div>

    <!-- Sidebar -->
    <div class="sidebar" id="sidebar" onmouseenter="showSidebar()" onmouseleave="hideSidebar()">
        <div class="sidebar-header">
            <h3 class="sidebar-title">פרויקטים להגהה</h3>
            <button class="sidebar-close" onclick="toggleSidebar()">×</button>
        </div>
        <div class="sidebar-content">
            <!-- Statistics -->
            <div class="sidebar-stats">
                <div class="sidebar-stats-title">סטטיסטיקות הגהה</div>
                <div class="sidebar-stats-grid">
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">8</div>
                        <div class="sidebar-stat-label">ממתינים להגהה</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">3</div>
                        <div class="sidebar-stat-label">בעבודה</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">15</div>
                        <div class="sidebar-stat-label">הושלמו השבוע</div>
                    </div>
                    <div class="sidebar-stat-item">
                        <div class="sidebar-stat-number">92%</div>
                        <div class="sidebar-stat-label">דירוג איכות</div>
                    </div>
                </div>
            </div>

            <!-- Projects List -->
            <div class="project-list">
                <div class="project-item active" onclick="selectProject('PROOF_001', 'crm')">
                    <div class="project-type-badge crm">חברת משפטים</div>
                    <div class="project-item-title">הגהת תמלול ישיבת בית המשפט</div>
                    <div class="project-item-meta">
                        <span>עמודים: 24</span>
                        <span>שגיאות: 12</span>
                        <span>דחיפות: גבוהה</span>
                    </div>
                </div>

                <div class="project-item" onclick="selectProject('PROOF_002', 'crm')">
                    <div class="project-type-badge crm">חברת ייעוץ</div>
                    <div class="project-item-title">ראיון עם מנכ"ל - הגהה</div>
                    <div class="project-item-meta">
                        <span>עמודים: 8</span>
                        <span>שגיאות: 3</span>
                        <span>דחיפות: רגילה</span>
                    </div>
                </div>

                <div class="project-item" onclick="selectProject('IND_PROOF_001', 'independent')">
                    <div class="project-type-badge independent">עצמאי</div>
                    <div class="project-item-title">הגהה - 17/07/2025</div>
                    <div class="project-item-meta">
                        <span>סוג: הגהה</span>
                        <span>עמודים: 5</span>
                        <span>סטטוס: בתהליך</span>
                    </div>
                </div>

                <div class="project-item" onclick="selectProject('PROOF_003', 'crm')">
                    <div class="project-type-badge crm">אוניברסיטה</div>
                    <div class="project-item-title">הרצאה אקדמית - הגהה</div>
                    <div class="project-item-meta">
                        <span>עמודים: 18</span>
                        <span>שגיאות: 7</span>
                        <span>דחיפות: נמוכה</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Overlay -->
    <div class="overlay" id="overlay" onclick="closeSidebar()"></div>

    <!-- Main Content -->
    <div class="main-content" id="mainContent">
        <div class="proofreading-workspace">
            <div class="workspace-header">
                <div class="workspace-title-section">
                    <div class="project-info">
                        <div class="workspace-title">הגהת תמלול ישיבת בית המשפט</div>
                        <div class="transcription-info">תמלול ראשוני: 24 עמודים | מתמלל: יוסי כהן | תאריך: 17/07/2025</div>
                    </div>
                    <div class="project-nav">
                        <button class="nav-btn" onclick="navigateProject('prev')" id="prevProjectBtn">◀ פרויקט קודם</button>
                        <button class="nav-btn" onclick="navigateProject('next')" id="nextProjectBtn">פרויקט הבא ▶</button>
                    </div>
                </div>
                <div class="workspace-status">
                    <span class="status-badge">בהגהה</span>
                    <span class="progress-indicator">עמוד 12 מתוך 24</span>
                </div>
            </div>

            <div class="workspace-grid">
                <!-- Media Player Section -->
                <div class="media-section">
                    <div class="media-header">
                        <div class="section-title">
                            <div class="section-icon">🎵</div>
                            נגן מדיה להגהה
                        </div>
                        <div class="media-controls-header">
                            <button class="media-nav-btn" onclick="navigateMedia('prev')" id="prevMediaBtn">◀ קובץ קודם</button>
                            <div class="media-info">
                                <span id="mediaCounter">1 מתוך 2</span>
                            </div>
                            <button class="media-nav-btn" onclick="navigateMedia('next')" id="nextMediaBtn">קובץ הבא ▶</button>
                            
                            <div class="playback-speed">
                                <span style="font-size: 12px; color: #666; font-weight: 600;">מהירות:</span>
                                <button class="speed-btn" onclick="setPlaybackSpeed(0.75)">0.75x</button>
                                <button class="speed-btn active" onclick="setPlaybackSpeed(1.0)">1.0x</button>
                                <button class="speed-btn" onclick="setPlaybackSpeed(1.25)">1.25x</button>
                                <button class="speed-btn" onclick="setPlaybackSpeed(1.5)">1.5x</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="media-player-container">
                        <div class="media-player">
                            <div class="current-media-title" id="mediaTitle">court_hearing_part1.mp3</div>
                            <div id="mediaContent">
                                <audio controls id="audioPlayer" style="width: 100%;">
                                    <source src="#" type="audio/mpeg">
                                    <p>הדפדפן שלך לא תומך בנגינת אודיו HTML5.</p>
                                </audio>
                            </div>
                        </div>
                        
                        <div class="media-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">משך כולל</span>
                                <span class="metadata-value" id="totalDuration">47:23</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">זמן נוכחי</span>
                                <span class="metadata-value" id="currentTime">00:00</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">קובץ נוכחי</span>
                                <span class="metadata-value" id="currentFileNumber">1/2</span>
                            </div>
                            <div class="timestamp-display" id="timestampDisplay">
                                00:00 / 47:23
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Proofreading Panel -->
                <div class="proofreading-panel">
                    <div class="comparison-section">
                        <div class="section-title">
                            <div class="section-icon">🔍</div>
                            השוואת טקסטים
                        </div>
                        <div class="comparison-container">
                            <div class="text-comparison">
                                <div class="original-text">
                                    <div class="text-label original-label">תמלול מקורי</div>
                                    <div class="text-content" id="originalText">
בית המשפט המחוזי בתל אביב
תיק מספר 12345-07-25

השופט: אנחנו פותחים את הישיבה היום בשעה 09:30. 

עורך דין התובע: כבוד השופט, אנו טוענים שהנתבע לא מילא את התחייבויותיו על פי החוזה שנחתם ביניהם ב15 בינואר 2024.

עורך דין הנתבע: כבוד השופט, מרשי ביצע את כל המעצר הנדרש בחוזה ולא היתה כל הפרה.

השופט: האם יש עדים שצריכים להתייצב היום?

עורך דין התובע: כן כבוד השופט, אנו מבקשים לזמן את מנהל המכירות של החברה.

השופט: בסדר, נזמן את העד. האם העד נמצא בבנין?

עורך דין התובע: כן כבוד השופט, הוא ממתין בחוץ.

השופט: אנא הביאו את העד.

[העד נכנס לאולם]

השופט: אנא הציגו את עצמכם בפני בית המשפט.

העד: שמי אברהם לוי, אני מנהל מכירות בחברת "טכנולוגיות מתקדמות בע"מ" כבר 8 שנים.

השופט: האם אתם מכירים את הנתבע?

העד: כן, עבדנו איתו על פרוייקט גדול במשך 6 חודשים.
                                    </div>
                                </div>
                                <div class="proofread-text">
                                    <div class="text-label proofread-label">טקסט מוגה</div>
                                    <div class="text-content editable-text" id="proofreadText" contenteditable="true">
בית המשפט המחוזי בתל אביב
תיק מספר 12345-07-25

השופט: אנחנו פותחים את הישיבה היום בשעה 09:30.

עורך דין התובע: כבוד השופט, אנו טוענים שהנתבע לא מילא את התחייבויותיו על פי החוזה שנחתם ביניהם ב-15 בינואר 2024.

עורך דין הנתבע: כבוד השופט, מרשי ביצע את כל המתחייב בחוזה ולא היתה כל הפרה.

השופט: האם יש עדים שצריכים להתייצב היום?

עורך דין התובע: כן כבוד השופט, אנו מבקשים לזמן את מנהל המכירות של החברה.

השופט: בסדר, נזמן את העד. האם העד נמצא בבניין?

עורך דין התובע: כן כבוד השופט, הוא ממתין בחוץ.

השופט: אנא הביאו את העד.

[העד נכנס לאולם]

השופט: אנא הציגו את עצמכם בפני בית המשפט.

העד: שמי אברהם לוי, אני מנהל מכירות בחברת "טכנולוגיות מתקדמות בע"מ" כבר 8 שנים.

השופט: האם אתם מכירים את הנתבע?

העד: כן, עבדנו איתו על פרויקט גדול במשך 6 חודשים.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tools Panel -->
                <div class="tools-panel">
                    <!-- Changes Tracker -->
                    <div class="changes-section">
                        <div class="section-title">
                            <div class="section-icon">📊</div>
                            מעקב שינויים
                        </div>
                        <div class="change-stats">
                            <div class="stat-item additions">
                                <div class="stat-number" id="additionsCount">2</div>
                                <div class="stat-label">הוספות</div>
                            </div>
                            <div class="stat-item deletions">
                                <div class="stat-number" id="deletionsCount">1</div>
                                <div class="stat-label">מחיקות</div>
                            </div>
                            <div class="stat-item modifications">
                                <div class="stat-number" id="modificationsCount">4</div>
                                <div class="stat-label">תיקונים</div>
                            </div>
                        </div>
                        <div class="changes-list" id="changesList">
                            <div class="change-item">
                                <span>"המעצר" → "המתחייב"</span>
                                <span class="change-type modification">תיקון</span>
                            </div>
                            <div class="change-item">
                                <span>הוספת מקף ב"ב-15"</span>
                                <span class="change-type addition">הוספה</span>
                            </div>
                            <div class="change-item">
                                <span>"בנין" → "בניין"</span>
                                <span class="change-type modification">תיקון</span>
                            </div>
                            <div class="change-item">
                                <span>"פרוייקט" → "פרויקט"</span>
                                <span class="change-type modification">תיקון</span>
                            </div>
                        </div>
                    </div>

                    <!-- Quality Control -->
                    <div class="quality-section">
                        <div class="section-title">
                            <div class="section-icon">⭐</div>
                            בקרת איכות
                        </div>
                        <div class="quality-score">
                            <div class="score-number">88%</div>
                            <div class="score-label">ציון איכות</div>
                        </div>
                        <div class="quality-metrics">
                            <div class="metric-item">
                                <span class="metric-label">שגיאות כתיב</span>
                                <span class="metric-value warning">3</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">שגיאות דקדוק</span>
                                <span class="metric-value error">2</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">שגיאות סימון</span>
                                <span class="metric-value warning">1</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">עקביות</span>
                                <span class="metric-value good">95%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="actions-section">
                        <div class="section-title">
                            <div class="section-icon">⚡</div>
                            פעולות
                        </div>
                        <div class="actions-grid">
                            <button class="btn btn-primary" onclick="saveProofreading()">שמור הגהה</button>
                            <button class="btn btn-secondary" onclick="showComments()">הערות למתמלל</button>
                            <button class="btn btn-success" onclick="completeProofreading()">סיום הגהה</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global variables
        let currentProjectIndex = 0;
        let currentMediaIndex = 0;
        let originalText = '';
        let currentText = '';
        let changes = [];
        let autoSaveInterval;
        let mediaFiles = [
            { id: 1, filename: 'court_hearing_part1.mp3', duration: '47:23', file_type: 'audio/mpeg' },
            { id: 2, filename: 'court_hearing_part2.mp3', duration: '23:47', file_type: 'audio/mpeg' }
        ];
        let mediaPositions = {};
        let currentPlaybackSpeed = 1.0;

        // Available projects
        const availableProjects = [
            { id: 'PROOF_001', type: 'crm', title: 'הגהת תמלול ישיבת בית המשפט' },
            { id: 'PROOF_002', type: 'crm', title: 'ראיון עם מנכ"ל - הגהה' },
            { id: 'IND_PROOF_001', type: 'independent', title: 'הגהה - 17/07/2025' },
            { id: 'PROOF_003', type: 'crm', title: 'הרצאה אקדמית - הגהה' }
        ];

        // Header and Sidebar functions
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
            }, 500);
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

        // Project management
        function selectProject(projectId, projectType) {
            showMessage('טוען פרויקט: ' + projectId, 'info');
            
            // Update active project in sidebar
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.remove('active');
            });
            
            event.target.closest('.project-item').classList.add('active');
            
            // Update project title
            const project = availableProjects.find(p => p.id === projectId);
            if (project) {
                document.querySelector('.workspace-title').textContent = project.title;
            }

            // Reset change tracking
            resetChangeTracking();
            
            // Update media for new project
            updateMediaForProject(projectId);
        }

        function updateMediaForProject(projectId) {
            // Update media files based on project (demo data)
            if (projectId === 'PROOF_001') {
                mediaFiles = [
                    { id: 1, filename: 'court_hearing_part1.mp3', duration: '47:23', file_type: 'audio/mpeg' },
                    { id: 2, filename: 'court_hearing_part2.mp3', duration: '23:47', file_type: 'audio/mpeg' }
                ];
            } else if (projectId === 'PROOF_002') {
                mediaFiles = [
                    { id: 3, filename: 'ceo_interview.mp3', duration: '35:12', file_type: 'audio/mpeg' }
                ];
            } else {
                mediaFiles = [
                    { id: 4, filename: 'lecture_recording.mp3', duration: '52:18', file_type: 'audio/mpeg' }
                ];
            }
            
            currentMediaIndex = 0;
            loadMedia(0);
            updateMediaNavigation();
        }

        function navigateProject(direction) {
            if (direction === 'next') {
                currentProjectIndex = (currentProjectIndex + 1) % availableProjects.length;
            } else {
                currentProjectIndex = currentProjectIndex === 0 ? availableProjects.length - 1 : currentProjectIndex - 1;
            }

            const project = availableProjects[currentProjectIndex];
            selectProject(project.id, project.type);
        }

        // Media player functions
        function navigateMedia(direction) {
            if (mediaFiles.length === 0) return;

            // Save current position
            saveCurrentMediaPosition();

            if (direction === 'next') {
                currentMediaIndex = (currentMediaIndex + 1) % mediaFiles.length;
            } else {
                currentMediaIndex = currentMediaIndex === 0 ? mediaFiles.length - 1 : currentMediaIndex - 1;
            }

            loadMedia(currentMediaIndex);
            updateMediaNavigation();
        }

        function loadMedia(index) {
            if (index < 0 || index >= mediaFiles.length) return;

            const file = mediaFiles[index];
            const mediaTitle = document.getElementById('mediaTitle');
            const mediaContent = document.getElementById('mediaContent');
            const totalDuration = document.getElementById('totalDuration');

            if (mediaTitle) mediaTitle.textContent = file.filename;
            if (totalDuration) totalDuration.textContent = file.duration;

            let mediaHTML = '';
            if (file.file_type.includes('audio')) {
                mediaHTML = `<audio controls id="audioPlayer" style="width: 100%;">
                    <source src="#" type="${file.file_type}">
                    <p>הדפדפן שלך לא תומך בנגינת אודיו HTML5.</p>
                </audio>`;
            } else if (file.file_type.includes('video')) {
                mediaHTML = `<video controls id="videoPlayer" style="width: 100%; max-height: 200px;">
                    <source src="#" type="${file.file_type}">
                    <p>הדפדפן שלך לא תומך בנגינת וידאו HTML5.</p>
                </video>`;
            }

            if (mediaContent) {
                mediaContent.innerHTML = mediaHTML;
                
                // Set up time tracking
                setTimeout(() => {
                    setupMediaTimeTracking();
                    restoreMediaPosition(file.id);
                    setPlaybackSpeed(currentPlaybackSpeed);
                }, 100);
            }
        }

        function updateMediaNavigation() {
            const mediaCounter = document.getElementById('mediaCounter');
            const currentFileNumber = document.getElementById('currentFileNumber');
            const prevBtn = document.getElementById('prevMediaBtn');
            const nextBtn = document.getElementById('nextMediaBtn');

            if (mediaCounter) {
                mediaCounter.textContent = `${currentMediaIndex + 1} מתוך ${mediaFiles.length}`;
            }
            
            if (currentFileNumber) {
                currentFileNumber.textContent = `${currentMediaIndex + 1}/${mediaFiles.length}`;
            }

            if (prevBtn) prevBtn.disabled = mediaFiles.length <= 1;
            if (nextBtn) nextBtn.disabled = mediaFiles.length <= 1;
        }

        function setupMediaTimeTracking() {
            const audioPlayer = document.getElementById('audioPlayer');
            const videoPlayer = document.getElementById('videoPlayer');
            const player = audioPlayer || videoPlayer;

            if (player) {
                player.addEventListener('timeupdate', function() {
                    updateTimeDisplay(this.currentTime, this.duration);
                });

                player.addEventListener('loadedmetadata', function() {
                    updateTimeDisplay(this.currentTime, this.duration);
                });
            }
        }

        function updateTimeDisplay(currentTime, duration) {
            const currentTimeElement = document.getElementById('currentTime');
            const timestampDisplay = document.getElementById('timestampDisplay');

            const currentFormatted = formatTime(currentTime || 0);
            const durationFormatted = formatTime(duration || 0);

            if (currentTimeElement) {
                currentTimeElement.textContent = currentFormatted;
            }

            if (timestampDisplay) {
                timestampDisplay.textContent = `${currentFormatted} / ${durationFormatted}`;
            }
        }

        function formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            if (hours > 0) {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        function saveCurrentMediaPosition() {
            const audioPlayer = document.getElementById('audioPlayer');
            const videoPlayer = document.getElementById('videoPlayer');
            const player = audioPlayer || videoPlayer;

            if (player && mediaFiles.length > 0) {
                const currentFile = mediaFiles[currentMediaIndex];
                if (currentFile) {
                    mediaPositions[currentFile.id] = player.currentTime;
                }
            }
        }

        function restoreMediaPosition(fileId) {
            if (mediaPositions[fileId]) {
                const audioPlayer = document.getElementById('audioPlayer');
                const videoPlayer = document.getElementById('videoPlayer');
                const player = audioPlayer || videoPlayer;

                if (player) {
                    player.currentTime = mediaPositions[fileId];
                }
            }
        }

        function setPlaybackSpeed(speed) {
            const audioPlayer = document.getElementById('audioPlayer');
            const videoPlayer = document.getElementById('videoPlayer');
            const player = audioPlayer || videoPlayer;

            if (player) {
                player.playbackRate = speed;
                currentPlaybackSpeed = speed;
            }

            // Update speed button states
            document.querySelectorAll('.speed-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            event.target.classList.add('active');
        }

        // Text comparison and change tracking
        function trackChanges() {
            const proofreadText = document.getElementById('proofreadText').textContent;
            const originalTextContent = document.getElementById('originalText').textContent;
            
            // Simple change detection (in real app, would use more sophisticated diff algorithm)
            const differences = findDifferences(originalTextContent, proofreadText);
            updateChangesList(differences);
            updateQualityMetrics(differences);
        }

        function findDifferences(original, proofread) {
            // Simplified diff algorithm for demo
            const changes = [];
            
            // Sample changes for demo
            if (proofread.includes('המתחייב') && original.includes('המעצר')) {
                changes.push({ type: 'modification', original: 'המעצר', changed: 'המתחייב' });
            }
            
            if (proofread.includes('ב-15') && original.includes('ב15')) {
                changes.push({ type: 'addition', text: 'הוספת מקף ב"ב-15"' });
            }
            
            if (proofread.includes('בניין') && original.includes('בנין')) {
                changes.push({ type: 'modification', original: 'בנין', changed: 'בניין' });
            }
            
            return changes;
        }

        function updateChangesList(changes) {
            const changesList = document.getElementById('changesList');
            const additionsCount = document.getElementById('additionsCount');
            const deletionsCount = document.getElementById('deletionsCount');
            const modificationsCount = document.getElementById('modificationsCount');
            
            let additions = 0, deletions = 0, modifications = 0;
            
            changes.forEach(change => {
                switch(change.type) {
                    case 'addition': additions++; break;
                    case 'deletion': deletions++; break;
                    case 'modification': modifications++; break;
                }
            });
            
            additionsCount.textContent = additions;
            deletionsCount.textContent = deletions;
            modificationsCount.textContent = modifications;
        }

        function updateQualityMetrics(changes) {
            // Update quality score based on changes
            const totalChanges = changes.length;
            const qualityScore = Math.max(100 - (totalChanges * 2), 70);
            
            document.querySelector('.score-number').textContent = qualityScore + '%';
            
            // Update score color
            const scoreElement = document.querySelector('.quality-score');
            if (qualityScore >= 90) {
                scoreElement.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            } else if (qualityScore >= 75) {
                scoreElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
            } else {
                scoreElement.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
            }
        }

        function resetChangeTracking() {
            document.getElementById('additionsCount').textContent = '0';
            document.getElementById('deletionsCount').textContent = '0';
            document.getElementById('modificationsCount').textContent = '0';
            document.querySelector('.score-number').textContent = '100%';
        }

        // Proofreading actions
        function saveProofreading() {
            showMessage('הגהה נשמרה בהצלחה', 'success');
            trackChanges();
        }

        function showComments() {
            const comments = prompt('הוסף הערות למתמלל:');
            if (comments) {
                showMessage('הערות נשמרו למתמלל', 'info');
            }
        }

        function completeProofreading() {
            if (confirm('האם אתה בטוח שסיימת את ההגהה? הפרויקט יועבר לשלב הבא.')) {
                showMessage('הגהה הושלמה ונשלחה לייצוא!', 'success');
                setTimeout(() => {
                    // In real app, would redirect or load next project
                    navigateProject('next');
                }, 2000);
            }
        }

        // Utility functions
        function showMessage(text, type) {
            // Remove existing messages
            const existingMessages = document.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());

            const message = document.createElement('div');
            message.className = `message ${type}`;
            message.textContent = text;

            const container = document.querySelector('.main-content');
            container.insertBefore(message, container.firstChild);

            setTimeout(() => {
                message.remove();
            }, 4000);
        }

        // Auto-save functionality
        function startAutoSave() {
            autoSaveInterval = setInterval(() => {
                saveProofreading();
            }, 30000); // Auto-save every 30 seconds
        }

        function stopAutoSave() {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
        }

        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            const proofreadText = document.getElementById('proofreadText');
            
            // Track changes on text edit
            proofreadText.addEventListener('input', function() {
                trackChanges();
            });

            // Start auto-save
            startAutoSave();

            // Initialize change tracking
            originalText = document.getElementById('originalText').textContent;
            trackChanges();

            // Initialize media player
            loadMedia(0);
            updateMediaNavigation();

            // Auto-save media position every 5 seconds
            setInterval(() => {
                saveCurrentMediaPosition();
            }, 5000);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveProofreading();
            }

            // Ctrl+B to toggle sidebar
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                toggleSidebar();
            }

            // Ctrl+Enter to complete proofreading
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                completeProofreading();
            }

            // Arrow keys for project navigation
            if (e.ctrlKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigateProject('next');
            }

            if (e.ctrlKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateProject('prev');
            }

            // Alt + Arrow keys for media navigation
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigateMedia('next');
            }

            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateMedia('prev');
            }

            // Space bar to play/pause (when not in text area)
            if (e.key === ' ' && !e.target.matches('textarea, input, [contenteditable]')) {
                e.preventDefault();
                const audioPlayer = document.getElementById('audioPlayer');
                const videoPlayer = document.getElementById('videoPlayer');
                const player = audioPlayer || videoPlayer;

                if (player) {
                    if (player.paused) {
                        player.play();
                    } else {
                        player.pause();
                    }
                }
            }
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            stopAutoSave();
        });
    </script>
</body>

</html>