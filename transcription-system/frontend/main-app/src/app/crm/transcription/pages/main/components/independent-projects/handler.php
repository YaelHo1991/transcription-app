<?php
/*
 * =========================================
 * Independent Projects Form Handler
 * components/independent-projects/handler.php
 * =========================================
 * Handles form submissions for independent projects
 */

require_once __DIR__ . '/functions.php';

// Enable error logging for handler
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', $_SERVER['DOCUMENT_ROOT'] . '/server/src/uploads/independent_project_handler.log');

// Log handler execution
error_log("[" . date('Y-m-d H:i:s') . "] Handler.php loaded");

// Handle independent project form submissions
$independentProjectMessage = null;

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
    error_log("[" . date('Y-m-d H:i:s') . "] POST request received with action: " . $_POST['action']);
    switch ($_POST['action']) {
        case 'create_independent_project':
            $workType = $_POST['work_type'] ?? 'transcription';
            $customTitle = !empty($_POST['custom_title']) ? $_POST['custom_title'] : null;
            
            error_log("[" . date('Y-m-d H:i:s') . "] Processing create_independent_project request");
            error_log("[" . date('Y-m-d H:i:s') . "] Work type: $workType");
            error_log("[" . date('Y-m-d H:i:s') . "] Custom title: " . ($customTitle ?? 'none'));
            error_log("[" . date('Y-m-d H:i:s') . "] Session ID: " . session_id());
            error_log("[" . date('Y-m-d H:i:s') . "] User ID from session: " . ($_SESSION['user_id'] ?? 'NOT SET'));
            error_log("[" . date('Y-m-d H:i:s') . "] All session data: " . print_r($_SESSION, true));

            try {
                error_log("[" . date('Y-m-d H:i:s') . "] Calling createIndependentProject function...");
                $project = createIndependentProject($workType, $_SESSION['user_id'], $customTitle);
                error_log("[" . date('Y-m-d H:i:s') . "] Project created successfully: " . $project['id']);
                
                $independentProjectMessage = [
                    'type' => 'success',
                    'text' => "פרויקט עצמאי '{$project['title']}' נוצר בהצלחה"
                ];
            } catch (Exception $e) {
                error_log("[" . date('Y-m-d H:i:s') . "] ERROR creating project: " . $e->getMessage());
                error_log("[" . date('Y-m-d H:i:s') . "] Stack trace: " . $e->getTraceAsString());
                
                $independentProjectMessage = [
                    'type' => 'error',
                    'text' => "שגיאה ביצירת פרויקט עצמאי: " . $e->getMessage()
                ];
            }
            break;

        case 'delete_independent_project':
            $projectId = $_POST['project_id'];

            try {
                if (deleteIndependentProject($projectId, $_SESSION['user_id'])) {
                    $independentProjectMessage = [
                        'type' => 'success',
                        'text' => "פרויקט עצמאי נמחק בהצלחה"
                    ];
                } else {
                    $independentProjectMessage = [
                        'type' => 'error',
                        'text' => "לא ניתן למצוא את הפרויקט למחיקה"
                    ];
                }
            } catch (Exception $e) {
                $independentProjectMessage = [
                    'type' => 'error',
                    'text' => "שגיאה במחיקת פרויקט עצמאי: " . $e->getMessage()
                ];
            }
            break;
    }
}