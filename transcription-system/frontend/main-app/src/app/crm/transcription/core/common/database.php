<?php
/*
 * =========================================
 * Transcription System - Database Connection
 * common/database.php
 * =========================================
 * Unified database connection for all pages
 */

// Database configuration
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

try {
    // Create PDO connection
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set UTF-8 encoding
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("SET CHARACTER SET utf8mb4");
    $pdo->exec("SET character_set_connection=utf8mb4");
    $pdo->exec("SET character_set_client=utf8mb4");
    $pdo->exec("SET character_set_results=utf8mb4");
    
} catch (PDOException $e) {
    // Log error and show user-friendly message
    error_log("Database connection failed: " . $e->getMessage());
    die("מערכת התמלול אינה זמינה כרגע. אנא נסה שוב מאוחר יותר.");
}

// Helper function to execute prepared statements safely
function executeQuery($pdo, $query, $params = []) {
    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        error_log("Query execution failed: " . $e->getMessage());
        error_log("Query: " . $query);
        error_log("Params: " . json_encode($params));
        throw new Exception("שגיאה בביצוע פעולה במסד הנתונים");
    }
}

// Helper function to get single result
function fetchOne($pdo, $query, $params = []) {
    $stmt = executeQuery($pdo, $query, $params);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Helper function to get multiple results
function fetchAll($pdo, $query, $params = []) {
    $stmt = executeQuery($pdo, $query, $params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Helper function to get single value
function fetchValue($pdo, $query, $params = []) {
    $stmt = executeQuery($pdo, $query, $params);
    return $stmt->fetchColumn();
}

// Helper function to insert and return ID
function insertAndGetId($pdo, $query, $params = []) {
    executeQuery($pdo, $query, $params);
    return $pdo->lastInsertId();
}
?>