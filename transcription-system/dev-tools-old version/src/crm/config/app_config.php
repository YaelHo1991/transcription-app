<?php
/**
 * CRM Application Configuration
 */
class AppConfig {
    
    // Upload settings
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    const ALLOWED_FILE_TYPES = ['mp3', 'mp4', 'wav', 'avi', 'mov', 'docx', 'pdf'];
    const UPLOAD_PATH = '/var/www/html/uploads/users/';
    
    // Pagination
    const ITEMS_PER_PAGE = 20;
    
    // Default pricing
    const DEFAULT_PRICE_PER_PAGE = 5.00;
    
    // Project settings
    const PROJECT_STATUSES = [
        'pending' => 'Pending',
        'assigned' => 'Assigned', 
        'in_progress' => 'In Progress',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled'
    ];
    
    const WORKFLOW_STATUSES = [
        'transcription' => 'Transcription',
        'proofreading' => 'Proofreading',
        'export' => 'Export',
        'completed' => 'Completed'
    ];
    
    // Transcriber settings
    const TRANSCRIBER_STATUSES = [
        'active' => 'Active',
        'inactive' => 'Inactive',
        'busy' => 'Busy'
    ];
    
    const SPECIALIZATIONS = [
        'legal' => 'Legal Documents',
        'medical' => 'Medical Records',
        'business' => 'Business Meetings',
        'academic' => 'Academic Content',
        'general' => 'General Content'
    ];
    
    // File type detection
    public static function getFileType($filename) {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $audioTypes = ['mp3', 'wav', 'aac', 'flac', 'm4a'];
        $videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'mkv'];
        $documentTypes = ['pdf', 'doc', 'docx', 'txt'];
        
        if (in_array($extension, $audioTypes)) return 'audio';
        if (in_array($extension, $videoTypes)) return 'video';
        if (in_array($extension, $documentTypes)) return 'document';
        
        return 'other';
    }
    
    // Generate unique transcriber code
    public static function generateTranscriberCode() {
        return 'TR' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    // Format file size
    public static function formatFileSize($bytes) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
?>