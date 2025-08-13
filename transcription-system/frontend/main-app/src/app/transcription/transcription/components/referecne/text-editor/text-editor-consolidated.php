<?php
/*
 * =========================================
 * Consolidated Text Editor Component
 * components/text-editor/text-editor-consolidated.php
 * =========================================
 * Unified text editor with all features
 * Version: 1.0
 */
?>

<!-- Text Editor CSS -->
<link rel="stylesheet" href="components/text-editor/css/text-editor-base.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/css/text-editor-toolbar.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/css/text-editor-rtl.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/css/text-editor-blocks.css?v=<?php echo time(); ?>">

<style>
/* Transcription Container - from transcription2 */
.transcription-container {
    background: linear-gradient(135deg, rgba(40, 167, 69, 0.03) 0%, rgba(32, 201, 151, 0.05) 50%, rgba(23, 162, 184, 0.03) 100%);
    border-radius: 8px;
    padding: 0; /* No padding - text editor fills the space */
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border: 1px solid rgba(32, 201, 151, 0.1);
    flex: 1 1 auto; /* Grow to fill space */
    display: flex;
    flex-direction: column;
    min-height: 400px; /* Ensure minimum height */
    width: 100%;
    overflow: hidden;
    margin: 0 !important;
    box-sizing: border-box;
}

</style>

<!-- Toolbar CSS -->
<link rel="stylesheet" href="components/text-editor/toolbar/formatting/formatting-toolbar.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/toolbar/transcription-tools/transcription-toolbar.css?v=<?php echo time(); ?>">

<!-- Feature-specific CSS -->
<link rel="stylesheet" href="components/text-editor/shortcuts/shortcuts.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/auto-corrections/auto-corrections.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="components/text-editor/spell-check/spell-check.css?v=<?php echo time(); ?>">

<!-- Text Editor Container -->
<div class="text-editor-wrapper">
    <!-- Toolbar Section -->
    <div class="text-editor-toolbar">
        <!-- Formatting Tools Section -->
        <div class="toolbar-section formatting-tools">
            <div class="toolbar-group">
                <!-- Font Family -->
                <?php include 'toolbar/formatting/font-family/font-family.php'; ?>
                
                <!-- Font Size -->
                <?php include 'toolbar/formatting/font-size/font-size.php'; ?>
                
                <!-- Text Style (Bold, Italic, Underline) -->
                <?php include 'toolbar/formatting/text-style/text-style.php'; ?>
                
                <!-- Text Alignment -->
                <?php include 'toolbar/formatting/text-align/text-align.php'; ?>
                
                <!-- Undo/Redo -->
                <?php include 'toolbar/formatting/undo-redo/undo-redo.php'; ?>
            </div>
        </div>
        
        <!-- Divider -->
        <div class="toolbar-divider"></div>
        
        <!-- Transcription Tools Section -->
        <div class="toolbar-section transcription-tools">
            <div class="toolbar-group">
                <!-- Navigation Mode -->
                <?php include 'toolbar/transcription-tools/navigation-mode/navigation-button.php'; ?>
                
                <!-- Auto-Fix Errors -->
                <?php include 'toolbar/transcription-tools/auto-fix/auto-fix.php'; ?>
                
                <!-- Text Shortcuts -->
                <?php include 'toolbar/transcription-tools/shortcuts/shortcuts-button.php'; ?>
            </div>
        </div>
    </div>
    
    <!-- Main Editor Area -->
    <div class="text-editor-container">
        <!-- Text Editor Content for Blocks -->
        <div class="text-editor-content" id="textEditor" dir="rtl">
            <!-- Blocks will be dynamically generated here -->
        </div>
        
        <!-- Sidebar for timestamps and remarks -->
        <div class="text-editor-sidebar">
            <div class="timestamp-column" id="timestampColumn">
                <!-- Timestamps will appear here -->
            </div>
        </div>
    </div>
    
    <!-- Status Bar -->
    <div class="text-editor-status">
        <div class="status-info">
            <span class="word-count">מילים: <span id="wordCount">0</span></span>
            <span class="char-count">תווים: <span id="charCount">0</span></span>
            <span class="line-count">שורות: <span id="lineCount">1</span></span>
        </div>
        <div class="status-actions">
            <span class="auto-save-status" id="autoSaveStatus">שמירה אוטומטית: פעילה</span>
        </div>
    </div>
