<?php
/*
 * =========================================
 * File Validation Functions
 * includes/file-validation.php
 * =========================================
 * Security and validation functions for file uploads
 */

class FileValidator {
    
    // Maximum file sizes (in bytes)
    private const MAX_FILE_SIZES = [
        'media' => 100 * 1024 * 1024, // 100MB
        'helper' => 50 * 1024 * 1024,  // 50MB
        'image' => 10 * 1024 * 1024,   // 10MB
        'document' => 25 * 1024 * 1024 // 25MB
    ];
    
    // Allowed MIME types
    private const ALLOWED_TYPES = [
        'media' => [
            'audio/mpeg',
            'audio/wav',
            'audio/mp3',
            'audio/x-wav',
            'audio/wave',
            'video/mp4',
            'video/avi',
            'video/mov',
            'video/quicktime',
            'video/x-msvideo'
        ],
        'helper' => [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ]
    ];
    
    // Dangerous file extensions
    private const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'phps',
        'exe', 'com', 'bat', 'cmd', 'scr', 'vbs', 'js',
        'jar', 'pif', 'msi', 'dll', 'sh', 'pl', 'py',
        'rb', 'go', 'rs', 'cpp', 'c', 'h', 'hpp',
        'asp', 'aspx', 'jsp', 'jspx', 'cfm', 'cfc'
    ];
    
    // Magic number signatures for file type verification
    private const MAGIC_NUMBERS = [
        'pdf' => ['25504446'],  // %PDF
        'jpg' => ['FFD8FF'],    // JPEG
        'png' => ['89504E47'],  // PNG
        'gif' => ['47494638'],  // GIF8
        'mp3' => ['494433', 'FFFB', 'FFF3', 'FFF2'], // ID3, MP3 frames
        'mp4' => ['66747970'],  // ftyp (MP4)
        'avi' => ['52494646'],  // RIFF (AVI)
        'wav' => ['52494646'],  // RIFF (WAV)
        'doc' => ['D0CF11E0'], // MS Office
        'docx' => ['504B0304'], // ZIP (Office Open XML)
        'zip' => ['504B0304', '504B0506', '504B0708'] // ZIP
    ];
    
    /**
     * Validate uploaded file
     */
    public static function validateFile($file, $category = 'media') {
        $result = [
            'valid' => false,
            'errors' => [],
            'warnings' => []
        ];
        
        // Check if file was uploaded
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            $result['errors'][] = 'File was not properly uploaded';
            return $result;
        }
        
        // Check file size
        $sizeCheck = self::validateFileSize($file['size'], $category);
        if (!$sizeCheck['valid']) {
            $result['errors'][] = $sizeCheck['error'];
        }
        
        // Check file type
        $typeCheck = self::validateFileType($file, $category);
        if (!$typeCheck['valid']) {
            $result['errors'][] = $typeCheck['error'];
        }
        
        // Check file extension
        $extensionCheck = self::validateFileExtension($file['name']);
        if (!$extensionCheck['valid']) {
            $result['errors'][] = $extensionCheck['error'];
        }
        
        // Check magic numbers (file signature)
        $magicCheck = self::validateMagicNumbers($file['tmp_name'], $file['name']);
        if (!$magicCheck['valid']) {
            $result['warnings'][] = $magicCheck['warning'];
        }
        
        // Security checks
        $securityCheck = self::performSecurityChecks($file);
        if (!$securityCheck['valid']) {
            $result['errors'] = array_merge($result['errors'], $securityCheck['errors']);
        }
        
        // Virus scan (if available)
        $virusCheck = self::scanForVirus($file['tmp_name']);
        if (!$virusCheck['valid']) {
            $result['errors'][] = $virusCheck['error'];
        }
        
        $result['valid'] = empty($result['errors']);
        return $result;
    }
    
    /**
     * Validate file size
     */
    private static function validateFileSize($size, $category) {
        $maxSize = self::MAX_FILE_SIZES[$category] ?? self::MAX_FILE_SIZES['helper'];
        
        if ($size > $maxSize) {
            return [
                'valid' => false,
                'error' => "File size ({$size} bytes) exceeds maximum allowed size (" . self::formatBytes($maxSize) . ")"
            ];
        }
        
        if ($size <= 0) {
            return [
                'valid' => false,
                'error' => 'File appears to be empty or corrupted'
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Validate file MIME type
     */
    private static function validateFileType($file, $category) {
        $allowedTypes = self::ALLOWED_TYPES[$category] ?? self::ALLOWED_TYPES['helper'];
        
        // Check reported MIME type
        $reportedType = $file['type'] ?? '';
        
        // Check actual MIME type
        $actualType = '';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $actualType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
        } elseif (function_exists('mime_content_type')) {
            $actualType = mime_content_type($file['tmp_name']);
        }
        
        // Prefer actual type over reported type
        $mimeType = $actualType ?: $reportedType;
        
        if (!in_array($mimeType, $allowedTypes)) {
            return [
                'valid' => false,
                'error' => "File type '{$mimeType}' is not allowed for category '{$category}'"
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Validate file extension
     */
    private static function validateFileExtension($filename) {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (in_array($extension, self::DANGEROUS_EXTENSIONS)) {
            return [
                'valid' => false,
                'error' => "File extension '{$extension}' is not allowed for security reasons"
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Validate file magic numbers (file signature)
     */
    private static function validateMagicNumbers($tmpName, $filename) {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (!isset(self::MAGIC_NUMBERS[$extension])) {
            return ['valid' => true]; // No magic number check available
        }
        
        $handle = fopen($tmpName, 'rb');
        if (!$handle) {
            return [
                'valid' => false,
                'warning' => 'Could not read file for magic number verification'
            ];
        }
        
        $header = fread($handle, 8);
        fclose($handle);
        
        $headerHex = strtoupper(bin2hex($header));
        $expectedMagic = self::MAGIC_NUMBERS[$extension];
        
        foreach ($expectedMagic as $magic) {
            if (strpos($headerHex, $magic) === 0) {
                return ['valid' => true];
            }
        }
        
        return [
            'valid' => false,
            'warning' => "File signature does not match extension '{$extension}'"
        ];
    }
    
    /**
     * Perform additional security checks
     */
    private static function performSecurityChecks($file) {
        $errors = [];
        
        // Check for embedded PHP code
        if (self::containsPhpCode($file['tmp_name'])) {
            $errors[] = 'File contains potentially dangerous PHP code';
        }
        
        // Check for suspicious content
        if (self::containsSuspiciousContent($file['tmp_name'])) {
            $errors[] = 'File contains suspicious content';
        }
        
        // Check filename for path traversal
        if (self::containsPathTraversal($file['name'])) {
            $errors[] = 'Filename contains path traversal sequences';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * Check for embedded PHP code
     */
    private static function containsPhpCode($filename) {
        $handle = fopen($filename, 'rb');
        if (!$handle) return false;
        
        $content = fread($handle, 1024 * 1024); // Read first 1MB
        fclose($handle);
        
        // Look for PHP tags
        $phpPatterns = [
            '/<\?php/',
            '/<\?[^x]/',
            '/<script[^>]*language=["\']?php["\']?[^>]*>/i',
            '/<%[^=]/'
        ];
        
        foreach ($phpPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check for suspicious content
     */
    private static function containsSuspiciousContent($filename) {
        $handle = fopen($filename, 'rb');
        if (!$handle) return false;
        
        $content = fread($handle, 1024 * 1024); // Read first 1MB
        fclose($handle);
        
        // Look for suspicious patterns
        $suspiciousPatterns = [
            '/eval\s*\(/',
            '/exec\s*\(/',
            '/system\s*\(/',
            '/shell_exec\s*\(/',
            '/passthru\s*\(/',
            '/base64_decode\s*\(/',
            '/gzinflate\s*\(/',
            '/str_rot13\s*\(/',
            '/\.\.\//',
            '/javascript\s*:/i',
            '/vbscript\s*:/i',
            '/on\w+\s*=/i' // JavaScript event handlers
        ];
        
        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check for path traversal in filename
     */
    private static function containsPathTraversal($filename) {
        $suspiciousPatterns = [
            '/\.\.\//',
            '/\.\.\\\/',
            '/\.\.\\\\/',
            '/\/\.\.\//,',
            '/\\\\.\.\\\\/',
            '/\x00/', // Null bytes
            '/\x2F/', // Forward slash
            '/\x5C/'  // Backslash
        ];
        
        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $filename)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Scan file for viruses (if ClamAV is available)
     */
    private static function scanForVirus($filename) {
        // Check if ClamAV is available
        if (!function_exists('exec')) {
            return ['valid' => true]; // Skip if exec is disabled
        }
        
        $command = "clamscan --stdout " . escapeshellarg($filename) . " 2>/dev/null";
        $output = [];
        $returnCode = 0;
        
        exec($command, $output, $returnCode);
        
        if ($returnCode === 0) {
            return ['valid' => true];
        } elseif ($returnCode === 1) {
            return [
                'valid' => false,
                'error' => 'Virus detected in uploaded file'
            ];
        } else {
            // ClamAV not available or error occurred
            return ['valid' => true];
        }
    }
    
    /**
     * Generate safe filename
     */
    public static function generateSafeFilename($originalName) {
        $pathInfo = pathinfo($originalName);
        $basename = $pathInfo['filename'];
        $extension = $pathInfo['extension'] ?? '';
        
        // Remove dangerous characters
        $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $basename);
        
        // Ensure filename is not too long
        if (strlen($safeName) > 100) {
            $safeName = substr($safeName, 0, 100);
        }
        
        // Add timestamp and random string for uniqueness
        $timestamp = time();
        $random = substr(uniqid(), -6);
        
        return $safeName . '_' . $timestamp . '_' . $random . 
               ($extension ? '.' . $extension : '');
    }
    
    /**
     * Format bytes to human readable format
     */
    private static function formatBytes($bytes, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
    
    /**
     * Create secure upload directory
     */
    public static function createSecureUploadDirectory($basePath, $projectId) {
        $projectDir = $basePath . '/' . $projectId;
        
        // Create directories if they don't exist
        $directories = [
            $projectDir,
            $projectDir . '/media',
            $projectDir . '/helper'
        ];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    return [
                        'success' => false,
                        'error' => "Failed to create directory: {$dir}"
                    ];
                }
            }
        }
        
        // Create .htaccess file to prevent direct access
        $htaccessContent = "Order deny,allow\nDeny from all\n";
        file_put_contents($projectDir . '/.htaccess', $htaccessContent);
        
        // Create index.php file to prevent directory listing
        $indexContent = "<?php\n// Access denied\nhttp_response_code(403);\ndie('Access denied');\n?>";
        file_put_contents($projectDir . '/index.php', $indexContent);
        
        return ['success' => true];
    }
}
?>