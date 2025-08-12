<?php
/*
 * =========================================
 * Text Editor Component
 * components/text-editor/editor.php
 * =========================================
 * Main transcription text editor
 */
?>

<!-- Test button removed -->

<textarea 
    id="transcriptionText" 
    class="transcription-text" 
    placeholder="התחל לכתוב את התמלול כאן...

דוגמה לתמלול בעברית:

דובר 1: שלום וברוכים הבאים לישיבה של היום.
דובר 2: תודה רבה, אני שמח להיות כאן.
דובר 1: בואו נתחיל בסקירת הנושאים שעל הפרק...

הוראות לתמלול:
- השתמש בפורמט 'דובר X:' לכל דובר
- ציין זמנים חשובים בפורמט [XX:XX]
- הוסף הערות בסוגריים (הערה)
- השתמש ב... להפסקות
- ציין צחוק או רעשים [צחוק], [רעש רקע]"
    dir="rtl"></textarea>

<script>
// Immediately enable the textarea when it loads
(function() {
    const textarea = document.getElementById('transcriptionText');
    if (textarea) {
        textarea.disabled = false;
        textarea.readOnly = false;
        console.log('Textarea enabled on load');
    }
})();
</script>