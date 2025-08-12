// Transcriber code lookup functionality
function lookupTranscriberCode() {
    const codeInput = document.getElementById('lookup_code');
    const resultDiv = document.getElementById('lookup_result');
    const code = codeInput.value.trim();
    
    if (!code) {
        showLookupResult('error', 'יש להזין קוד מתמלל');
        return;
    }
    
    // Show loading
    const lookupBtn = document.querySelector('.btn-lookup');
    const originalText = lookupBtn.innerHTML;
    lookupBtn.innerHTML = '⏳ מחפש...';
    lookupBtn.disabled = true;
    
    // Make AJAX request to separate lookup endpoint
    const formData = new FormData();
    formData.append('transcriber_code', code);
    
    fetch('lookup_user.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Auto-populate form fields
            document.getElementById('transcriber_name').value = data.data.name;
            document.getElementById('transcriber_email').value = data.data.email;
            document.getElementById('hidden_transcriber_code').value = code;
            
            // Check has_app checkbox since we found an existing user
            const hasAppCheckbox = document.getElementById('has_app');
            if (hasAppCheckbox) {
                hasAppCheckbox.checked = true;
            }
            
            // Show success message with user type
            showLookupResult('success', `✅ נמצא משתמש: ${data.data.name} (${data.data.email})<br>סוג משתמש: ${data.data.type_label}<br>הקוד ${code} יוצמד למתמלל והאפליקציה תופעל אוטומטית.`);
            
            // Scroll to form
            document.querySelector('.form-container').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            showLookupResult('error', data.message);
        }
    })
    .catch(error => {
        console.error('Lookup error:', error);
        showLookupResult('error', 'שגיאה בתקשורת עם השרת');
    })
    .finally(() => {
        lookupBtn.innerHTML = originalText;
        lookupBtn.disabled = false;
    });
}

function showLookupResult(type, message) {
    const resultDiv = document.getElementById('lookup_result');
    resultDiv.className = `lookup-result ${type}`;
    resultDiv.innerHTML = message;
    resultDiv.style.display = 'block';
}

// Initialize lookup functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add Enter key support for lookup
    const lookupInput = document.getElementById('lookup_code');
    if (lookupInput) {
        lookupInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                lookupTranscriberCode();
            }
        });
    }
});