// Transcriber form submission functionality
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[data-validate]');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            console.log('Form submission started');
            alert('Form is being submitted!'); // Debug alert
            
            // Basic validation
            const name = document.querySelector('input[name="name"]').value.trim();
            const email = document.querySelector('input[name="email"]').value.trim();
            
            console.log('Name:', name, 'Email:', email);
            
            if (!name) {
                alert('שם המתמלל הוא שדה חובה');
                e.preventDefault();
                return;
            }
            
            if (!email) {
                alert('כתובת אימייל היא שדה חובה');
                e.preventDefault();
                return;
            }
            
            // Email validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('כתובת אימייל לא תקינה');
                e.preventDefault();
                return;
            }
            
            // Show loading state
            const submitBtn = document.querySelector('button[name="add_transcriber"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="loading"></span> מוסיף מתמלל...';
                // Don't disable button - let form submit naturally
            }
            
            console.log('Form validation passed, submitting...');
            alert('Form validation passed, submitting...'); // Debug alert
        });
    } else {
        console.log('Form with data-validate attribute not found');
    }
    
    // Auto-focus on name field
    const nameField = document.querySelector('input[name="name"]');
    if (nameField) {
        nameField.focus();
    }
    
    // Reset form function
    window.resetForm = function() {
        if (confirm('האם אתה בטוח שברצונך לנקות את הטופס? כל המידע שהוזן יאבד.')) {
            form.reset();
        }
    };
    
    // Add animation to specialization checkboxes
    document.querySelectorAll('.specialization-item').forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        setTimeout(() => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 50);
    });
});