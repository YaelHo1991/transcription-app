<?php
/**
 * CRM Database Configuration
 * Uses the client database for CRM functionality
 */

class CRMDatabase {
    private static $instance = null;
    private $connection = null;
    
    private function __construct() {
        // Use the main database (corrected configuration)
        $host = 'database';
        $db = 'transcription_system';
        $user = 'appuser';
        $pass = 'apppassword';
        
        try {
            // First connect without database to create it
            $pdo = new PDO("mysql:host=$host;charset=utf8", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Create database if it doesn't exist
            $pdo->exec("CREATE DATABASE IF NOT EXISTS $db CHARACTER SET utf8 COLLATE utf8_general_ci");
            
            // Now connect to the database
            $this->connection = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
            $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Set UTF-8 encoding
            $this->connection->exec("SET NAMES utf8mb4");
            $this->connection->exec("SET CHARACTER SET utf8mb4");
            $this->connection->exec("SET character_set_connection=utf8mb4");
            
        } catch (PDOException $e) {
            throw new Exception("CRM Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Helper method for prepared statements
    public function prepare($query) {
        return $this->connection->prepare($query);
    }
    
    // Helper method for simple queries
    public function query($query) {
        return $this->connection->query($query);
    }
    
    // Helper method to get last insert ID
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    // Helper method for transactions
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    public function commit() {
        return $this->connection->commit();
    }
    
    public function rollback() {
        return $this->connection->rollback();
    }
}
?>