/*
 * Shortcuts Modal Control
 * toolbar/transcription-tools/shortcuts/shortcuts.js
 */

(function() {
    console.log('[TextEditor] Shortcuts module loaded');
    
    // Use window.addEventListener to ensure we run after all scripts are loaded
    window.addEventListener('load', function() {
        console.log('[Shortcuts] Window loaded, setting up shortcuts button...');
        
        // Make sure TextEditorShortcuts is available
        if (window.TextEditorShortcuts) {
            console.log('[Shortcuts] TextEditorShortcuts is available');
            const allShortcuts = window.TextEditorShortcuts.getAll();
            console.log('[Shortcuts] Initial shortcuts:', allShortcuts);
        } else {
            console.warn('[Shortcuts] TextEditorShortcuts not available yet');
        }
        
        // Try multiple times to find the button (in case of delayed rendering)
        let attempts = 0;
        const trySetupButton = function() {
            const shortcutsBtn = document.getElementById('textShortcutsBtn');
            const modal = document.getElementById('textEditorShortcutsModal');
            
            if (shortcutsBtn) {
                console.log('[Shortcuts] Button found, attaching click handler');
                
                // Remove any existing listeners
                const newBtn = shortcutsBtn.cloneNode(true);
                shortcutsBtn.parentNode.replaceChild(newBtn, shortcutsBtn);
                
                // Add new listener
                newBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Shortcuts] Button clicked!');
                    openShortcutsModal();
                });
                
                // Also add onclick as backup
                newBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Shortcuts] Button clicked via onclick!');
                    openShortcutsModal();
                };
                
                return true;
            } else if (attempts < 20) {
                attempts++;
                console.log('[Shortcuts] Button not found, retrying...', attempts);
                setTimeout(trySetupButton, 250);
            } else {
                console.error('[Shortcuts] Button not found after 20 attempts!');
            }
        };
        
        trySetupButton();
        
        // Setup modal after a delay to ensure it exists
        setTimeout(() => {
            const modal = document.getElementById('textEditorShortcutsModal');
            console.log('[Shortcuts] Setting up modal, found:', !!modal);
            
            if (modal) {
                // Close modal when clicking outside - check for modal class not modal-overlay
                modal.addEventListener('click', function(e) {
                    // Only close if clicking directly on the modal backdrop
                    if (e.target === modal && e.target.classList.contains('modal')) {
                        console.log('[Shortcuts] Clicked outside modal content, closing...');
                        closeShortcutsModal();
                    }
                });
                
                // Setup close button
                const closeBtn = document.getElementById('shortcutsModalCloseBtn');
                if (closeBtn) {
                    console.log('[Shortcuts] Setting up close button');
                    closeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[Shortcuts] Close button clicked');
                        closeShortcutsModal();
                    });
                }
                
                // Ensure modal starts hidden
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }, 1000);
        
        // Initialize modal content  
        // Wait for TextEditorShortcuts to be available
        const waitForShortcuts = setInterval(() => {
            if (window.TextEditorShortcuts) {
                clearInterval(waitForShortcuts);
                console.log('[Shortcuts] TextEditorShortcuts now available, updating list');
                updateShortcutsList();
            }
        }, 100);
        
        // Stop waiting after 5 seconds
        setTimeout(() => clearInterval(waitForShortcuts), 5000);
        
        // Setup search functionality
        setTimeout(() => {
            const searchInput = document.getElementById('searchShortcuts');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase();
                    filterShortcuts(searchTerm);
                });
                
                // Add focus styling
                searchInput.addEventListener('focus', function() {
                    this.style.borderColor = '#667eea';
                    this.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                });
                
                searchInput.addEventListener('blur', function() {
                    this.style.borderColor = '#e2e8f0';
                    this.style.boxShadow = 'none';
                });
            }
        }, 1000);
        
        // Add enter key support for inputs
        const keyInput = document.getElementById('newShortcutKey');
        const valueInput = document.getElementById('newShortcutValue');
        
        if (keyInput) {
            keyInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addNewShortcut();
                }
            });
            
            // Add live preview of variations
            keyInput.addEventListener('input', function(e) {
                const key = e.target.value.trim();
                const value = valueInput.value.trim();
                if (key && value) {
                    showVariationsPreview(key, value);
                } else {
                    hideVariationsPreview();
                }
            });
        }
        
        if (valueInput) {
            valueInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addNewShortcut();
                }
            });
            
            // Add live preview of variations
            valueInput.addEventListener('input', function(e) {
                const key = keyInput.value.trim();
                const value = e.target.value.trim();
                if (key && value) {
                    showVariationsPreview(key, value);
                } else {
                    hideVariationsPreview();
                }
            });
        }
    });
    
    function openShortcutsModal() {
        console.log('[Shortcuts] Opening modal...');
        const modal = document.getElementById('textEditorShortcutsModal');
        console.log('[Shortcuts] Modal element:', modal);
        
        if (modal) {
            // Force show using multiple methods
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            
            console.log('[Shortcuts] Modal classes after opening:', modal.className);
            console.log('[Shortcuts] Modal display style:', modal.style.display);
            
            // Wait a moment for modal to be visible, then update shortcuts
            setTimeout(() => {
                console.log('[Shortcuts] Updating shortcuts list after modal open...');
                updateShortcutsList();
                
                // Make sure the shortcuts list is visible
                const shortcutsList = document.querySelector('.shortcuts-list');
                if (shortcutsList) {
                    console.log('[Shortcuts] Shortcuts list element found');
                    console.log('[Shortcuts] Shortcuts list HTML:', shortcutsList.innerHTML);
                    console.log('[Shortcuts] Shortcuts list children:', shortcutsList.children.length);
                }
            }, 100);
        } else {
            console.error('[Shortcuts] Modal element not found!');
        }
    }
    
    function closeShortcutsModal() {
        console.log('[Shortcuts] Closing modal...');
        const modal = document.getElementById('textEditorShortcutsModal');
        console.log('[Shortcuts] Modal found:', !!modal);
        
        if (modal) {
            // Force hide using multiple methods
            modal.classList.add('hidden');
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            
            console.log('[Shortcuts] Modal display after close:', modal.style.display);
            console.log('[Shortcuts] Modal classes after close:', modal.className);
            
            // Clear any pending shortcut data
            clearPendingShortcut();
        } else {
            console.error('[Shortcuts] Modal not found when trying to close!');
        }
    }
    
    function updateShortcutsList() {
        console.log('[Shortcuts] Updating shortcuts list...');
        const shortcutsList = document.querySelector('.shortcuts-list');
        
        if (!shortcutsList) {
            console.error('[Shortcuts] Shortcuts list element not found');
            return;
        }
        
        if (!window.TextEditorShortcuts) {
            console.error('[Shortcuts] TextEditorShortcuts not available');
            return;
        }
        
        const shortcuts = window.TextEditorShortcuts.getAll();
        console.log('[Shortcuts] Retrieved shortcuts:', shortcuts);
        console.log('[Shortcuts] Type of shortcuts:', typeof shortcuts);
        console.log('[Shortcuts] Shortcuts keys:', Object.keys(shortcuts));
        
        // If no shortcuts from manager, try localStorage directly as fallback
        let shortcutsToDisplay = shortcuts;
        if (Object.keys(shortcuts).length === 0) {
            console.log('[Shortcuts] No shortcuts from manager, trying localStorage...');
            try {
                const stored = localStorage.getItem('textEditorShortcuts');
                if (stored) {
                    shortcutsToDisplay = JSON.parse(stored);
                    console.log('[Shortcuts] Using shortcuts from localStorage:', shortcutsToDisplay);
                }
            } catch (e) {
                console.error('[Shortcuts] Error reading localStorage:', e);
            }
        }
        
        shortcutsList.innerHTML = '';
        
        // Check if there are any shortcuts - use shortcutsToDisplay instead of shortcuts
        const shortcutEntries = Object.entries(shortcutsToDisplay);
        console.log('[Shortcuts] Number of shortcuts to display:', shortcutEntries.length);
        
        if (shortcutEntries.length === 0) {
            // Show empty state message
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: #94a3b8;
                font-size: 16px;
            `;
            emptyMsg.textContent = 'אין קיצורים שמורים. הוסף קיצור חדש למטה.';
            shortcutsList.appendChild(emptyMsg);
        } else {
            // Show all shortcuts
            shortcutEntries.forEach(([key, value]) => {
                console.log('[Shortcuts] Creating item for:', key, '->', value);
                const item = createShortcutItem(key, value);
                shortcutsList.appendChild(item);
            });
        }
    }
    
    function createShortcutItem(key, value) {
        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.setAttribute('data-key', key);
        
        // Get all variations for this shortcut
        const variations = window.TextEditorShortcuts.generateVariations(key, value);
        const variationsList = Object.keys(variations).filter(k => k !== key).join(', ');
        
        // Add checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'shortcut-checkbox';
        checkbox.onchange = updateSelectedCount;
        checkbox.style.marginLeft = '10px';
        
        // Create elements manually to avoid quote escaping issues
        const mainDiv = document.createElement('div');
        mainDiv.className = 'shortcut-main';
        
        const keySpan = document.createElement('span');
        keySpan.className = 'shortcut-key';
        keySpan.textContent = key;
        
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'shortcut-arrow';
        arrowSpan.textContent = '←';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'shortcut-value';
        valueSpan.textContent = value;
        
        // Action buttons container
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display: flex; gap: 8px;';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'shortcut-edit';
        editBtn.textContent = 'ערוך';
        editBtn.onclick = function() { editShortcut(key, value); };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'shortcut-delete';
        deleteBtn.textContent = 'מחק';
        deleteBtn.onclick = function() { deleteShortcut(key); };
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        mainDiv.appendChild(keySpan);
        mainDiv.appendChild(arrowSpan);
        mainDiv.appendChild(valueSpan);
        mainDiv.appendChild(actionsDiv);
        
        // Add checkbox at the beginning
        div.appendChild(checkbox);
        div.appendChild(mainDiv);
        
        if (variationsList) {
            const variationsDiv = document.createElement('div');
            variationsDiv.className = 'shortcut-variations';
            variationsDiv.textContent = 'וריאציות: ' + variationsList;
            div.appendChild(variationsDiv);
        }
        return div;
    }
    
    let pendingShortcut = null;
    let selectedVariations = new Set();
    
    function showVariationsPreview(key, value) {
        const variationsSection = document.getElementById('variationsSection');
        if (!variationsSection) return;
        
        // Show the section
        variationsSection.style.display = 'block';
        
        // Update heading
        const heading = variationsSection.querySelector('h5');
        if (heading) {
            heading.textContent = 'וריאציות שייווצרו אוטומטית:';
        }
        
        // Generate variations and show them
        const variations = window.TextEditorShortcuts.generateVariations(key, value);
        const variationsGrid = document.getElementById('variationsGrid');
        
        if (variationsGrid) {
            variationsGrid.innerHTML = '';
            selectedVariations.clear();
            
            // Add base shortcut as always selected
            selectedVariations.add(key);
            
            Object.entries(variations).forEach(([varKey, varValue]) => {
                if (varKey === key) return; // Skip base shortcut
                
                const item = document.createElement('div');
                item.className = 'variation-item';
                
                const label = document.createElement('label');
                
                const preview = document.createElement('span');
                preview.className = 'variation-preview';
                preview.textContent = `${varKey} ← ${varValue}`;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = varKey;
                checkbox.checked = true; // Default to checked
                selectedVariations.add(varKey);
                
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedVariations.add(varKey);
                    } else {
                        selectedVariations.delete(varKey);
                    }
                });
                
                label.appendChild(preview);
                label.appendChild(checkbox);
                item.appendChild(label);
                variationsGrid.appendChild(item);
            });
        }
    }
    
    function hideVariationsPreview() {
        const variationsSection = document.getElementById('variationsSection');
        if (variationsSection) {
            variationsSection.style.display = 'none';
        }
    }
    
    function addNewShortcut() {
        const keyInput = document.getElementById('newShortcutKey');
        const valueInput = document.getElementById('newShortcutValue');
        
        if (!keyInput || !valueInput || !window.TextEditorShortcuts) return;
        
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();
        
        if (!key || !value) {
            showCustomAlert('אנא מלא את שני השדות', 'אזהרה');
            return;
        }
        
        // Check if shortcut already exists
        const existingShortcuts = window.TextEditorShortcuts.getAll();
        if (existingShortcuts[key]) {
            // Show duplicate warning
            document.getElementById('duplicateWarning').style.display = 'flex';
            document.getElementById('duplicateKey').textContent = key;
            pendingShortcut = { key, value };
            return;
        }
        
        // Use the already selected variations from preview
        pendingShortcut = { key, value };
        
        // If variations are already showing, just confirm
        if (document.getElementById('variationsSection').style.display === 'block') {
            confirmAddShortcut();
        } else {
            // Otherwise show them
            showVariationsSelection(key, value);
        }
    }
    
    function showVariationsSelection(key, value) {
        const variationsSection = document.getElementById('variationsSection');
        const variationsGrid = document.getElementById('variationsGrid');
        
        if (!variationsSection || !variationsGrid) return;
        
        // Generate all possible variations
        const variations = window.TextEditorShortcuts.generateVariations(key, value);
        
        // Clear previous selections
        variationsGrid.innerHTML = '';
        selectedVariations.clear();
        
        // Add base shortcut as always selected
        selectedVariations.add(key);
        
        // Create checkbox for each variation
        Object.entries(variations).forEach(([varKey, varValue]) => {
            if (varKey === key) return; // Skip base shortcut
            
            const item = document.createElement('div');
            item.className = 'variation-item';
            
            const label = document.createElement('label');
            
            const preview = document.createElement('span');
            preview.className = 'variation-preview';
            preview.textContent = varKey;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = varKey;
            checkbox.checked = true; // Default to checked
            selectedVariations.add(varKey);
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedVariations.add(varKey);
                } else {
                    selectedVariations.delete(varKey);
                }
            });
            
            label.appendChild(preview);
            label.appendChild(checkbox);
            item.appendChild(label);
            variationsGrid.appendChild(item);
        });
        
        variationsSection.style.display = 'block';
        
        // Update the add button to confirm
        const addBtn = document.querySelector('.add-shortcut-btn');
        if (addBtn) {
            addBtn.textContent = 'אשר והוסף';
            addBtn.onclick = confirmAddShortcut;
        }
    }
    
    function confirmAddShortcut() {
        if (!pendingShortcut || !window.TextEditorShortcuts) return;
        
        const { key, value, isEdit } = pendingShortcut;
        
        // If editing, remove old variations first
        if (isEdit) {
            window.TextEditorShortcuts.remove(key);
        }
        
        // Add base shortcut
        window.TextEditorShortcuts.add(key, value);
        
        // Add selected variations
        let addedCount = 0;
        selectedVariations.forEach(varKey => {
            if (varKey !== key) {
                // Calculate the prefix and add variation
                const prefix = varKey.substring(0, varKey.length - key.length);
                const varValue = prefix + value;
                window.TextEditorShortcuts.add(varKey, varValue);
                addedCount++;
            }
        });
        
        console.log(`[Shortcuts] Added ${key} with ${addedCount} variations`);
        
        // Clear inputs
        document.getElementById('newShortcutKey').value = '';
        document.getElementById('newShortcutValue').value = '';
        
        // Hide variations section
        document.getElementById('variationsSection').style.display = 'none';
        
        // Reset add button
        const addBtn = document.querySelector('.add-shortcut-btn');
        if (addBtn) {
            addBtn.textContent = 'הוסף';
            addBtn.onclick = addNewShortcut;
        }
        
        // Update display
        updateShortcutsList();
        
        // Show success message
        const action = isEdit ? 'עודכן' : 'נוסף';
        showCustomAlert(`קיצור "${key}" ${action} בהצלחה עם ${selectedVariations.size} וריאציות`, 'הצלחה');
        
        // Clear pending data
        clearPendingShortcut();
    }
    
    function confirmReplaceShortcut() {
        if (!pendingShortcut || !window.TextEditorShortcuts) return;
        
        const { key, value } = pendingShortcut;
        
        // Remove old shortcut and its variations
        window.TextEditorShortcuts.remove(key);
        
        // Hide duplicate warning
        document.getElementById('duplicateWarning').style.display = 'none';
        
        // Show variations selection
        showVariationsSelection(key, value);
    }
    
    function cancelDuplicateShortcut() {
        // Hide duplicate warning
        document.getElementById('duplicateWarning').style.display = 'none';
        
        // Clear pending data
        clearPendingShortcut();
    }
    
    function clearPendingShortcut() {
        pendingShortcut = null;
        selectedVariations.clear();
        
        // Hide warnings and variations
        const duplicateWarning = document.getElementById('duplicateWarning');
        if (duplicateWarning) duplicateWarning.style.display = 'none';
        
        const variationsSection = document.getElementById('variationsSection');
        if (variationsSection) variationsSection.style.display = 'none';
        
        // Reset add button
        const addBtn = document.querySelector('.add-shortcut-btn');
        if (addBtn) {
            addBtn.textContent = 'הוסף';
            addBtn.onclick = addNewShortcut;
        }
    }
    
    function editShortcut(key, value) {
        console.log('[Shortcuts] Editing shortcut:', key);
        
        // Switch to new shortcut tab
        showShortcutsTab('new');
        
        // Pre-fill the form with existing values
        document.getElementById('newShortcutKey').value = key;
        document.getElementById('newShortcutValue').value = value;
        
        // Set pending shortcut for update
        pendingShortcut = { key, value, isEdit: true };
        
        // Show variations
        showVariationsSelection(key, value);
        
        // Update button text
        const addBtn = document.querySelector('.add-shortcut-btn');
        if (addBtn) {
            addBtn.textContent = 'עדכן קיצור';
        }
    }
    
    function deleteShortcut(key) {
        console.log('[Shortcuts] Deleting shortcut:', key);
        showCustomConfirm(`האם למחוק את הקיצור "${key}"?`, 'מחיקת קיצור').then(confirmed => {
            if (confirmed) {
                if (window.TextEditorShortcuts) {
                    window.TextEditorShortcuts.remove(key);
                    
                    // Also update existing shortcuts list if it's visible
                    updateExistingShortcutsList();
                    
                    showCustomAlert(`קיצור "${key}" נמחק בהצלחה`, 'מחיקה הצליחה');
                }
            }
        });
    }
    
    // Custom modal system matching media player design
    function showCustomAlert(message, title = 'הודעה') {
        return new Promise((resolve) => {
            const modal = createCustomModal();
            const titleEl = modal.querySelector('.custom-modal-title');
            const textEl = modal.querySelector('.custom-modal-text');
            const buttonsEl = modal.querySelector('.custom-modal-buttons');
            
            titleEl.textContent = title;
            textEl.textContent = message;
            buttonsEl.innerHTML = `
                <button onclick="window.closeCustomModal()" style="padding: 10px 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; border: none; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(32, 201, 151, 0.3);">
                    אישור
                </button>
            `;
            
            document.body.appendChild(modal);
            window.customModalResolve = resolve;
        });
    }
    
    function showCustomConfirm(message, title = 'אישור') {
        return new Promise((resolve) => {
            const modal = createCustomModal();
            const titleEl = modal.querySelector('.custom-modal-title');
            const textEl = modal.querySelector('.custom-modal-text');
            const buttonsEl = modal.querySelector('.custom-modal-buttons');
            
            titleEl.textContent = title;
            textEl.textContent = message;
            buttonsEl.innerHTML = `
                <button onclick="window.closeCustomModal(true)" style="padding: 10px 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; border: none; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(32, 201, 151, 0.3);">
                    כן
                </button>
                <button onclick="window.closeCustomModal(false)" style="padding: 10px 30px; background: #6c757d; color: white; border: none; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);">
                    לא
                </button>
            `;
            
            document.body.appendChild(modal);
            window.customModalResolve = resolve;
        });
    }
    
    function createCustomModal() {
        const modal = document.createElement('div');
        modal.className = 'custom-message-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; width: 90%; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
                <div class="modal-header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; padding: 20px; border: none;">
                    <h3 class="custom-modal-title" style="margin: 0; font-size: 18px; font-weight: 600;"></h3>
                </div>
                <div class="modal-body" style="padding: 25px; text-align: center; background: linear-gradient(135deg, rgba(40, 167, 69, 0.02) 0%, rgba(32, 201, 151, 0.03) 50%, rgba(23, 162, 184, 0.02) 100%);">
                    <p class="custom-modal-text" style="margin: 0 0 25px 0; font-size: 16px; color: #333; line-height: 1.5;"></p>
                    <div class="custom-modal-buttons" style="display: flex; justify-content: center; gap: 15px;">
                        <!-- Buttons will be dynamically added here -->
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    window.closeCustomModal = function(result = true) {
        const modal = document.querySelector('.custom-message-modal');
        if (modal) {
            modal.remove();
        }
        if (window.customModalResolve) {
            window.customModalResolve(result);
            window.customModalResolve = null;
        }
    };
    
    // Old notification function - deprecated but kept for compatibility
    function showNotification(message, type = 'success') {
        // Redirect to new modal system
        showCustomAlert(message, type === 'success' ? 'הצלחה' : type === 'error' ? 'שגיאה' : 'אזהרה');
    }
    
    function showShortcutsTab(tabName) {
        console.log('[Shortcuts] Switching to tab:', tabName);
        
        // Update tab buttons
        const tabs = document.querySelectorAll('.shortcuts-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.shortcuts-tab-content');
        tabContents.forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        
        // Show selected tab
        if (tabName === 'new') {
            const newTab = document.getElementById('newShortcutTab');
            if (newTab) {
                newTab.classList.add('active');
            }
            const newContent = document.getElementById('newShortcutTabContent');
            if (newContent) {
                newContent.style.display = 'block';
                newContent.classList.add('active');
            }
        } else if (tabName === 'existing') {
            const existingTab = document.getElementById('existingShortcutTab');
            if (existingTab) {
                existingTab.classList.add('active');
            }
            const existingContent = document.getElementById('existingShortcutTabContent');
            if (existingContent) {
                existingContent.style.display = 'block';
                existingContent.classList.add('active');
            }
            
            // Update the shortcuts list when showing existing tab
            updateExistingShortcutsList();
        }
    }
    
    function updateExistingShortcutsList() {
        console.log('[Shortcuts] Updating existing shortcuts list...');
        const existingList = document.getElementById('existingShortcutsList');
        
        if (!existingList) {
            console.error('[Shortcuts] Existing shortcuts list element not found');
            return;
        }
        
        // Get shortcuts from localStorage directly
        let shortcuts = {};
        try {
            const stored = localStorage.getItem('textEditorShortcuts');
            if (stored) {
                shortcuts = JSON.parse(stored);
                console.log('[Shortcuts] Loaded from localStorage:', shortcuts);
            }
        } catch (e) {
            console.error('[Shortcuts] Error loading from localStorage:', e);
        }
        
        existingList.innerHTML = '';
        
        const shortcutEntries = Object.entries(shortcuts);
        console.log('[Shortcuts] Number of existing shortcuts:', shortcutEntries.length);
        
        if (shortcutEntries.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-state';
            emptyMsg.innerHTML = `
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">אין קיצורים שמורים</div>
                <div class="empty-state-subtext">עבור ללשונית "הוסף קיצור חדש" כדי ליצור קיצורים</div>
            `;
            existingList.appendChild(emptyMsg);
        } else {
            shortcutEntries.forEach(([key, value]) => {
                const item = createShortcutItem(key, value);
                existingList.appendChild(item);
            });
        }
    }
    
    function filterShortcuts(searchTerm) {
        const shortcutItems = document.querySelectorAll('#existingShortcutsList .shortcut-item');
        let visibleCount = 0;
        
        shortcutItems.forEach(item => {
            const key = item.querySelector('.shortcut-key').textContent.toLowerCase();
            const value = item.querySelector('.shortcut-value').textContent.toLowerCase();
            
            if (key.includes(searchTerm) || value.includes(searchTerm)) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show/hide empty state
        const emptyState = document.querySelector('#existingShortcutsList .empty-state');
        if (visibleCount === 0 && shortcutItems.length > 0) {
            if (!emptyState) {
                const noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'empty-state search-no-results';
                noResultsMsg.innerHTML = `
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">לא נמצאו קיצורים התואמים "${searchTerm}"</div>
                `;
                document.getElementById('existingShortcutsList').appendChild(noResultsMsg);
            }
        } else if (document.querySelector('.search-no-results')) {
            document.querySelector('.search-no-results').remove();
        }
    }
    
    // Export functions to global scope
    window.openShortcutsModal = openShortcutsModal;
    window.closeShortcutsModal = closeShortcutsModal;
    window.addNewShortcut = addNewShortcut;
    window.deleteShortcut = deleteShortcut;
    window.editShortcut = editShortcut;
    window.confirmAddShortcut = confirmAddShortcut;
    window.confirmReplaceShortcut = confirmReplaceShortcut;
    window.cancelDuplicateShortcut = cancelDuplicateShortcut;
    window.showVariationsPreview = showVariationsPreview;
    window.hideVariationsPreview = hideVariationsPreview;
    window.showShortcutsTab = showShortcutsTab;
    window.filterShortcuts = filterShortcuts;
    
    // Multi-select functions
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.shortcut-checkbox:checked');
        const count = checkboxes.length;
        document.getElementById('selectedCount').textContent = count;
        const deleteBtn = document.getElementById('deleteSelectedBtn');
        deleteBtn.style.display = count > 0 ? 'block' : 'none';
        
        // Update select all checkbox
        const selectAll = document.getElementById('selectAllShortcuts');
        const allCheckboxes = document.querySelectorAll('.shortcut-checkbox');
        selectAll.checked = count === allCheckboxes.length && allCheckboxes.length > 0;
    }
    
    function toggleSelectAll() {
        const selectAll = document.getElementById('selectAllShortcuts');
        const checkboxes = document.querySelectorAll('.shortcut-checkbox');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
        updateSelectedCount();
    }
    
    function deleteSelectedShortcuts() {
        const checkboxes = document.querySelectorAll('.shortcut-checkbox:checked');
        const keys = Array.from(checkboxes).map(cb => cb.closest('.shortcut-item').getAttribute('data-key'));
        
        if (keys.length === 0) return;
        
        const message = keys.length === 1 
            ? `האם למחוק את הקיצור "${keys[0]}"?`
            : `האם למחוק ${keys.length} קיצורים נבחרים?`;
            
        showCustomConfirm(message, 'מחיקת קיצורים').then(confirmed => {
            if (confirmed) {
                keys.forEach(key => {
                    if (window.TextEditorShortcuts) {
                        window.TextEditorShortcuts.remove(key);
                    }
                });
                updateShortcutsList();
            }
        });
    }
    
    window.updateSelectedCount = updateSelectedCount;
    window.toggleSelectAll = toggleSelectAll;
    window.deleteSelectedShortcuts = deleteSelectedShortcuts;
    
    // Toggle all variations checkboxes
    function toggleAllVariations() {
        const selectAll = document.getElementById('selectAllVariations');
        const checkboxes = document.querySelectorAll('#variationsGrid input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            const prefix = cb.value;
            if (selectAll.checked) {
                selectedVariations.add(prefix);
            } else {
                selectedVariations.delete(prefix);
            }
        });
    }
    
    window.toggleAllVariations = toggleAllVariations;
})();
