<!-- Shortcuts Modal -->
<div class="modal-content shortcuts-modal-content" style="max-width: 800px; width: 90%; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
    <div class="modal-header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; padding: 24px; border: none;">
        <h3 style="margin: 0; font-size: 24px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">קיצורי טקסט</h3>
        <button class="modal-close" id="shortcutsModalCloseBtn" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">×</button>
    </div>
    <div class="modal-body" style="padding: 0; overflow-y: auto; max-height: calc(80vh - 100px);">
        <div id="shortcutsNotification" style="display: none; margin: 0; padding: 12px 20px; text-align: center; font-size: 14px; font-weight: 500;"></div>
        <div class="shortcuts-tabs">
            <button class="shortcuts-tab active" onclick="showShortcutsTab('new')" id="newShortcutTab">
                <span>➕</span>
                הוסף קיצור חדש
            </button>
            <button class="shortcuts-tab" onclick="showShortcutsTab('existing')" id="existingShortcutTab">
                <span>📝</span>
                קיצורים קיימים
            </button>
        </div>
        
        <div class="shortcuts-content" style="min-height: 400px;">
            <!-- New Shortcut Tab -->
            <div id="newShortcutTabContent" class="shortcuts-tab-content active" style="padding: 24px;">
                <div id="duplicateWarning" class="duplicate-warning" style="display: none;">
                    <span class="duplicate-warning-icon">⚠️</span>
                    <div class="duplicate-warning-text">
                        הקיצור "<span id="duplicateKey"></span>" כבר קיים. האם להחליף אותו?
                    </div>
                    <div class="duplicate-warning-actions">
                        <button class="btn-replace" onclick="confirmReplaceShortcut()">החלף</button>
                        <button class="btn-cancel" onclick="cancelDuplicateShortcut()">ביטול</button>
                    </div>
                </div>
                
                <div class="add-shortcut-section" style="padding: 0; border: none;">
                    <h4 style="margin-bottom: 24px;">צור קיצור חדש</h4>
                    <div class="add-shortcut-form">
                        <input type="text" id="newShortcutKey" placeholder="קיצור (למשל: ע'ד)" style="flex: 1;" dir="ltr" />
                        <input type="text" id="newShortcutValue" placeholder="טקסט מלא (למשל: עורך דין)" style="flex: 2;" />
                        <button class="add-shortcut-btn" onclick="addNewShortcut()">הוסף</button>
                    </div>
                    
                    <div id="variationsSection" class="variations-section" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5 style="margin: 0;">וריאציות שייווצרו אוטומטית:</h5>
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer;">
                                <input type="checkbox" id="selectAllVariations" checked onchange="toggleAllVariations()" />
                                <span>בחר הכל</span>
                            </label>
                        </div>
                        <div class="variations-grid" id="variationsGrid">
                            <!-- Variations will be populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Existing Shortcuts Tab -->
            <div id="existingShortcutTabContent" class="shortcuts-tab-content" style="display: none; padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin: 0;">רשימת קיצורים שמורים</h4>
                    <div class="search-box" style="position: relative;">
                        <input type="text" 
                               id="searchShortcuts" 
                               placeholder="חפש קיצור..." 
                               style="padding: 8px 36px 8px 12px; 
                                      border: 2px solid #e2e8f0; 
                                      border-radius: 8px; 
                                      font-size: 14px; 
                                      width: 200px;
                                      transition: all 0.3s ease;">
                        <span style="position: absolute; 
                                     right: 12px; 
                                     top: 50%; 
                                     transform: translateY(-50%); 
                                     color: #94a3b8; 
                                     font-size: 16px;">🔍</span>
                    </div>
                </div>
                <div class="shortcuts-list-controls" style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 0 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="selectAllShortcuts" onchange="toggleSelectAll()" />
                        <span>בחר הכל</span>
                    </label>
                    <button id="deleteSelectedBtn" class="delete-selected-btn" onclick="deleteSelectedShortcuts()" 
                            style="display: none; background: #ef4444; color: white; border: none; padding: 6px 16px; 
                                   border-radius: 6px; cursor: pointer; font-size: 14px;">
                        מחק נבחרים (<span id="selectedCount">0</span>)
                    </button>
                </div>
                <div class="shortcuts-list" id="existingShortcutsList">
                    <!-- Shortcuts will be populated dynamically by JavaScript -->
                </div>
            </div>
        </div>
    </div>
</div>