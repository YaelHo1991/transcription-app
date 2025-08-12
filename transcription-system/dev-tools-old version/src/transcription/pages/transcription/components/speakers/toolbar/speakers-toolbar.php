<?php
/**
 * Speakers Toolbar
 * toolbar/speakers-toolbar.php
 * 
 * Toolbar for speaker management actions
 */
?>

<div class="speakers-toolbar">
    <div class="toolbar-group">
        <button class="toolbar-btn" title="הוסף דובר" onclick="window.speakersBlocks.addEmptyBlock()">
            <i class="fas fa-plus"></i>
        </button>
        <button class="toolbar-btn" title="ייבוא דוברים" disabled>
            <i class="fas fa-file-import"></i>
        </button>
        <button class="toolbar-btn" title="ייצוא דוברים" disabled>
            <i class="fas fa-file-export"></i>
        </button>
    </div>
    <div class="toolbar-group">
        <button class="toolbar-btn" title="מיון לפי קוד" disabled>
            <i class="fas fa-sort-alpha-down"></i>
        </button>
        <button class="toolbar-btn" title="חיפוש דובר" disabled>
            <i class="fas fa-search"></i>
        </button>
    </div>
    <div class="toolbar-group">
        <button class="toolbar-btn" title="הגדרות" disabled>
            <i class="fas fa-cog"></i>
        </button>
    </div>
</div>