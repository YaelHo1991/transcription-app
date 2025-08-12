<?php
// Utility to ensure updates are properly reflected
header('Content-Type: text/html; charset=utf-8');

// Clear PHP opcache if available
if (function_exists('opcache_reset')) {
    opcache_reset();
    $opcache_status = "OpCache cleared successfully";
} else {
    $opcache_status = "OpCache not available";
}

// Clear file stat cache
clearstatcache(true);

// Set headers to prevent caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
?>
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>וידוא עדכונים</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            direction: rtl;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-size: 16px;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .commands {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .command {
            background: #e9ecef;
            padding: 10px;
            margin: 10px 0;
            font-family: monospace;
            border-radius: 3px;
            direction: ltr;
            text-align: left;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .btn:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 וידוא עדכונים במערכת</h1>
        
        <div class="status success">
            ✅ <?php echo $opcache_status; ?>
        </div>
        
        <div class="status success">
            ✅ מטמון קבצים נוקה בהצלחה
        </div>
        
        <div class="status info">
            ℹ️ הגדרות מטמון HTTP עודכנו - הדפדפן לא ישמור גרסאות ישנות
        </div>
        
        <div class="commands">
            <h2>פקודות מומלצות להבטחת עדכון מלא:</h2>
            
            <p><strong>1. רענון קונטיינרים (אם נעשו שינויים בקוד):</strong></p>
            <div class="command">docker-compose restart</div>
            
            <p><strong>2. בנייה מחדש של קונטיינרים (אם נעשו שינויים בהגדרות):</strong></p>
            <div class="command">docker-compose down && docker-compose up -d --build</div>
            
            <p><strong>3. ניקוי מטמון דפדפן:</strong></p>
            <div class="status warning">
                ⚠️ לחץ Ctrl+F5 (או Cmd+Shift+R במק) בכל דף כדי לרענן לגמרי
            </div>
            
            <p><strong>4. בדיקת לוגים לשגיאות:</strong></p>
            <div class="command">docker-compose logs -f client</div>
            <div class="command">docker-compose logs -f server</div>
        </div>
        
        <div class="status info">
            <strong>טיפים נוספים:</strong>
            <ul>
                <li>השתמש במצב גלישה פרטית/אנונימית לבדיקה נקייה</li>
                <li>בדוק בדפדפן אחר כדי לוודא שהשינויים נטענים</li>
                <li>וודא שאין שגיאות בקונסול של הדפדפן (F12)</li>
                <li>בדוק שהקונטיינרים רצים: <code>docker ps</code></li>
            </ul>
        </div>
        
        <a href="../development.php?devnav=1&force_refresh=1" class="btn">חזרה ללוח הבקרה</a>
    </div>
</body>
</html>