</div>

<!-- Hidden elements for features -->
<div id="textEditorShortcutsModal" class="modal shortcuts-modal hidden">
    <?php include 'shortcuts/shortcuts-modal.php'; ?>
</div>

<!-- Text Editor JavaScript -->
<script src="components/text-editor/js/text-editor-core.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/js/text-editor-blocks.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/js/text-editor-toolbar.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/js/text-editor-rtl.js?v=<?php echo time(); ?>"></script>
<!-- Removed text-editor-speaker-integration.js - TAB transformation now only in speaker blocks -->

<!-- Toolbar JavaScript -->
<script src="components/text-editor/toolbar/formatting/font-family/font-family.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/formatting/font-size/font-size.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/formatting/text-style/text-style.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/formatting/text-align/text-align.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/formatting/undo-redo/undo-redo.js?v=<?php echo time(); ?>"></script>

<!-- Transcription Tools JavaScript -->
<script src="components/text-editor/toolbar/transcription-tools/navigation-mode/navigation-mode.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/transcription-tools/auto-fix/auto-fix.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/toolbar/transcription-tools/shortcuts/shortcuts.js?v=<?php echo time(); ?>"></script>

<!-- Feature JavaScript -->
<script src="components/text-editor/shortcuts/shortcuts-manager.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/auto-corrections/auto-corrections.js?v=<?php echo time(); ?>"></script>
<script src="components/text-editor/spell-check/spell-check.js?v=<?php echo time(); ?>"></script>

<!-- Debug Script -->
<script src="components/text-editor/js/shortcuts-debug.js?v=<?php echo time(); ?>"></script>

<!-- Auto-Detect scripts removed - functionality now in media player -->

<!-- Initialize Text Editor -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('[TextEditor] Initializing consolidated text editor...');
    console.log('[TextEditor] Available classes:', {
        TextEditor: typeof window.TextEditor,
        TextEditorBlocks: typeof window.TextEditorBlocks
    });
    
    // Wait a moment for all scripts to load
    setTimeout(() => {
        // Initialize text editor core
        if (window.TextEditor) {
            window.textEditor = new TextEditor();
            console.log('[TextEditor] Text editor initialized successfully');
            
            // Check if blocks were created
            setTimeout(() => {
                const editor = document.getElementById('textEditor');
                if (editor) {
                    console.log('[TextEditor] Editor found with children:', editor.children.length);
                    console.log('[TextEditor] Editor HTML:', editor.innerHTML.substring(0, 300));
                    
                    // Check if blockEditor exists
                    if (window.textEditor && window.textEditor.blockEditor) {
                        console.log('[TextEditor] Block editor exists with blocks:', window.textEditor.blockEditor.blocks.length);
                    } else {
                        console.error('[TextEditor] Block editor not found!');
                    }
                } else {
                    console.error('[TextEditor] Editor element not found!');
                }
            }, 500);
        } else {
            console.error('[TextEditor] TextEditor class not found!');
        }
    }, 100);
    
    // Test shortcuts system after a delay - DISABLED
    // setTimeout(() => {
    //     console.log('[TextEditor] Testing shortcuts system...');
    //     if (window.TextEditorShortcuts) {
    //         console.log('[TextEditor] Shortcuts available:', window.TextEditorShortcuts.getAll());
    //     } else {
    //         console.error('[TextEditor] Shortcuts system not loaded!');
    //     }
    // }, 2000);
});

</script>