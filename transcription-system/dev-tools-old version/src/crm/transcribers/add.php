<?php
header('Content-Type: text/html; charset=utf-8');
$pageTitle = "הוסף מתמלל חדש - מערכת CRM";

// Direct database connection - use main database
$host = 'database';
$db = 'transcription_system';
$user = 'appuser';
$pass = 'apppassword';

session_name('CRM_SESSION');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // **UTF-8 encoding settings**
    $pdo->exec("SET NAMES utf8mb4");
    $pdo->exec("SET CHARACTER SET utf8mb4");
    $pdo->exec("SET character_set_connection=utf8mb4");
    $pdo->exec("SET character_set_client=utf8mb4");
    $pdo->exec("SET character_set_results=utf8mb4");
    
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Get user permissions
$userPermissions = $_SESSION['permissions'];
$isAdmin = $_SESSION['is_admin'] ?? false;
$hasC = strpos($userPermissions, 'C') !== false;

if (!$hasC && !$isAdmin) {
    header("Location: ../index.php");
    exit;
}

// Debug all POST requests
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - POST request received. Keys: " . implode(', ', array_keys($_POST)) . "\n", FILE_APPEND);
    
    // Check if add_transcriber button was clicked
    if (isset($_POST['add_transcriber'])) {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - add_transcriber button found!\n", FILE_APPEND);
    } else {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - add_transcriber button NOT found\n", FILE_APPEND);
    }
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_transcriber'])) {
    file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Form submission handler reached with add_transcriber button\n", FILE_APPEND);
    
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    $specializations = $_POST['specializations'] ?? [];
    $pricing_per_page = floatval($_POST['pricing_per_page']);
    $has_app = isset($_POST['has_app']) ? 1 : 0;
    $notes = trim($_POST['notes']);
    
    // Validation
    $errors = [];
    file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Validating: name='$name', email='$email'\n", FILE_APPEND);
    
    if (empty($name)) {
        $errors[] = "שם המתמלל הוא שדה חובה";
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Name is empty\n", FILE_APPEND);
    }
    if (empty($email)) {
        $errors[] = "כתובת אימייל היא שדה חובה";
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Email is empty\n", FILE_APPEND);
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "כתובת אימייל לא תקינה";
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Email is invalid\n", FILE_APPEND);
    }
    
    file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Validation result: " . (empty($errors) ? "PASSED" : "FAILED - " . implode(', ', $errors)) . "\n", FILE_APPEND);
    
    // Check if email already exists
    if (empty($errors)) {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Checking if email exists: $email\n", FILE_APPEND);
        $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $errors[] = "כתובת אימייל זו כבר קיימת במערכת";
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Email already exists\n", FILE_APPEND);
        } else {
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Email check passed\n", FILE_APPEND);
        }
    }
    
    // Use provided transcriber code or generate unique one
    $transcriber_code = trim($_POST['transcriber_code']) ?: null;
    file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Transcriber code: " . ($transcriber_code ?: 'NULL') . "\n", FILE_APPEND);
    
    if ($transcriber_code) {
        // Check if provided code already exists in transcribers table
        $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE transcriber_code = ?");
        $stmt->execute([$transcriber_code]);
        if ($stmt->fetch()) {
            $errors[] = "קוד המתמלל כבר קיים במערכת המתמללים";
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Transcriber code already exists\n", FILE_APPEND);
        } else {
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Transcriber code check passed\n", FILE_APPEND);
        }
    }
    
    if (empty($errors)) {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - No errors, proceeding to database insertion\n", FILE_APPEND);
        try {
            if (!$transcriber_code) {
                file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Generating unique transcriber code\n", FILE_APPEND);
                // Generate unique transcriber code
                do {
                    $transcriber_code = 'TR' . str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
                    $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE transcriber_code = ?");
                    $stmt->execute([$transcriber_code]);
                } while ($stmt->fetch());
                file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Generated code: $transcriber_code\n", FILE_APPEND);
            }
            
            // Convert specializations to JSON
            $specializations_json = !empty($specializations) ? json_encode($specializations) : null;
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Specializations JSON: " . ($specializations_json ?: 'NULL') . "\n", FILE_APPEND);
            
            // Insert transcriber
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Preparing database insert\n", FILE_APPEND);
            $stmt = $pdo->prepare("
                INSERT INTO transcribers (user_id, transcriber_code, name, email, phone, specializations, pricing_per_page, has_app, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $insertData = [
                $_SESSION['user_id'], // Add the current user ID
                $transcriber_code,
                $name,
                $email,
                $phone ?: null,
                $specializations_json,
                $pricing_per_page,
                $has_app,
                $notes ?: null
            ];
            
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Insert data: " . print_r($insertData, true) . "\n", FILE_APPEND);
            
            $result = $stmt->execute($insertData);
            
            if ($result) {
                $success_message = "המתמלל נוסף בהצלחה! קוד מתמלל: " . $transcriber_code;
                file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - SUCCESS: Transcriber added with code: $transcriber_code\n", FILE_APPEND);
                
                // Reset form
                $_POST = [];
                
                // Redirect to avoid form resubmission
                file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Redirecting to index.php\n", FILE_APPEND);
                header("Location: index.php?success=1&code=" . urlencode($transcriber_code));
                exit;
            } else {
                $errors[] = "שגיאה בהוספת המתמלל לבסיס הנתונים";
                file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - ERROR: Insert failed but no exception thrown\n", FILE_APPEND);
            }
            
        } catch (Exception $e) {
            $errors[] = "שגיאה בהוספת המתמלל: " . $e->getMessage();
            error_log("Transcriber add error: " . $e->getMessage());
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
        }
    } else {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Errors found, not proceeding: " . implode(', ', $errors) . "\n", FILE_APPEND);
    }
}

// Auto-attach current CRM user if they have app permissions
function autoAttachCrmUser($pdo, $userId) {
    try {
        // Check if user already exists in transcribers table
        $stmt = $pdo->prepare("SELECT id FROM transcribers WHERE user_id = ?");
        $stmt->execute([$userId]);
        if ($stmt->fetch()) {
            return; // User already exists
        }
        
        // Get user details
        $stmt = $pdo->prepare("SELECT username, email, full_name, permissions, transcriber_code FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) return;
        
        $permissions = $user['permissions'] ?: '';
        
        // Check if user has app permissions (D=Transcriber, E=Proofreader, F=Exporter)
        $hasAppAccess = strpos($permissions, 'D') !== false || 
                       strpos($permissions, 'E') !== false || 
                       strpos($permissions, 'F') !== false;
        
        if ($hasAppAccess && $user['transcriber_code']) {
            // Auto-attach this CRM user as a transcriber
            $stmt = $pdo->prepare("
                INSERT INTO transcribers (user_id, transcriber_code, name, email, has_app, notes)
                VALUES (?, ?, ?, ?, 1, ?)
            ");
            
            $name = $user['full_name'] ?: $user['username'];
            $notes = 'מתמלל CRM שצורף אוטומטית';
            
            $stmt->execute([
                $userId,
                $user['transcriber_code'],
                $name,
                $user['email'],
                $notes
            ]);
            
            file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Auto-attached CRM user: {$user['username']}\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        file_put_contents('/tmp/debug.log', date('Y-m-d H:i:s') . " - Auto-attach error: " . $e->getMessage() . "\n", FILE_APPEND);
    }
}

// Auto-attach current user if they have app permissions
autoAttachCrmUser($pdo, $_SESSION['user_id']);

include '../components/header.php';
?>

<style>
.specialization-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.specialization-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 5px;
    border: 1px solid #dee2e6;
}

.specialization-item input[type="checkbox"] {
    margin: 0;
}

.specialization-item label {
    margin: 0;
    font-weight: normal;
    cursor: pointer;
}

.form-note {
    font-size: 12px;
    color: #6c757d;
    margin-top: 5px;
}

.transcriber-code-display {
    background: #e8f5e8;
    border: 2px solid #28a745;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    margin: 20px 0;
}

.transcriber-code-display h3 {
    color: #155724;
    margin-bottom: 10px;
}

.transcriber-code {
    font-family: 'Courier New', monospace;
    font-size: 24px;
    font-weight: bold;
    color: #28a745;
    background: white;
    padding: 10px 20px;
    border-radius: 5px;
    display: inline-block;
    border: 1px solid #28a745;
}

.pricing-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pricing-group input {
    flex: 1;
}

.currency-symbol {
    font-weight: bold;
    color: #6c757d;
}

.code-lookup-section {
    background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
    border: 2px solid #a7beae;
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 30px;
}

.code-lookup-title {
    color: #6b7f73;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.code-lookup-form {
    display: flex;
    gap: 15px;
    align-items: end;
    flex-wrap: wrap;
}

.code-lookup-form input {
    flex: 1;
    min-width: 200px;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 16px;
    font-weight: 500;
    border: 2px solid #a7beae;
    letter-spacing: 0.5px;
}

.code-lookup-form input:focus {
    border-color: #6b7f73;
    box-shadow: 0 0 0 3px rgba(167, 190, 174, 0.2);
}

.lookup-result {
    margin-top: 15px;
    padding: 15px;
    border-radius: 10px;
    display: none;
}

.lookup-result.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}

.lookup-result.error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
}

.btn-lookup {
    background: linear-gradient(135deg, #a7beae, #95a69b);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.btn-lookup:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(167, 190, 174, 0.3);
}
</style>

<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>הוסף מתמלל חדש</h2>
    <a href="index.php" class="btn btn-outline">🔙 חזרה לרשימה</a>
</div>

<!-- Success Message -->
<?php if (isset($success_message)): ?>
    <div class="alert alert-success">
        ✅ <?php echo $success_message; ?>
        
        <div class="transcriber-code-display">
            <h3>קוד המתמלל החדש:</h3>
            <div class="transcriber-code"><?php echo htmlspecialchars($transcriber_code); ?></div>
            <p style="margin-top: 15px; color: #155724;">
                שמור קוד זה! המתמלל יזדקק לו כדי להתחבר למערכת
            </p>
        </div>
        
        <div class="d-flex gap-2 justify-content-center">
            <a href="index.php" class="btn btn-primary">צפה ברשימת המתמללים</a>
            <button onclick="location.reload()" class="btn btn-secondary">הוסף מתמלל נוסף</button>
        </div>
    </div>
<?php endif; ?>

<!-- Error Messages -->
<?php if (!empty($errors)): ?>
    <div class="alert alert-danger">
        ❌ <strong>שגיאות:</strong>
        <ul style="margin: 10px 0 0 20px;">
            <?php foreach ($errors as $error): ?>
                <li><?php echo $error; ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<!-- Transcriber Code Lookup Section -->
<div class="code-lookup-section">
    <div class="code-lookup-title">
        📱 חיפוש משתמש קיים באפליקציה
    </div>
    <p style="color: #6b7f73; margin-bottom: 20px; font-size: 14px;">
        אם המתמלל כבר רשום באפליקציה, הזן את קוד המתמלל שלו כדי לטעון את פרטיו אוטומטית
    </p>
    
    <div class="code-lookup-form">
        <div style="flex: 1;">
            <label style="font-size: 14px; color: #6b7f73; margin-bottom: 8px; display: block;">קוד מתמלל:</label>
            <input type="text" id="lookup_code" placeholder="הזן קוד מתמלל (למשל: TR12345)" maxlength="20">
        </div>
        <button type="button" class="btn-lookup" onclick="lookupTranscriberCode()">
            🔍 חפש משתמש
        </button>
    </div>
    
    <div id="lookup_result" class="lookup-result"></div>
</div>

<!-- Add Transcriber Form -->
<div class="form-container">
    <form method="POST" data-validate>
        <input type="hidden" name="transcriber_code" id="hidden_transcriber_code" value="">
        
        <!-- Basic Information -->
        <div class="card-header">
            <h3 class="card-title">פרטים אישיים</h3>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>שם מלא: <span style="color: red;">*</span></label>
                <input type="text" name="name" id="transcriber_name" required 
                       value="<?php echo isset($_POST['name']) ? htmlspecialchars($_POST['name']) : ''; ?>"
                       placeholder="הכנס שם מלא של המתמלל">
            </div>
            
            <div class="form-group">
                <label>כתובת אימייל: <span style="color: red;">*</span></label>
                <input type="email" name="email" id="transcriber_email" required
                       value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>"
                       placeholder="example@email.com">
                <div class="form-note">כתובת זו תשמש להתחברות למערכת</div>
            </div>
        </div>

        <div class="form-group">
            <label>מספר טלפון:</label>
            <input type="tel" name="phone"
                   value="<?php echo isset($_POST['phone']) ? htmlspecialchars($_POST['phone']) : ''; ?>"
                   placeholder="050-1234567">
        </div>

        <!-- Professional Information -->
        <div class="card-header" style="margin-top: 30px;">
            <h3 class="card-title">פרטים מקצועיים</h3>
        </div>
        
        <div class="form-group">
            <label>התמחויות:</label>
            <div class="specialization-grid">
                <?php
                $specializations_options = [
                    'medical' => 'רפואי',
                    'legal' => 'משפטי',
                    'academic' => 'אקדמי',
                    'business' => 'עסקי',
                    'technical' => 'טכני',
                    'media' => 'תקשורת',
                    'interviews' => 'ראיונות',
                    'conferences' => 'כנסים',
                    'lectures' => 'הרצאות',
                    'general' => 'כללי'
                ];
                
                foreach ($specializations_options as $value => $label):
                    $checked = isset($_POST['specializations']) && in_array($value, $_POST['specializations']) ? 'checked' : '';
                ?>
                    <div class="specialization-item">
                        <input type="checkbox" name="specializations[]" value="<?php echo $value; ?>" 
                               id="spec_<?php echo $value; ?>" <?php echo $checked; ?>>
                        <label for="spec_<?php echo $value; ?>"><?php echo $label; ?></label>
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="form-note">בחר את התחומים שבהם המתמלל מתמחה</div>
        </div>

        <div class="form-group">
            <label>תעריף לעמוד:</label>
            <div class="pricing-group">
                <span class="currency-symbol">₪</span>
                <input type="number" name="pricing_per_page" step="0.01" min="0"
                       value="<?php echo isset($_POST['pricing_per_page']) ? $_POST['pricing_per_page'] : '5.00'; ?>"
                       placeholder="5.00">
                <span>לעמוד</span>
            </div>
            <div class="form-note">תעריף ברירת המחדל עבור עבודות תמלול</div>
        </div>

        <!-- Technical Settings -->
        <div class="card-header" style="margin-top: 30px;">
            <h3 class="card-title">הגדרות טכניות</h3>
        </div>

        <div class="form-group">
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" name="has_app" id="has_app" 
                       <?php echo isset($_POST['has_app']) ? 'checked' : ''; ?>>
                <label for="has_app" style="margin: 0;">המתמלל יש לו גישה לאפליקציה</label>
            </div>
            <div class="form-note">סמן אם המתמלל משתמש באפליקציית התמלול הנייד</div>
        </div>

        <!-- Notes -->
        <div class="form-group">
            <label>הערות נוספות:</label>
            <textarea name="notes" rows="4" 
                      placeholder="הערות על המתמלל, כישורים מיוחדים, הערות ליצירת קשר וכו'"><?php echo isset($_POST['notes']) ? htmlspecialchars($_POST['notes']) : ''; ?></textarea>
        </div>

        <!-- Actions -->
        <div class="d-flex gap-2 justify-content-between" style="margin-top: 30px;">
            <div>
                <button type="submit" name="add_transcriber" class="btn btn-primary">
                    ✅ הוסף מתמלל
                </button>
                <button type="button" onclick="resetForm()" class="btn btn-secondary">
                    🔄 נקה טופס
                </button>
            </div>
            <a href="index.php" class="btn btn-outline">❌ ביטול</a>
        </div>
    </form>
</div>

<!-- External JavaScript Files -->
<script src="js/transcriber-lookup.js"></script>
<script src="js/transcriber-form.js"></script>

<?php include '../components/footer.php'; ?>