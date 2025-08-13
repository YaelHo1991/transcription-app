        /* ================================
           Stage 2: Basic Media Player JavaScript
           All functions documented in FUNCTION_MAP.md
           ================================ */
        
        
        // Declare DOM elements globally (will be assigned in initializeMediaPlayer)
        let audioPlayer, playPauseBtn, playIcon, loadingDisplay, controlsSection;
        let statusIndicator, statusText, audioState;
        
        // Stage 3: Progress bar elements
        let progressContainer, progressBar, progressFill, currentTimeDisplay, totalTimeDisplay;
        
        // Stage 5: Control button elements
        let forward5Btn, forward2_5Btn, rewind2_5Btn, rewind5Btn;
        
        // Stage 6: Slider elements
        let slidersContainer, volumeSlider, volumeValue, volumeIcon;
        let speedSlider, speedValue, speedIcon;
        
        // Stage 7: Settings modal elements
        let settingsBtn, modalOverlay, modalClose, tabButtons, tabContents;
        
        // State variables
        let isPlaying = false;
        let isReady = false;
        let isDragging = false;
        let isMuted = false;
        let previousVolume = 100;
        
        /* ================================
           Core Functions (Stage 2)
           ================================ */
        
        /**
         * Play audio
         * Location: Will move to modules/player.js
         */
        function play() {
            console.log('[MediaPlayer] Play called');
            if (!isReady) {
                console.warn('[MediaPlayer] Cannot play - audio not ready');
                return;
            }
            
            audioPlayer.play()
                .then(() => {
                    console.log('[MediaPlayer] Playback started successfully');
                    isPlaying = true;
                    updatePlayPauseButton(true);
                    updateStatus('playing', 'Playing');
                })
                .catch(error => {
                    console.error('[MediaPlayer] Play failed:', error);
                    updateStatus('error', 'Play failed');
                });
        }
        
        /**
         * Pause audio
         * Location: Will move to modules/player.js
         */
        function pause() {
            console.log('[MediaPlayer] Pause called');
            audioPlayer.pause();
            isPlaying = false;
            
            // Apply rewind on pause if enabled
            if (rewindOnPauseSettings.enabled && rewindOnPauseSettings.amount > 0) {
                const currentTime = audioPlayer.currentTime;
                const newTime = Math.max(0, currentTime - rewindOnPauseSettings.amount);
                audioPlayer.currentTime = newTime;
                console.log(`[MediaPlayer] Rewound ${rewindOnPauseSettings.amount}s on pause`);
                showMediaShortcutStatus(`חזר אחורה ${rewindOnPauseSettings.amount} שניות`);
            }
            
            updatePlayPauseButton(false);
            updateStatus('paused', 'Paused');
        }
        
        /**
         * Toggle between play and pause
         * Location: Will move to modules/player.js
         */
        function togglePlayPause() {
            console.log('[MediaPlayer] Toggle play/pause');
            if (isPlaying) {
                pause();
            } else {
                play();
            }
        }
        
        /**
         * Update play/pause button display
         * Location: Will move to modules/controls.js
         */
        function updatePlayPauseButton(playing) {
            if (playIcon) {
                playIcon.textContent = playing ? '⏸️' : '▶️';
            }
            // statusIndicator was removed with test-info
            if (statusIndicator) {
                statusIndicator.className = playing ? 'status-indicator playing' : 'status-indicator ready';
            }
        }
        
        /**
         * Update status display
         * Location: Will move to modules/utils.js
         */
        function updateStatus(state, message) {
            // Only update if elements exist (they were removed)
            if (statusText) {
                statusText.textContent = message;
            }
            if (audioState) {
                audioState.textContent = state;
            }
            
            // Update indicator if it exists
            if (statusIndicator) {
                if (state === 'playing') {
                    statusIndicator.classList.add('playing');
                } else if (state === 'ready' || state === 'paused') {
                    statusIndicator.classList.add('ready');
                    statusIndicator.classList.remove('playing');
                } else {
                    statusIndicator.classList.remove('ready', 'playing');
                }
            }
            
            // Log status for debugging
            console.log('[MediaPlayer] Status:', state, message);
        }
        
        /**
         * Load media file
         * Location: Will move to modules/player.js
         */
        function loadMedia(src, filename, mediaType) {
            console.log('[MediaPlayer] Loading media:', { src, filename, mediaType });
            
            // Reset ready state for new media
            isReady = false;
            
            // Show loading state
            updateStatus('loading', 'Loading media...');
            
            // Check if audioPlayer exists
            if (!audioPlayer) {
                console.error('[MediaPlayer] Audio player element not found!');
                return;
            }
            
            // Set source and load
            audioPlayer.src = src;
            audioPlayer.load();
            
            // Update display with filename
            const fileDisplay = document.getElementById('currentFileName');
            if (fileDisplay) {
                fileDisplay.textContent = filename || 'Loading...';
            }
            
            // Check if this is a video file
            if (isVideoFile(mediaType)) {
                console.log('[MediaPlayer] Video file detected, showing video cube');
                if (window.videoCube) {
                    window.videoCube.loadVideo(src);
                } else {
                    console.warn('[MediaPlayer] VideoCube not initialized yet');
                }
            } else {
                // Hide video cube AND restore button for audio files
                if (window.videoCube) {
                    window.videoCube.hide();
                    // Also hide restore button for audio
                    if (window.videoCube.restoreButton) {
                        window.videoCube.restoreButton.style.display = 'none';
                    }
                }
            }
        }
        
        /**
         * Check if the media type is a video
         * @param {string} mediaType - The MIME type or file extension
         * @returns {boolean} True if video, false otherwise
         */
        function isVideoFile(mediaType) {
            if (!mediaType) return false;
            
            // Check MIME type
            if (mediaType.toLowerCase().includes('video')) {
                return true;
            }
            
            // Check common video extensions
            const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
            const extension = mediaType.toLowerCase().split('.').pop();
            
            return videoExtensions.includes(extension);
        }
        
        /* ================================
           Stage 7: Settings Modal Functions
           ================================ */
        
        /**
         * Open settings modal
         * Location: Will move to modules/settings/modal.js
         */
        function openSettingsModal() {
            console.log('[MediaPlayer] Opening settings modal');
            if (!modalOverlay) {
                console.error('[MediaPlayer] Modal overlay not found!');
                return;
            }
            modalOverlay.classList.add('active');
            modalOverlay.style.display = 'flex'; // Force display
            
            // Focus first tab for accessibility
            if (tabButtons && tabButtons[0]) {
                tabButtons[0].focus();
            }
            
            // Add ESC key listener
            document.addEventListener('keydown', handleModalEsc);
        }
        
        /**
         * Close settings modal
         * Location: Will move to modules/settings/modal.js
         */
        function closeSettingsModal() {
            console.log('[MediaPlayer] Closing settings modal');
            if (!modalOverlay) {
                console.error('[MediaPlayer] Modal overlay not found!');
                return;
            }
            
            // Clean up any active capture handler
            if (activeCaptureHandler) {
                document.removeEventListener('keydown', activeCaptureHandler);
                activeCaptureHandler = null;
                console.log('[MediaPlayer] Cleaned up capture handler on modal close');
            }
            
            // Clear any capture timeout
            if (captureTimeout) {
                clearTimeout(captureTimeout);
                captureTimeout = null;
                console.log('[MediaPlayer] Cleared capture timeout on modal close');
            }
            
            // Reset all capturing buttons
            document.querySelectorAll('.media-shortcut-key.capturing').forEach(btn => {
                btn.classList.remove('capturing');
            });
            updateMediaShortcutsDisplay();
            
            modalOverlay.classList.remove('active');
            modalOverlay.style.display = 'none'; // Force hide
            
            // Remove ESC key listener
            document.removeEventListener('keydown', handleModalEsc);
            
            // Return focus to settings button
            if (settingsBtn) {
                settingsBtn.focus();
            }
        }
        
        /**
         * Switch between tabs
         * Location: Will move to modules/settings/modal.js
         */
        function switchTab(tabName) {
            console.log('[MediaPlayer] Switching to tab:', tabName);
            
            // Update tab buttons
            tabButtons.forEach(btn => {
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Update tab contents
            tabContents.forEach(content => {
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        }
        
        /**
         * Handle ESC key for modal
         * Location: Will move to modules/settings/modal.js
         */
        function handleModalEsc(event) {
            if (event.key === 'Escape') {
                closeSettingsModal();
            }
        }
        
        /* ================================
           Stage 8: Keyboard Shortcuts Functions
           ================================ */
        
        // Keyboard shortcuts configuration
        let mediaShortcuts = {};
        let mediaShortcutsEnabled = true;
        const MEDIA_SHORTCUTS_KEY = 'mediaPlayerShortcuts';
        
        // Work mode states
        let autoDetectEnabled = false;
        let pedalEnabled = true;  // Used by pedal system (Stage 9)
        let autoDetectMode = 'regular'; // 'regular' or 'enhanced' - used by auto-detect
        
        // Track active capture handler to prevent multiple listeners
        let activeCaptureHandler = null;
        let captureTimeout = null;
        
        // Default shortcuts (case-consistent and matching HTML display)
        const defaultMediaShortcuts = {
            // Playbook Control  
            playPause: ' ',              // Spacebar
            stop: 'Escape',              // Stop playback
            
            // Navigation
            rewind5: 'ArrowRight',       // RTL: right arrow goes back
            forward5: 'ArrowLeft',       // RTL: left arrow goes forward
            rewind2_5: 'Shift+ArrowRight',
            forward2_5: 'Shift+ArrowLeft',
            jumpToStart: 'Home',         // Jump to beginning
            jumpToEnd: 'End',            // Jump to end
            
            // Volume & Speed
            volumeUp: 'ArrowUp',
            volumeDown: 'ArrowDown',
            mute: 'm',
            speedUp: '=',
            speedDown: '-',
            speedReset: '0',
            
            // Work Modes
            toggleMode: 'Ctrl+m',        // Lowercase to match buildShortcutKey
            togglePedal: 'p',            // Toggle pedal on/off
            toggleAutoDetect: 'a',       // Toggle auto-detect on/off
            toggleShortcuts: 'Ctrl+Shift+s', // Lowercase to match buildShortcutKey
            
            // Settings
            toggleSettings: 's'
        };
        
        /**
         * Load shortcuts from localStorage
         * Location: Will move to modules/settings/shortcuts.js
         */
        function loadMediaShortcuts() {
            try {
                const saved = localStorage.getItem(MEDIA_SHORTCUTS_KEY);
                if (saved) {
                    mediaShortcuts = { ...defaultMediaShortcuts, ...JSON.parse(saved) };
                } else {
                    mediaShortcuts = { ...defaultMediaShortcuts };
                }
                console.log('[MediaPlayer] Shortcuts loaded:', mediaShortcuts);
            } catch (error) {
                console.error('[MediaPlayer] Failed to load shortcuts:', error);
                mediaShortcuts = { ...defaultMediaShortcuts };
            }
        }
        
        /**
         * Save shortcuts to localStorage
         * Location: Will move to modules/settings/shortcuts.js
         */
        function saveMediaShortcuts() {
            try {
                localStorage.setItem(MEDIA_SHORTCUTS_KEY, JSON.stringify(mediaShortcuts));
                console.log('[MediaPlayer] Shortcuts saved');
            } catch (error) {
                console.error('[MediaPlayer] Failed to save shortcuts:', error);
            }
        }
        
        /**
         * Check if currently focused on text input
         * Location: Will move to modules/settings/shortcuts.js
         */
        function isTextEditorFocused() {
            const activeElement = document.activeElement;
            
            // Check if focused on any text input
            if (activeElement) {
                const tagName = activeElement.tagName.toLowerCase();
                
                // Check for input elements
                if (tagName === 'input' || tagName === 'textarea') {
                    return true;
                }
                
                // Check for contenteditable elements
                if (activeElement.contentEditable === 'true') {
                    return true;
                }
                
                // Check if inside text editor container
                if (activeElement.closest('.transcription-textarea') || 
                    activeElement.closest('.text-editor-container') ||
                    activeElement.closest('.transcription-text')) {
                    return true;
                }
            }
            
            return false;
        }
        
        /**
         * Build shortcut key string from event
         * Location: Will move to modules/settings/shortcuts.js
         */
        function buildShortcutKey(event) {
            // Always use event.code for numpad detection
            const isNumpad = event.code && event.code.startsWith('Numpad');
            
            const parts = [];
            
            if (event.ctrlKey) parts.push('Ctrl');
            if (event.altKey) parts.push('Alt');
            
            // Special handling for Shift+Numpad combinations
            // When Shift+Numpad is pressed, browsers convert to navigation keys
            // We need to detect this and add Shift back
            let shiftDetected = event.shiftKey;
            
            // If we have a numpad code but the key is a navigation key, Shift was pressed
            if (isNumpad && !shiftDetected) {
                const navigationKeys = ['End', 'ArrowDown', 'PageDown', 'ArrowLeft', 
                                       'Clear', 'ArrowRight', 'Home', 'ArrowUp', 'PageUp'];
                if (navigationKeys.includes(event.key)) {
                    shiftDetected = true; // Shift was pressed but browser didn't report it
                }
            }
            
            if (shiftDetected) parts.push('Shift');
            if (event.metaKey) parts.push('Meta');
            
            let key = event.key;
            
            // Skip modifier keys themselves - don't create shortcuts for just Ctrl, Alt, etc.
            const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'Ctrl', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock', 'Pause', 'Insert', 'ContextMenu', 'OS'];
            if (modifierKeys.includes(key)) {
                return ''; // Don't create shortcut for modifier keys alone
            }
            
            // Special handling for numpad keys
            if (isNumpad) {
                // When Shift is pressed with numpad, browsers convert the key
                // We MUST use event.code to get the actual numpad key
                const numpadKey = event.code.substring(6); // Remove 'Numpad' prefix
                key = 'Numpad' + numpadKey; // Create special identifier like 'Numpad1', 'NumpadAdd'
            } else if (key === ' ') {
                key = ' '; // Keep space as is
            } else if (key.startsWith('Arrow')) {
                key = key; // Keep arrow keys as-is (ArrowLeft, ArrowRight, etc.)
            } else if (key.startsWith('F') && key.length <= 3) {
                key = key; // Keep F-keys as-is
            } else if (key.length === 1) {
                // For single character keys, keep lowercase to match defaults
                key = key.toLowerCase();
            }
            
            // Only add key if it's valid and not a modifier
            if (key && !modifierKeys.includes(key)) {
                parts.push(key);
            }
            
            // Only return a result if we have a non-modifier key
            const hasNonModifier = parts.some(p => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(p));
            const result = hasNonModifier ? parts.join('+') : '';
            
            return result;
        }
        
        /**
         * Stop playback completely
         * Location: Will move to modules/settings/shortcuts.js
         */
        function stopPlayback() {
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                isPlaying = false;
                updatePlayPauseButton(false);
                updateStatus('stopped', 'Stopped');
                updateProgress();
                console.log('[MediaPlayer] Playback stopped');
            }
        }
        
        /**
         * Toggle work mode between regular and enhanced
         * Location: Will move to modules/settings/shortcuts.js
         */
        function toggleWorkMode() {
            // Toggle auto-detect mode between regular and enhanced
            autoDetectMode = autoDetectMode === 'regular' ? 'enhanced' : 'regular';
            
            // Update the radio buttons
            const modeRadios = document.querySelectorAll('input[name="autoDetectMode"]');
            modeRadios.forEach(radio => {
                radio.checked = radio.value === autoDetectMode;
            });
            
            // Show/hide appropriate settings
            const regularSettings = document.getElementById('regularModeSettings');
            const enhancedSettings = document.getElementById('enhancedModeSettings');
            if (regularSettings && enhancedSettings) {
                if (autoDetectMode === 'regular') {
                    regularSettings.style.display = 'block';
                    enhancedSettings.style.display = 'none';
                } else {
                    regularSettings.style.display = 'none';
                    enhancedSettings.style.display = 'block';
                }
            }
            
            // Update status display
            updateAutoDetectStatus();
            
            // Reset enhanced mode state when switching
            if (autoDetectMode === 'enhanced') {
                enhancedModeState = 'idle';
                updateEnhancedModeStatus('idle');
            }
            
            console.log('[MediaPlayer] Mode switched to:', autoDetectMode);
            showMediaShortcutStatus(`מצב עבודה: ${autoDetectMode === 'regular' ? 'רגיל' : 'משופר'}`);
            
            // Save to localStorage
            localStorage.setItem('mediaAutoDetectMode', autoDetectMode);
        }
        
        /**
         * Toggle auto-detect on/off
         * Location: Will move to modules/settings/shortcuts.js
         */
        
        /**
         * Toggle auto-detect UI visibility
         * Location: Will move to modules/settings/auto-detect.js
         */
        
        /**
         * Toggle pedal on/off
         * Location: Will move to modules/settings/shortcuts.js
         */
        function togglePedal(fromCheckbox = false) {
            if (fromCheckbox) {
                // Get value from checkbox
                const toggle = document.getElementById('pedal-enabled-toggle');
                if (toggle) {
                    pedalEnabled = toggle.checked;
                }
            } else {
                // Toggle the value
                pedalEnabled = !pedalEnabled;
                
                // Update the pedal enable checkbox if it exists
                const pedalEnabledToggle = document.getElementById('pedal-enabled-toggle');
                if (pedalEnabledToggle) {
                    pedalEnabledToggle.checked = pedalEnabled;
                }
            }
            
            // Also save the setting
            savePedalSettings();
            
            console.log('[MediaPlayer] Pedal:', pedalEnabled ? 'ON' : 'OFF');
            showMediaShortcutStatus(`דוושה: ${pedalEnabled ? 'פעילה' : 'כבויה'}`);
        }
        
        /**
         * Toggle rewind on pause feature
         * Location: Will move to modules/settings.js
         */
        function toggleRewindOnPause() {
            rewindOnPauseSettings.enabled = !rewindOnPauseSettings.enabled;
            
            // Update all checkboxes
            const checkboxes = [
                document.getElementById('rewindOnPauseEnabled'),
                document.getElementById('pedalRewindOnPauseEnabled'),
                document.getElementById('autoDetectRewindOnPauseEnabled')
            ];
            
            checkboxes.forEach(checkbox => {
                if (checkbox) checkbox.checked = rewindOnPauseSettings.enabled;
            });
            
            // Enable/disable amount inputs
            const containers = [
                document.getElementById('rewindAmountContainer'),
                document.getElementById('pedalRewindAmountContainer'),
                document.getElementById('autoDetectRewindAmountContainer')
            ];
            
            containers.forEach(container => {
                if (container) {
                    if (rewindOnPauseSettings.enabled) {
                        container.classList.remove('disabled');
                    } else {
                        container.classList.add('disabled');
                    }
                }
            });
            
            // Save to localStorage
            localStorage.setItem('mediaPlayerRewindOnPause', JSON.stringify(rewindOnPauseSettings));
            console.log('[MediaPlayer] Rewind on pause:', rewindOnPauseSettings.enabled ? 'ON' : 'OFF');
        }
        
        /**
         * Update rewind amount
         * Location: Will move to modules/settings.js
         */
        function updateRewindAmount() {
            // Get value from any of the inputs (they should all be synced)
            const inputs = [
                document.getElementById('rewindAmount'),
                document.getElementById('pedalRewindAmount'),
                document.getElementById('autoDetectRewindAmount')
            ];
            
            let newAmount = null;
            inputs.forEach(input => {
                if (input && document.activeElement === input) {
                    newAmount = parseFloat(input.value);
                }
            });
            
            if (newAmount !== null && !isNaN(newAmount)) {
                rewindOnPauseSettings.amount = newAmount;
                
                // Update all inputs to match
                inputs.forEach(input => {
                    if (input) input.value = newAmount;
                });
                
                // Save to localStorage
                localStorage.setItem('mediaPlayerRewindOnPause', JSON.stringify(rewindOnPauseSettings));
                console.log('[MediaPlayer] Rewind amount updated to:', newAmount);
            }
        }
        
        /**
         * Toggle all shortcuts on/off
         * Location: Will move to modules/settings/shortcuts.js
         */
        function toggleShortcutsEnabled(fromCheckbox = false) {
            // If called from keyboard shortcut, toggle the value
            if (!fromCheckbox) {
                mediaShortcutsEnabled = !mediaShortcutsEnabled;
                
                // Update the checkbox UI
                const toggle = document.getElementById('shortcutsEnabledToggle');
                if (toggle) {
                    toggle.checked = mediaShortcutsEnabled;
                }
            } else {
                // If called from checkbox, get the value from checkbox
                const toggle = document.getElementById('shortcutsEnabledToggle');
                if (toggle) {
                    mediaShortcutsEnabled = toggle.checked;
                }
            }
            
            console.log('[MediaPlayer] Shortcuts:', mediaShortcutsEnabled ? 'ENABLED' : 'DISABLED');
            showMediaShortcutStatus(`קיצורי מקלדת: ${mediaShortcutsEnabled ? 'פעילים' : 'כבויים'}`);
            
            // Save to localStorage
            localStorage.setItem('mediaShortcutsEnabled', JSON.stringify(mediaShortcutsEnabled));
        }
        
        /**
         * Execute action for shortcut
         * Location: Will move to modules/settings/shortcuts.js
         */
        function executeShortcutAction(action) {
            console.log('[MediaPlayer] Executing shortcut action:', action);
            
            switch (action) {
                // Playback Control
                case 'playPause':
                    togglePlayPause();
                    break;
                case 'stop':
                    stopPlayback();
                    break;
                    
                // Navigation
                case 'rewind5':
                    skipBackward(5);
                    break;
                case 'forward5':
                    skipForward(5);
                    break;
                case 'rewind2_5':
                    skipBackward(2.5);
                    break;
                case 'forward2_5':
                    skipForward(2.5);
                    break;
                case 'jumpToStart':
                    jumpToStart();
                    break;
                case 'jumpToEnd':
                    jumpToEnd();
                    break;
                    
                // Volume & Speed
                case 'volumeUp':
                    adjustVolume(10);
                    break;
                case 'volumeDown':
                    adjustVolume(-10);
                    break;
                case 'mute':
                    toggleMute();
                    break;
                case 'speedUp':
                    adjustSpeed(25);
                    break;
                case 'speedDown':
                    adjustSpeed(-25);
                    break;
                case 'speedReset':
                    resetSpeed();
                    break;
                    
                // Work Modes
                case 'toggleMode':
                    toggleWorkMode();
                    break;
                case 'togglePedal':
                    togglePedal();
                    break;
                case 'toggleAutoDetect':
                    toggleAutoDetect();
                    break;
                case 'toggleShortcuts':
                    toggleShortcutsEnabled();
                    break;
                    
                // Settings
                case 'toggleSettings':
                    if (modalOverlay && modalOverlay.classList.contains('active')) {
                        closeSettingsModal();
                    } else {
                        openSettingsModal();
                    }
                    break;
                    
                default:
                    console.warn('[MediaPlayer] Unknown shortcut action:', action);
            }
        }
        
        /**
         * Handle keyboard shortcut press
         * Location: Will move to modules/settings/shortcuts.js
         */
        function handleKeyPress(event) {
            // Prevent browser shortcuts for all Ctrl combinations early
            if (event.ctrlKey) {
                event.preventDefault();
            }
            
            const shortcutKey = buildShortcutKey(event);
            
            // Check for toggle shortcuts first - these work even when modal is open or shortcuts are disabled
            const toggleActions = ['toggleShortcuts', 'toggleSettings', 'togglePedal', 'toggleAutoDetect', 'toggleMode'];
            for (const [action, key] of Object.entries(mediaShortcuts)) {
                // Special handling for Shift+Numpad combinations
                if (key.includes('Shift+Numpad') && shortcutKey.includes('Shift+Numpad')) {
                    if (toggleActions.includes(action) && key === shortcutKey) {
                        event.preventDefault();
                        executeShortcutAction(action);
                        return;
                    }
                } else {
                    // For non-Shift+Numpad, use existing logic
                    const normalizedKey = key.includes('Numpad') ? key : key.toLowerCase();
                    const normalizedShortcut = shortcutKey.includes('Numpad') ? shortcutKey : shortcutKey.toLowerCase();
                    if (toggleActions.includes(action) && normalizedKey === normalizedShortcut) {
                        event.preventDefault();
                        executeShortcutAction(action);
                        return;
                    }
                }
            }
            
            // Don't process other shortcuts if disabled UNLESS it's a Shift+Numpad combination
            const isShiftNumpad = event.shiftKey && event.code && event.code.startsWith('Numpad');
            if (!mediaShortcutsEnabled && !isShiftNumpad) {
                return;
            }
            
            // Check if we're in text editor
            const inTextEditor = isTextEditorFocused();
            
            // Check if this is a key combination (not just a single key)
            const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
            
            // Check if it's an F-key
            const isFKey = event.key.startsWith('F') && event.key.length <= 3;
            
            // Check if it's a numpad key
            const isNumpadKey = event.code && event.code.startsWith('Numpad');
            
            // Special: Shift+Numpad should ALWAYS work, even in text editor
            if (!isShiftNumpad && inTextEditor && !hasModifier && !isFKey && !isNumpadKey) {
                return; // Block single keys that would type characters
            }
            
            // Don't process if modal is open (except for toggle shortcuts which we handled above)
            if (modalOverlay && modalOverlay.classList.contains('active')) {
                // ESC is handled by handleModalEsc
                return;
            }
            
            // Find matching action
            for (const [action, key] of Object.entries(mediaShortcuts)) {
                // Skip if key is not defined
                if (!key) continue;
                
                // Special exact comparison for any numpad combinations (including Shift+Numpad)
                if ((key.includes('Numpad') && shortcutKey.includes('Numpad')) || 
                    (key.includes('Shift') && shortcutKey.includes('Shift'))) {
                    // Compare exactly for Numpad and Shift combinations
                    if (key === shortcutKey && !toggleActions.includes(action)) {
                        event.preventDefault();
                        executeShortcutAction(action);
                        return;
                    }
                } else {
                    // For other keys, use case-insensitive comparison
                    const normalizedKey = key.toLowerCase();
                    const normalizedShortcut = shortcutKey.toLowerCase();
                    if (!toggleActions.includes(action) && normalizedKey === normalizedShortcut) {
                        event.preventDefault();
                        executeShortcutAction(action);
                        return;
                    }
                }
            }
        }
        
        /**
         * Adjust volume by amount
         * Location: Will move to modules/settings/shortcuts.js
         */
        function adjustVolume(amount) {
            if (!volumeSlider) return;
            
            const current = parseInt(volumeSlider.value);
            const newValue = Math.max(0, Math.min(100, current + amount));
            setVolume(newValue);
        }
        
        /**
         * Adjust speed by amount
         * Location: Will move to modules/settings/shortcuts.js
         */
        function adjustSpeed(amount) {
            if (!speedSlider) return;
            
            const current = parseInt(speedSlider.value);
            const newValue = Math.max(50, Math.min(200, current + amount));
            setSpeed(newValue);
        }
        
        /**
         * Format key for display
         * Location: Will move to modules/settings/shortcuts.js
         */
        function formatKeyDisplay(key) {
            // Validate input
            if (!key || typeof key !== 'string') {
                console.log('[Display] Invalid key input:', key);
                return '';
            }
            
            console.log('[Display] Formatting key:', key);
            
            // Handle space key specially (before trim check)
            // Must check for single space character
            if (key === ' ' || key === 'Space') {
                return 'רווח';
            }
            
            // Return empty string for truly empty keys (but not space!)
            if (key.trim() === '' && key !== ' ') {
                return '';
            }
            
            // Handle combination keys
            if (key.includes('+')) {
                const parts = key.split('+');
                const formattedParts = parts.map(part => {
                    const cleanPart = part.trim();
                    
                    // Skip empty parts
                    if (!cleanPart) return '';
                    
                    // Handle special keys and modifiers
                    switch (cleanPart) {
                        case 'ArrowLeft': return '→';  // RTL: left arrow shows as right
                        case 'ArrowRight': return '←'; // RTL: right arrow shows as left
                        case 'ArrowUp': return '↑';
                        case 'ArrowDown': return '↓';
                        case 'Escape': return 'Esc';
                        case 'Home': return 'Home';
                        case 'End': return 'End';
                        case ' ': return 'רווח';
                        case 'Ctrl': return 'Ctrl';
                        case 'Alt': return 'Alt';
                        case 'Shift': return 'Shift';
                        case 'Meta': return 'Win';
                        default:
                            // Handle Numpad keys specially
                            if (cleanPart.startsWith('Numpad')) {
                                const numpadPart = cleanPart.substring(6);
                                switch (numpadPart) {
                                    case 'Add': return 'נומ +';
                                    case 'Subtract': return 'נומ -';
                                    case 'Multiply': return 'נומ *';
                                    case 'Divide': return 'נומ /';
                                    case 'Enter': return 'נומ Enter';
                                    case 'Decimal': return 'נומ .';
                                    default: return 'נומ ' + numpadPart;
                                }
                            }
                            // For regular keys, just uppercase
                            return cleanPart.toUpperCase();
                    }
                }).filter(p => p !== ''); // Remove empty parts
                
                // Return empty if no valid parts
                if (formattedParts.length === 0) {
                    return '';
                }
                
                const result = formattedParts.join('+');
                console.log('[Display] Combination result:', result);
                return result;
            }
            
            // Handle single keys
            let singleResult;
            switch (key) {
                case 'ArrowLeft': singleResult = '→'; break;  // RTL
                case 'ArrowRight': singleResult = '←'; break; // RTL  
                case 'ArrowUp': singleResult = '↑'; break;
                case 'ArrowDown': singleResult = '↓'; break;
                case 'Escape': singleResult = 'Esc'; break;
                case 'Home': singleResult = 'Home'; break;
                case 'End': singleResult = 'End'; break;
                case ' ': singleResult = 'רווח'; break;
                default: 
                    // Handle Numpad keys specially
                    if (key.startsWith('Numpad')) {
                        const numpadPart = key.substring(6);
                        switch (numpadPart) {
                            case 'Add': singleResult = 'נומ +'; break;
                            case 'Subtract': singleResult = 'נומ -'; break;
                            case 'Multiply': singleResult = 'נומ *'; break;
                            case 'Divide': singleResult = 'נומ /'; break;
                            case 'Enter': singleResult = 'נומ Enter'; break;
                            case 'Decimal': singleResult = 'נומ .'; break;
                            default: singleResult = 'נומ ' + numpadPart;
                        }
                    } else {
                        singleResult = key.toUpperCase();
                    }
            }
            console.log('[Display] Single key result:', singleResult);
            return singleResult;
        }
        
        /**
         * Update shortcuts display in UI
         * Location: Will move to modules/settings/shortcuts.js
         */
        function updateMediaShortcutsDisplay() {
            console.log('[UpdateDisplay] Current shortcuts:', mediaShortcuts);
            for (const [action, key] of Object.entries(mediaShortcuts)) {
                const button = document.getElementById(`shortcut-${action}`);
                if (button) {
                    const displayText = formatKeyDisplay(key);
                    button.textContent = displayText || 'לא מוגדר';
                    console.log(`[UpdateDisplay] Action: ${action}, Key: ${key}, Display: ${displayText}`);
                }
            }
        }
        
        /**
         * Setup shortcut configuration UI
         * Location: Will move to modules/settings/shortcuts.js
         */
        function setupMediaShortcutUI() {
            // Get all shortcut buttons
            const shortcutButtons = document.querySelectorAll('.media-shortcut-key');
            
            shortcutButtons.forEach(button => {
                button.addEventListener('click', function() {
                    startCapturingShortcut(this);
                });
            });
            
            // Update display with current shortcuts
            updateMediaShortcutsDisplay();
        }
        
        /**
         * Start capturing new shortcut
         * Location: Will move to modules/settings/shortcuts.js
         */
        function startCapturingShortcut(button) {
            // Clean up any existing capture handler first
            if (activeCaptureHandler) {
                document.removeEventListener('keydown', activeCaptureHandler);
                activeCaptureHandler = null;
                console.log('[MediaPlayer] Cleaned up existing capture handler');
            }
            
            // Clear any existing timeout
            if (captureTimeout) {
                clearTimeout(captureTimeout);
                captureTimeout = null;
            }
            
            // Remove capturing from any other button and reset their text
            document.querySelectorAll('.media-shortcut-key.capturing').forEach(btn => {
                btn.classList.remove('capturing');
                // Reset button text to show current shortcut
                const action = btn.dataset.action;
                if (action && mediaShortcuts[action]) {
                    btn.textContent = formatKeyDisplay(mediaShortcuts[action]);
                }
            });
            
            // Add capturing class
            button.classList.add('capturing');
            button.textContent = 'לחץ מקש...';
            
            // Set 5-second timeout to auto-cancel
            captureTimeout = setTimeout(() => {
                if (activeCaptureHandler) {
                    document.removeEventListener('keydown', activeCaptureHandler);
                    activeCaptureHandler = null;
                }
                button.classList.remove('capturing');
                updateMediaShortcutsDisplay();
                showMediaShortcutStatus('זמן הקצוב להגדרת קיצור פג');
                captureTimeout = null;
            }, 5000);
            
            // Create new capture handler
            activeCaptureHandler = (event) => {
                event.preventDefault();
                
                // Don't capture ESC (let it close modal if needed)
                if (event.key === 'Escape') {
                    // Clear timeout
                    if (captureTimeout) {
                        clearTimeout(captureTimeout);
                        captureTimeout = null;
                    }
                    button.classList.remove('capturing');
                    updateMediaShortcutsDisplay();
                    document.removeEventListener('keydown', activeCaptureHandler);
                    activeCaptureHandler = null;
                    return;
                }
                
                // Build the shortcut key
                const newKey = buildShortcutKey(event);
                const action = button.dataset.action;
                
                // Don't accept empty keys (modifier keys alone)
                if (!newKey) {
                    return; // Keep capturing mode active
                }
                
                // Check if it's the same key for the same action (case-insensitive)
                if (mediaShortcuts[action] && mediaShortcuts[action].toLowerCase() === newKey.toLowerCase()) {
                    // Clear timeout
                    if (captureTimeout) {
                        clearTimeout(captureTimeout);
                        captureTimeout = null;
                    }
                    showMediaShortcutStatus('הקיצור כבר מוגדר למקש זה');
                    button.classList.remove('capturing');
                    updateMediaShortcutsDisplay();
                    document.removeEventListener('keydown', activeCaptureHandler);
                    activeCaptureHandler = null;
                    return;
                }
                
                // Check if key is already used by a different action
                for (const [existingAction, existingKey] of Object.entries(mediaShortcuts)) {
                    // Skip comparison if existing key is empty/null
                    if (!existingKey) {
                        continue;
                    }
                    
                    // Case-insensitive comparison to prevent duplicates
                    if (existingKey.toLowerCase() === newKey.toLowerCase() && existingAction !== action) {
                        // Clear timeout
                        if (captureTimeout) {
                            clearTimeout(captureTimeout);
                            captureTimeout = null;
                        }
                        showMediaShortcutStatus(`המקש ${formatKeyDisplay(newKey)} כבר בשימוש עבור ${getActionName(existingAction)}`);
                        button.classList.remove('capturing');
                        updateMediaShortcutsDisplay();
                        document.removeEventListener('keydown', activeCaptureHandler);
                        activeCaptureHandler = null;
                        return;
                    }
                }
                
                // Update shortcut
                mediaShortcuts[action] = newKey;
                saveMediaShortcuts();
                
                // Clear timeout since we successfully captured a key
                if (captureTimeout) {
                    clearTimeout(captureTimeout);
                    captureTimeout = null;
                }
                
                // Update display
                button.classList.remove('capturing');
                button.textContent = formatKeyDisplay(newKey);
                
                showMediaShortcutStatus('הקיצור עודכן בהצלחה');
                
                // Remove handler
                document.removeEventListener('keydown', activeCaptureHandler);
                activeCaptureHandler = null;
                console.log('[MediaPlayer] Capture handler removed after success');
            };
            
            // Add the capture handler
            document.addEventListener('keydown', activeCaptureHandler);
            console.log('[MediaPlayer] Capture handler added');
        }
        
        /**
         * Get action name in Hebrew
         * Location: Will move to modules/settings/shortcuts.js
         */
        function getActionName(action) {
            const actionNames = {
                // Playback Control
                playPause: 'הפעל/השהה',
                stop: 'עצור',
                
                // Navigation
                rewind5: 'קפוץ אחורה 5 שניות',
                forward5: 'קפוץ קדימה 5 שניות',
                rewind2_5: 'קפוץ אחורה 2.5 שניות',
                forward2_5: 'קפוץ קדימה 2.5 שניות',
                jumpToStart: 'קפוץ להתחלה',
                jumpToEnd: 'קפוץ לסוף',
                
                // Volume & Speed
                volumeUp: 'הגבר עוצמה',
                volumeDown: 'הנמך עוצמה',
                mute: 'השתק/בטל השתקה',
                speedUp: 'הגבר מהירות',
                speedDown: 'הנמך מהירות',
                speedReset: 'אפס מהירות',
                
                // Work Modes
                toggleMode: 'החלף מצב רגיל/משופר',
                togglePedal: 'הפעל/כבה דוושה',
                toggleAutoDetect: 'הפעל/כבה זיהוי אוטומטי',
                toggleShortcuts: 'הפעל/כבה קיצורים',
                
                // Settings
                toggleSettings: 'פתח הגדרות'
            };
            
            return actionNames[action] || action;
        }
        
        /**
         * Show status message
         * Location: Will move to modules/settings/shortcuts.js
         */
        function showMediaShortcutStatus(message) {
            // Check if modal is open
            const modalIsOpen = modalOverlay && modalOverlay.classList.contains('active');
            
            if (modalIsOpen) {
                // If modal is open, only show in modal status
                const modalStatusEl = document.getElementById('mediaShortcutsStatus');
                if (modalStatusEl) {
                    modalStatusEl.textContent = message;
                    modalStatusEl.classList.add('visible');
                    
                    setTimeout(() => {
                        modalStatusEl.classList.remove('visible');
                    }, 3000);
                }
            } else {
                // If modal is closed, show in global status
                const globalStatusEl = document.getElementById('mediaGlobalStatus');
                if (globalStatusEl) {
                    globalStatusEl.textContent = message;
                    globalStatusEl.classList.add('visible');
                    
                    // Clear any existing timeout
                    if (globalStatusEl.timeoutId) {
                        clearTimeout(globalStatusEl.timeoutId);
                    }
                    
                    // Set new timeout
                    globalStatusEl.timeoutId = setTimeout(() => {
                        globalStatusEl.classList.remove('visible');
                    }, 3000);
                }
            }
        }
        
        /**
         * Reset shortcuts to defaults
         * Location: Will move to modules/settings/shortcuts.js
         */
        function resetMediaShortcuts() {
            mediaShortcuts = { ...defaultMediaShortcuts };
            saveMediaShortcuts();
            updateMediaShortcutsDisplay();
            showMediaShortcutStatus('הקיצורים אופסו לברירת המחדל');
        }
        
        /* ================================
           Auto-Detect Functions
           ================================ */
           
        // Auto-detect state variables (autoDetectEnabled and autoDetectMode already declared above)
        let autoDetectDelay = 2.0; // For regular mode
        let typingTimeout = null;
        let autoResumeTimeout = null; // Separate timeout for auto-resume
        let wasPlayingBeforeTyping = false;
        let enhancedModeState = 'idle'; // For enhanced mode: 'idle', 'typing', 'firstPause', 'secondTyping'
        let autoDetectRewindSettings = {
            enabled: false,
            amount: 0.3
        };
        
        // Enhanced mode timing settings
        let enhancedModeSettings = {
            firstPauseDelay: 1.5,  // Time to wait before first pause
            secondPauseDelay: 1.5, // Time to wait before second pause
            resumeDelay: 2.0       // Time to wait before auto-resume
        };
        
        /**
         * Toggle auto-detect on/off
         */
        function toggleAutoDetect() {
            autoDetectEnabled = !autoDetectEnabled;
            
            // Update the checkbox
            const toggle = document.getElementById('autoDetectEnabledToggle');
            if (toggle) {
                toggle.checked = autoDetectEnabled;
            }
            
            // Update status display
            updateAutoDetectStatus();
            
            // Save to localStorage
            localStorage.setItem('mediaAutoDetectEnabled', JSON.stringify(autoDetectEnabled));
            
            // Show status message
            showMediaShortcutStatus(`זיהוי אוטומטי: ${autoDetectEnabled ? 'פעיל' : 'כבוי'}`);
            
            console.log('[MediaPlayer] Auto-detect:', autoDetectEnabled ? 'ON' : 'OFF');
        }
        
        /**
         * Update auto-detect status display
         */
        function updateAutoDetectStatus() {
            const statusText = document.getElementById('autoDetectStatusText');
            const statusIcon = document.querySelector('#autoDetectStatusIndicator .status-icon');
            const enhancedStatus = document.getElementById('enhancedModeStatus');
            
            if (statusText) {
                statusText.textContent = autoDetectEnabled ? 'פעיל' : 'כבוי';
            }
            
            if (statusIcon) {
                statusIcon.style.color = autoDetectEnabled ? '#20c997' : '#666';
            }
            
            // Show/hide enhanced mode status
            if (enhancedStatus) {
                enhancedStatus.style.display = (autoDetectEnabled && autoDetectMode === 'enhanced') ? 'block' : 'none';
            }
        }
        
        /**
         * Update enhanced mode status text
         */
        function updateEnhancedModeStatus(state) {
            const statusText = document.getElementById('enhancedModeStatusText');
            if (!statusText) return;
            
            const statusMessages = {
                'idle': 'ממתין להקלדה',
                'typing': 'מנגן בזמן הקלדה',
                'firstPause': 'הפסקה ראשונה - מושהה',
                'secondTyping': 'הקלדה שנייה - ממתין להפסקה שנייה'
            };
            
            statusText.textContent = statusMessages[state] || '';
        }
        
        /**
         * Toggle auto-detect rewind on pause
         */
        function toggleAutoDetectRewind() {
            const checkbox = document.getElementById('autoDetectRewindEnabled');
            const container = document.getElementById('autoDetectRewindContainer');
            
            if (checkbox && container) {
                autoDetectRewindSettings.enabled = checkbox.checked;
                container.classList.toggle('disabled', !checkbox.checked);
                localStorage.setItem('mediaAutoDetectRewindEnabled', JSON.stringify(checkbox.checked));
            }
        }
        
        /**
         * Update auto-detect rewind amount
         */
        function updateAutoDetectRewindAmount() {
            const input = document.getElementById('autoDetectRewindAmount');
            if (input) {
                autoDetectRewindSettings.amount = parseFloat(input.value);
                localStorage.setItem('mediaAutoDetectRewindAmount', input.value);
            }
        }
        
        /**
         * Initialize auto-detect functionality
         */
        function initializeAutoDetect() {
            // Load saved settings
            const savedEnabled = localStorage.getItem('mediaAutoDetectEnabled');
            if (savedEnabled !== null) {
                autoDetectEnabled = JSON.parse(savedEnabled);
            }
            
            const savedMode = localStorage.getItem('mediaAutoDetectMode');
            if (savedMode) {
                autoDetectMode = savedMode;
            }
            
            const savedDelay = localStorage.getItem('mediaAutoDetectDelay');
            if (savedDelay) {
                autoDetectDelay = parseFloat(savedDelay);
            }
            
            // Load enhanced mode settings
            const savedFirstPause = localStorage.getItem('enhancedFirstPauseDelay');
            if (savedFirstPause) {
                enhancedModeSettings.firstPauseDelay = parseFloat(savedFirstPause);
            }
            
            const savedSecondPause = localStorage.getItem('enhancedSecondPauseDelay');
            if (savedSecondPause) {
                enhancedModeSettings.secondPauseDelay = parseFloat(savedSecondPause);
            }
            
            const savedResumeDelay = localStorage.getItem('enhancedResumeDelay');
            if (savedResumeDelay) {
                enhancedModeSettings.resumeDelay = parseFloat(savedResumeDelay);
            }
            
            // Load rewind settings
            const savedRewindEnabled = localStorage.getItem('mediaAutoDetectRewindEnabled');
            if (savedRewindEnabled !== null) {
                autoDetectRewindSettings.enabled = JSON.parse(savedRewindEnabled);
            }
            
            const savedRewindAmount = localStorage.getItem('mediaAutoDetectRewindAmount');
            if (savedRewindAmount) {
                autoDetectRewindSettings.amount = parseFloat(savedRewindAmount);
            }
            
            // Update UI
            const toggle = document.getElementById('autoDetectEnabledToggle');
            if (toggle) {
                toggle.checked = autoDetectEnabled;
            }
            
            const modeRadios = document.querySelectorAll('input[name="autoDetectMode"]');
            modeRadios.forEach(radio => {
                if (radio.value === autoDetectMode) {
                    radio.checked = true;
                }
            });
            
            // Show correct settings based on mode
            const regularSettings = document.getElementById('regularModeSettings');
            const enhancedSettings = document.getElementById('enhancedModeSettings');
            if (regularSettings && enhancedSettings) {
                if (autoDetectMode === 'regular') {
                    regularSettings.style.display = 'block';
                    enhancedSettings.style.display = 'none';
                } else {
                    regularSettings.style.display = 'none';
                    enhancedSettings.style.display = 'block';
                }
            }
            
            const delayInput = document.getElementById('autoDetectDelay');
            if (delayInput) {
                delayInput.value = autoDetectDelay;
            }
            
            // Update enhanced mode inputs
            const firstPauseInput = document.getElementById('enhancedFirstPauseDelay');
            if (firstPauseInput) {
                firstPauseInput.value = enhancedModeSettings.firstPauseDelay;
            }
            
            const secondPauseInput = document.getElementById('enhancedSecondPauseDelay');
            if (secondPauseInput) {
                secondPauseInput.value = enhancedModeSettings.secondPauseDelay;
            }
            
            const resumeDelayInput = document.getElementById('enhancedResumeDelay');
            if (resumeDelayInput) {
                resumeDelayInput.value = enhancedModeSettings.resumeDelay;
            }
            
            // Update rewind UI
            const rewindEnabledCheckbox = document.getElementById('autoDetectRewindEnabled');
            if (rewindEnabledCheckbox) {
                rewindEnabledCheckbox.checked = autoDetectRewindSettings.enabled;
            }
            
            const rewindAmountInput = document.getElementById('autoDetectRewindAmount');
            if (rewindAmountInput) {
                rewindAmountInput.value = autoDetectRewindSettings.amount;
            }
            
            const rewindContainer = document.getElementById('autoDetectRewindContainer');
            if (rewindContainer) {
                rewindContainer.classList.toggle('disabled', !autoDetectRewindSettings.enabled);
            }
            
            // Set up event listeners
            setupAutoDetectListeners();
            
            // Update status display
            updateAutoDetectStatus();
            
            console.log('[MediaPlayer] Auto-detect initialized:', {
                enabled: autoDetectEnabled,
                mode: autoDetectMode,
                delay: autoDetectDelay
            });
        }
        
        /**
         * Set up auto-detect event listeners
         */
        function setupAutoDetectListeners() {
            // Mode selection
            const modeRadios = document.querySelectorAll('input[name="autoDetectMode"]');
            modeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        autoDetectMode = this.value;
                        localStorage.setItem('mediaAutoDetectMode', autoDetectMode);
                        console.log('[AutoDetect] Mode changed to:', autoDetectMode);
                        
                        // Show/hide appropriate settings
                        const regularSettings = document.getElementById('regularModeSettings');
                        const enhancedSettings = document.getElementById('enhancedModeSettings');
                        
                        if (regularSettings && enhancedSettings) {
                            if (autoDetectMode === 'regular') {
                                regularSettings.style.display = 'block';
                                enhancedSettings.style.display = 'none';
                            } else {
                                regularSettings.style.display = 'none';
                                enhancedSettings.style.display = 'block';
                            }
                        }
                    }
                });
            });
            
            // Delay setting
            const delayInput = document.getElementById('autoDetectDelay');
            if (delayInput) {
                delayInput.addEventListener('change', function() {
                    autoDetectDelay = parseFloat(this.value);
                    localStorage.setItem('mediaAutoDetectDelay', autoDetectDelay.toString());
                    console.log('[AutoDetect] Delay changed to:', autoDetectDelay, 'seconds');
                });
            }
            
            // Enhanced mode settings
            const firstPauseInput = document.getElementById('enhancedFirstPauseDelay');
            if (firstPauseInput) {
                firstPauseInput.addEventListener('change', function() {
                    enhancedModeSettings.firstPauseDelay = parseFloat(this.value);
                    localStorage.setItem('enhancedFirstPauseDelay', this.value);
                });
            }
            
            const secondPauseInput = document.getElementById('enhancedSecondPauseDelay');
            if (secondPauseInput) {
                secondPauseInput.addEventListener('change', function() {
                    enhancedModeSettings.secondPauseDelay = parseFloat(this.value);
                    localStorage.setItem('enhancedSecondPauseDelay', this.value);
                });
            }
            
            const resumeDelayInput = document.getElementById('enhancedResumeDelay');
            if (resumeDelayInput) {
                resumeDelayInput.addEventListener('change', function() {
                    enhancedModeSettings.resumeDelay = parseFloat(this.value);
                    localStorage.setItem('enhancedResumeDelay', this.value);
                });
            }
            
            // Mode change also updates status display
            modeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        updateAutoDetectStatus();
                        // Reset enhanced mode state when switching modes
                        if (autoDetectMode === 'enhanced') {
                            enhancedModeState = 'idle';
                            updateEnhancedModeStatus('idle');
                        }
                    }
                });
            });
            
            // Text editor typing detection
            if (typeof window !== 'undefined') {
                // Listen for typing in text editor
                document.addEventListener('input', function(event) {
                    if (autoDetectEnabled && isTextEditorElement(event.target)) {
                        handleTypingDetected();
                    }
                });
                
                document.addEventListener('keydown', function(event) {
                    if (autoDetectEnabled && isTextEditorElement(event.target)) {
                        handleTypingDetected();
                    }
                });
            }
        }
        
        /**
         * Check if element is part of text editor
         */
        function isTextEditorElement(element) {
            if (!element) return false;
            
            // Check if element or its parent is part of text editor
            let current = element;
            while (current) {
                if (current.classList && (
                    current.classList.contains('text-editor-content') ||
                    current.classList.contains('text-editor-container') ||
                    current.id === 'textEditor' ||
                    current.classList.contains('block-content')
                )) {
                    return true;
                }
                current = current.parentElement;
            }
            
            return false;
        }
        
        /**
         * Handle typing detected in text editor
         */
        function handleTypingDetected() {
            if (!autoDetectEnabled) return;
            
            if (autoDetectMode === 'regular') {
                // Regular mode: pause when typing starts
                if (isPlaying && !wasPlayingBeforeTyping) {
                    wasPlayingBeforeTyping = true;
                    pause();
                    
                    // Apply rewind if enabled
                    if (autoDetectRewindSettings.enabled && autoDetectRewindSettings.amount > 0) {
                        const currentTime = audioPlayer.currentTime;
                        const newTime = Math.max(0, currentTime - autoDetectRewindSettings.amount);
                        audioPlayer.currentTime = newTime;
                        updateProgress();
                        console.log('[AutoDetect] Rewound by', autoDetectRewindSettings.amount, 'seconds');
                    }
                    
                    console.log('[AutoDetect] Paused due to typing (Regular mode)');
                }
                
                // Clear existing timeout
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                // Set timeout to resume after delay (convert seconds to milliseconds)
                typingTimeout = setTimeout(() => {
                    if (wasPlayingBeforeTyping && !isPlaying) {
                        play();
                        wasPlayingBeforeTyping = false;
                        console.log('[AutoDetect] Resumed after typing pause (Regular mode)');
                    }
                }, autoDetectDelay * 1000); // Convert to milliseconds
                
            } else if (autoDetectMode === 'enhanced') {
                // Enhanced mode: continue playing while typing, pause on first break
                if (enhancedModeState === 'idle') {
                    // First typing detected - continue playing
                    enhancedModeState = 'typing';
                    updateEnhancedModeStatus('typing');
                    console.log('[AutoDetect Enhanced] Started typing - continuing playback');
                } else if (enhancedModeState === 'firstPause') {
                    // Resume typing after first pause - keep paused
                    // Clear auto-resume timeout since user is typing again
                    if (autoResumeTimeout) {
                        clearTimeout(autoResumeTimeout);
                        autoResumeTimeout = null;
                        console.log('[AutoDetect Enhanced] Cleared auto-resume timeout - user typing again');
                    }
                    enhancedModeState = 'secondTyping';
                    updateEnhancedModeStatus('secondTyping');
                    console.log('[AutoDetect Enhanced] Resumed typing - staying paused');
                }
                
                // Clear existing timeout
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                // Set timeout for pause detection
                typingTimeout = setTimeout(() => {
                    if (enhancedModeState === 'typing') {
                        // First pause detected - pause playback
                        if (isPlaying) {
                            wasPlayingBeforeTyping = true;
                            pause();
                            
                            // Apply rewind if enabled
                            if (autoDetectRewindSettings.enabled && autoDetectRewindSettings.amount > 0) {
                                const currentTime = audioPlayer.currentTime;
                                const newTime = Math.max(0, currentTime - autoDetectRewindSettings.amount);
                                audioPlayer.currentTime = newTime;
                                updateProgress();
                            }
                            
                            enhancedModeState = 'firstPause';
                            updateEnhancedModeStatus('firstPause');
                            console.log('[AutoDetect Enhanced] First pause detected - pausing playback');
                            
                            // Set auto-resume timeout for first pause
                            // If no typing happens for resumeDelay, resume automatically
                            autoResumeTimeout = setTimeout(() => {
                                if (enhancedModeState === 'firstPause' && wasPlayingBeforeTyping && !isPlaying) {
                                    play();
                                    wasPlayingBeforeTyping = false;
                                    enhancedModeState = 'idle';
                                    updateEnhancedModeStatus('idle');
                                    console.log('[AutoDetect Enhanced] Auto-resumed after no typing in first pause');
                                }
                            }, enhancedModeSettings.resumeDelay * 1000);
                        }
                    } else if (enhancedModeState === 'secondTyping') {
                        // Second pause detected - resume playback after resume delay
                        setTimeout(() => {
                            if (wasPlayingBeforeTyping && !isPlaying && enhancedModeState === 'secondTyping') {
                                play();
                                wasPlayingBeforeTyping = false;
                                enhancedModeState = 'idle';
                                updateEnhancedModeStatus('idle');
                                console.log('[AutoDetect Enhanced] Second pause detected - resuming playback');
                            }
                        }, enhancedModeSettings.resumeDelay * 1000);
                    }
                }, enhancedModeState === 'typing' ? 
                   enhancedModeSettings.firstPauseDelay * 1000 : 
                   enhancedModeSettings.secondPauseDelay * 1000); // Use appropriate delay
            }
        }
        
        
        /* ================================
           Stage 9: Pedal Integration Functions
           ================================ */
        
        // Pedal state variables
        let pedalDevice = null;
        let pedalConnected = false;
        // pedalEnabled is already declared in shortcuts section (line 1753)
        let continuousPressInterval = null;
        let previousButtonState = 0;  // Track previous HID state to detect changes
        let pedalMappings = {
            left: 'skipForward2.5',
            center: 'playPause',
            right: 'skipBackward2.5'
        };
        let pedalSettings = {
            enabled: true,
            continuousEnabled: true,
            continuousInterval: 0.5
        };
        
        // Rewind on Pause settings
        let rewindOnPauseSettings = {
            enabled: false,
            amount: 0.3
        };
        
        /**
         * Connect to HID pedal device
         * Location: Will move to modules/settings/pedal.js
         */
        async function connectPedal() {
            console.log('[Pedal] Attempting to connect...');
            
            try {
                // Check if WebHID is available
                if (!navigator.hid) {
                    console.error('[Pedal] WebHID API not available');
                    showPedalStatus('WebHID API לא זמין בדפדפן זה', 'error');
                    return;
                }
                
                // Request device from user
                const devices = await navigator.hid.requestDevice({
                    filters: []  // Accept any HID device for now
                });
                
                if (devices.length === 0) {
                    console.log('[Pedal] No device selected');
                    return;
                }
                
                pedalDevice = devices[0];
                console.log('[Pedal] Device selected:', pedalDevice.productName);
                
                // Open the device
                await pedalDevice.open();
                console.log('[Pedal] Device opened successfully');
                
                // Set up event listeners
                pedalDevice.addEventListener('inputreport', handlePedalInput);
                
                // Update UI
                pedalConnected = true;
                updatePedalConnectionUI(true);
                showPedalStatus('הדוושה חוברה בהצלחה', 'success');
                
                // Show mappings section
                document.getElementById('pedal-mappings').style.display = 'block';
                
                // Save device info for auto-reconnect
                savePedalDeviceInfo(pedalDevice);
                
            } catch (error) {
                console.error('[Pedal] Connection error:', error);
                showPedalStatus('שגיאה בחיבור הדוושה', 'error');
            }
        }
        
        /**
         * Save pedal device info for auto-reconnect
         */
        function savePedalDeviceInfo(device) {
            if (!device) return;
            
            const deviceInfo = {
                vendorId: device.vendorId,
                productId: device.productId,
                productName: device.productName
            };
            
            localStorage.setItem('mediaPedalDeviceInfo', JSON.stringify(deviceInfo));
            console.log('[Pedal] Device info saved for auto-reconnect:', deviceInfo);
        }
        
        /**
         * Attempt to auto-reconnect to previously connected pedal
         */
        async function attemptPedalAutoReconnect() {
            const savedDeviceInfo = localStorage.getItem('mediaPedalDeviceInfo');
            if (!savedDeviceInfo) return;
            
            try {
                const deviceInfo = JSON.parse(savedDeviceInfo);
                console.log('[Pedal] Attempting auto-reconnect to:', deviceInfo.productName);
                
                // Check if WebHID is available
                if (!navigator.hid) {
                    console.log('[Pedal] WebHID not available for auto-reconnect');
                    return;
                }
                
                // Get already paired devices
                const devices = await navigator.hid.getDevices();
                
                // Find matching device
                const matchingDevice = devices.find(d => 
                    d.vendorId === deviceInfo.vendorId && 
                    d.productId === deviceInfo.productId
                );
                
                if (matchingDevice) {
                    console.log('[Pedal] Found previously connected device, reconnecting...');
                    pedalDevice = matchingDevice;
                    
                    // Open the device
                    await pedalDevice.open();
                    console.log('[Pedal] Device reopened successfully');
                    
                    // Set up event listeners
                    pedalDevice.addEventListener('inputreport', handlePedalInput);
                    
                    // Update UI
                    pedalConnected = true;
                    updatePedalConnectionUI(true);
                    showPedalStatus('הדוושה חוברה מחדש אוטומטית', 'success');
                    
                    // Show mappings section
                    const mappingsSection = document.getElementById('pedal-mappings');
                    if (mappingsSection) {
                        mappingsSection.style.display = 'block';
                    }
                } else {
                    console.log('[Pedal] Previously connected device not found in paired devices');
                }
            } catch (error) {
                console.log('[Pedal] Auto-reconnect failed:', error);
                // Don't show error to user - this is silent auto-reconnect
            }
        }
        
        /**
         * Disconnect pedal device
         * Location: Will move to modules/settings/pedal.js
         */
        async function disconnectPedal() {
            console.log('[Pedal] Disconnecting...');
            
            if (pedalDevice) {
                try {
                    pedalDevice.removeEventListener('inputreport', handlePedalInput);
                    await pedalDevice.close();
                    console.log('[Pedal] Device closed');
                } catch (error) {
                    console.error('[Pedal] Error closing device:', error);
                }
            }
            
            pedalDevice = null;
            pedalConnected = false;
            updatePedalConnectionUI(false);
            showPedalStatus('הדוושה נותקה', 'info');
            
            // Hide mappings section
            document.getElementById('pedal-mappings').style.display = 'none';
            
            // Clear any continuous press
            if (continuousPressInterval) {
                clearInterval(continuousPressInterval);
                continuousPressInterval = null;
            }
            
            // Clear saved device info when manually disconnecting
            localStorage.removeItem('mediaPedalDeviceInfo');
        }
        
        /**
         * Handle pedal input events
         * Location: Will move to modules/settings/pedal.js
         */
        function handlePedalInput(event) {
            const { data, reportId } = event;
            console.log('[Pedal] Input received - Report ID:', reportId, 'Data:', data);
            
            // Parse the data to determine which button was pressed
            // This will vary depending on the specific pedal device
            // For now, we'll use a simple mapping based on common pedal behavior
            
            const view = new DataView(data.buffer);
            const buttonState = view.getUint8(0);
            
            // RTL mapping: bit 0 = physical right (acts as left in RTL), bit 1 = center, bit 2 = physical left (acts as right in RTL)
            // Swapping the mapping so physical buttons match visual expectations
            const leftPressed = (buttonState & 0x04) !== 0;  // Bit 2 = physical left pedal
            const centerPressed = (buttonState & 0x02) !== 0;
            const rightPressed = (buttonState & 0x01) !== 0; // Bit 0 = physical right pedal
            
            // Check what changed from previous state
            const prevLeftPressed = (previousButtonState & 0x04) !== 0;
            const prevCenterPressed = (previousButtonState & 0x02) !== 0;
            const prevRightPressed = (previousButtonState & 0x01) !== 0;
            
            // Only send events when state CHANGES
            if (leftPressed !== prevLeftPressed) {
                handlePedalButton('left', leftPressed);
            }
            
            if (centerPressed !== prevCenterPressed) {
                handlePedalButton('center', centerPressed);
            }
            
            if (rightPressed !== prevRightPressed) {
                handlePedalButton('right', rightPressed);
            }
            
            // Update previous state for next comparison
            previousButtonState = buttonState;
        }
        
        /**
         * Handle individual pedal button press/release
         * Location: Will move to modules/settings/pedal.js
         */
        function handlePedalButton(button, pressed) {
            console.log(`[Pedal] Button ${button} ${pressed ? 'pressed' : 'released'}`);
            
            // Update test display
            const testButton = document.getElementById(`test-${button}`);
            if (testButton) {
                if (pressed) {
                    testButton.classList.add('active');
                } else {
                    testButton.classList.remove('active');
                }
            }
            
            // Update visual pedal display
            const visualButton = document.querySelector(`.pedal-button-visual[data-button="${button}"] .pedal-button-circle`);
            if (visualButton) {
                if (pressed) {
                    visualButton.classList.add('active');
                } else {
                    visualButton.classList.remove('active');
                }
            }
            
            // Check if pedal is enabled
            if (!pedalEnabled) {
                console.log('[Pedal] Pedal is disabled, ignoring input');
                return;
            }
            
            // Get the mapped action
            const action = pedalMappings[button];
            if (!action || action === 'none') {
                return;
            }
            
            // Handle press/release
            if (pressed) {
                // Execute the action
                executePedalAction(action);
                
                // Start continuous press if enabled and action is a skip action
                if (pedalSettings.continuousEnabled && 
                    (action.startsWith('skipForward') || action.startsWith('skipBackward'))) {
                    startContinuousPress(action);
                }
            } else {
                // Stop continuous press
                if (continuousPressInterval) {
                    clearInterval(continuousPressInterval);
                    continuousPressInterval = null;
                }
            }
        }
        
        /**
         * Execute pedal action
         * Location: Will move to modules/settings/pedal.js
         */
        function executePedalAction(action) {
            console.log('[Pedal] Executing action:', action);
            
            switch (action) {
                case 'playPause':
                    togglePlayPause();
                    break;
                case 'skipForward':
                    skipForward(2.5);
                    break;
                case 'skipBackward':
                    skipBackward(2.5);
                    break;
                case 'skipForward2.5':
                    skipForward(2.5);
                    break;
                case 'skipBackward2.5':
                    skipBackward(2.5);
                    break;
                case 'skipForward5':
                    skipForward(5);
                    break;
                case 'skipBackward5':
                    skipBackward(5);
                    break;
                case 'skipForward10':
                    skipForward(10);
                    break;
                case 'skipBackward10':
                    skipBackward(10);
                    break;
                case 'speedUp':
                    adjustSpeed(25);  // 0.25x in slider units (25/100)
                    break;
                case 'speedDown':
                    adjustSpeed(-25);  // -0.25x in slider units
                    break;
                case 'volumeUp':
                    adjustVolume(10);  // 10% volume increase
                    break;
                case 'volumeDown':
                    adjustVolume(-10);  // 10% volume decrease
                    break;
                case 'mute':
                    muteToggle();
                    break;
                case 'speedReset':
                    resetSpeed();
                    break;
                case 'jumpToStart':
                    jumpToStart();
                    break;
                case 'jumpToEnd':
                    jumpToEnd();
                    break;
                case 'toggleLoop':
                    // Loop functionality if implemented
                    break;
                case 'none':
                    // No action
                    break;
            }
        }
        
        /**
         * Start continuous press action
         * Location: Will move to modules/settings/pedal.js
         */
        function startContinuousPress(action) {
            // Clear any existing interval
            if (continuousPressInterval) {
                clearInterval(continuousPressInterval);
            }
            
            // Set up continuous action
            const intervalMs = pedalSettings.continuousInterval * 1000;
            continuousPressInterval = setInterval(() => {
                executePedalAction(action);
            }, intervalMs);
            
            console.log(`[Pedal] Continuous press started for ${action}, interval: ${intervalMs}ms`);
        }
        
        /**
         * Update pedal connection UI
         * Location: Will move to modules/settings/pedal.js
         */
        function updatePedalConnectionUI(connected) {
            const statusIcon = document.getElementById('pedal-status-icon');
            const statusText = document.getElementById('pedal-status-text');
            const connectBtn = document.getElementById('pedal-connect-btn');
            
            if (connected) {
                statusIcon.textContent = '🟢';
                statusText.textContent = 'מחובר';
                connectBtn.textContent = 'נתק דוושה';
                connectBtn.classList.add('disconnect');
            } else {
                statusIcon.textContent = '⚪';
                statusText.textContent = 'לא מחובר';
                connectBtn.textContent = 'התחבר לדוושה';
                connectBtn.classList.remove('disconnect');
            }
        }
        
        /**
         * Show pedal status message
         * Location: Will move to modules/settings/pedal.js
         */
        function showPedalStatus(message, type = 'info') {
            // For now, use the same status display as shortcuts
            // Later can create dedicated pedal status
            showMediaShortcutStatus(message);
        }
        
        /**
         * Save pedal settings to localStorage
         * Location: Will move to modules/settings/pedal.js
         */
        function savePedalSettings() {
            const settings = {
                enabled: pedalEnabled,
                mappings: pedalMappings,
                continuousEnabled: pedalSettings.continuousEnabled,
                continuousInterval: pedalSettings.continuousInterval
            };
            localStorage.setItem('mediaPlayerPedalSettings', JSON.stringify(settings));
            console.log('[Pedal] Settings saved:', settings);
        }
        
        /**
         * Load rewind on pause settings from localStorage
         * Location: Will move to modules/settings.js
         */
        function loadRewindOnPauseSettings() {
            const saved = localStorage.getItem('mediaPlayerRewindOnPause');
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    rewindOnPauseSettings = { ...rewindOnPauseSettings, ...settings };
                    console.log('[MediaPlayer] Loaded rewind settings:', rewindOnPauseSettings);
                } catch (error) {
                    console.error('[MediaPlayer] Error loading rewind settings:', error);
                }
            }
            
            // Update UI with loaded settings
            const checkboxes = [
                document.getElementById('rewindOnPauseEnabled'),
                document.getElementById('pedalRewindOnPauseEnabled'),
                document.getElementById('autoDetectRewindOnPauseEnabled')
            ];
            
            checkboxes.forEach(checkbox => {
                if (checkbox) checkbox.checked = rewindOnPauseSettings.enabled;
            });
            
            const inputs = [
                document.getElementById('rewindAmount'),
                document.getElementById('pedalRewindAmount'),
                document.getElementById('autoDetectRewindAmount')
            ];
            
            inputs.forEach(input => {
                if (input) input.value = rewindOnPauseSettings.amount;
            });
            
            // Update container states
            const containers = [
                document.getElementById('rewindAmountContainer'),
                document.getElementById('pedalRewindAmountContainer'),
                document.getElementById('autoDetectRewindAmountContainer')
            ];
            
            containers.forEach(container => {
                if (container) {
                    if (rewindOnPauseSettings.enabled) {
                        container.classList.remove('disabled');
                    } else {
                        container.classList.add('disabled');
                    }
                }
            });
        }
        
        /**
         * Load pedal settings from localStorage
         * Location: Will move to modules/settings/pedal.js
         */
        function loadPedalSettings() {
            const saved = localStorage.getItem('mediaPlayerPedalSettings');
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    pedalEnabled = settings.enabled !== undefined ? settings.enabled : true;
                    pedalMappings = settings.mappings || pedalMappings;
                    pedalSettings.continuousEnabled = settings.continuousEnabled !== undefined ? 
                        settings.continuousEnabled : true;
                    pedalSettings.continuousInterval = settings.continuousInterval || 0.5;
                    console.log('[Pedal] Settings loaded:', settings);
                    
                    // Update UI with loaded settings
                    updatePedalSettingsUI();
                } catch (error) {
                    console.error('[Pedal] Error loading settings:', error);
                }
            }
        }
        
        /**
         * Update pedal settings UI with current values
         * Location: Will move to modules/settings/pedal.js
         */
        function updatePedalSettingsUI() {
            // Update enabled toggle
            const enableToggle = document.getElementById('pedal-enabled-toggle');
            if (enableToggle) {
                enableToggle.checked = pedalEnabled;
            }
            
            // Update action selects
            document.getElementById('pedal-left-action').value = pedalMappings.left;
            document.getElementById('pedal-center-action').value = pedalMappings.center;
            document.getElementById('pedal-right-action').value = pedalMappings.right;
            
            // Update continuous settings
            document.getElementById('pedal-continuous-enabled').checked = pedalSettings.continuousEnabled;
            document.getElementById('pedal-continuous-interval').value = pedalSettings.continuousInterval;
            
            // Show/hide continuous config
            document.getElementById('pedal-continuous-config').style.display = 
                pedalSettings.continuousEnabled ? 'block' : 'none';
        }
        
        /**
         * Initialize pedal UI
         * Location: Will move to modules/settings/pedal.js
         */
        function initializePedalUI() {
            console.log('[Pedal] Initializing UI...');
            
            // Load saved settings
            loadPedalSettings();
            
            // Attempt auto-reconnect to previously connected device
            attemptPedalAutoReconnect();
            
            // Enable/disable toggle
            const enableToggle = document.getElementById('pedal-enabled-toggle');
            if (enableToggle) {
                enableToggle.addEventListener('change', (e) => {
                    pedalEnabled = e.target.checked;
                    savePedalSettings();
                    console.log('[Pedal] Enabled state:', pedalEnabled);
                    // Don't show message here - togglePedal already shows it
                });
            }
            
            // Connect button
            const connectBtn = document.getElementById('pedal-connect-btn');
            if (connectBtn) {
                connectBtn.addEventListener('click', async () => {
                    if (pedalConnected) {
                        await disconnectPedal();
                    } else {
                        await connectPedal();
                    }
                });
            }
            
            // Action selects
            ['left', 'center', 'right'].forEach(button => {
                const select = document.getElementById(`pedal-${button}-action`);
                if (select) {
                    select.addEventListener('change', (e) => {
                        pedalMappings[button] = e.target.value;
                        savePedalSettings();
                        console.log(`[Pedal] ${button} button mapped to:`, e.target.value);
                    });
                }
            });
            
            // Continuous settings
            const continuousCheckbox = document.getElementById('pedal-continuous-enabled');
            if (continuousCheckbox) {
                continuousCheckbox.addEventListener('change', (e) => {
                    pedalSettings.continuousEnabled = e.target.checked;
                    document.getElementById('pedal-continuous-config').style.display = 
                        e.target.checked ? 'block' : 'none';
                    savePedalSettings();
                });
            }
            
            const intervalInput = document.getElementById('pedal-continuous-interval');
            if (intervalInput) {
                intervalInput.addEventListener('change', (e) => {
                    pedalSettings.continuousInterval = parseFloat(e.target.value);
                    savePedalSettings();
                });
            }
            
            console.log('[Pedal] UI initialized');
        }
        
        /* ================================
           Stage 12: Collapsible Controls (New Feature)
           ================================ */
        
        // Collapse/Expand functionality
        let controlsCollapsed = false;
        let slidersCollapsed = false;
        
        /**
         * Toggle controls section visibility
         */
        function toggleControlsSection() {
            const controlsSection = document.getElementById('controlsSection');
            const controlsWrapper = document.getElementById('controlsWrapper');
            const toggleBtn = document.getElementById('controlsToggle');
            const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
            
            if (!controlsSection || !toggleBtn || !controlsWrapper) return;
            
            controlsCollapsed = !controlsCollapsed;
            
            if (controlsCollapsed) {
                controlsSection.classList.add('collapsed');
                controlsWrapper.classList.add('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▲';
                toggleBtn.title = 'הצג פקדי הפעלה';
            } else {
                controlsSection.classList.remove('collapsed');
                controlsWrapper.classList.remove('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▼';
                toggleBtn.title = 'הסתר פקדי הפעלה';
            }
            
            saveCollapseState();
            console.log('[MediaPlayer] Controls collapsed:', controlsCollapsed);
        }
        
        /**
         * Toggle sliders section visibility
         */
        function toggleSlidersSection() {
            const slidersContainer = document.getElementById('slidersContainer');
            const slidersWrapper = document.getElementById('slidersWrapper');
            const toggleBtn = document.getElementById('slidersToggle');
            const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
            
            if (!slidersContainer || !toggleBtn || !slidersWrapper) return;
            
            slidersCollapsed = !slidersCollapsed;
            
            if (slidersCollapsed) {
                slidersContainer.classList.add('collapsed');
                slidersWrapper.classList.add('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▲';
                toggleBtn.title = 'הצג בקרות עוצמה ומהירות';
            } else {
                slidersContainer.classList.remove('collapsed');
                slidersWrapper.classList.remove('collapsed');
                if (toggleIcon) toggleIcon.textContent = '▼';
                toggleBtn.title = 'הסתר בקרות עוצמה ומהירות';
                // Check for overflow when making visible
                setTimeout(checkSliderOverflow, 10);
            }
            
            saveCollapseState();
            console.log('[MediaPlayer] Sliders collapsed:', slidersCollapsed);
        }
        
        /**
         * Save collapse state to localStorage
         */
        function saveCollapseState() {
            const state = {
                controlsCollapsed: controlsCollapsed,
                slidersCollapsed: slidersCollapsed
            };
            localStorage.setItem('mediaPlayerCollapseState', JSON.stringify(state));
        }
        
        /**
         * Load collapse state from localStorage
         */
        function loadCollapseState() {
            const saved = localStorage.getItem('mediaPlayerCollapseState');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    
                    // Apply saved state
                    if (state.controlsCollapsed !== undefined && state.controlsCollapsed) {
                        controlsCollapsed = false; // Set to false first so toggle works
                        toggleControlsSection();
                    }
                    
                    if (state.slidersCollapsed !== undefined && state.slidersCollapsed) {
                        slidersCollapsed = false; // Set to false first so toggle works
                        toggleSlidersSection();
                    }
                    
                    console.log('[MediaPlayer] Loaded collapse state:', state);
                } catch (e) {
                    console.error('[MediaPlayer] Error loading collapse state:', e);
                }
            }
            
            // Auto-collapse on small screens if no saved state
            updateCollapseForScreenSize();
        }
        
        /**
         * Auto-collapse sections based on screen size
         */
        function updateCollapseForScreenSize() {
            const width = window.innerWidth;
            const saved = localStorage.getItem('mediaPlayerCollapseState');
            
            // Only auto-collapse if no saved preference
            if (!saved) {
                if (width < 768) {
                    // Small screen: collapse both by default
                    if (!controlsCollapsed) toggleControlsSection();
                    if (!slidersCollapsed) toggleSlidersSection();
                    console.log('[MediaPlayer] Auto-collapsed for small screen');
                }
            }
        }
        
        /**
         * Check if sliders are overflowing and stack them if needed
         */
        function checkSliderOverflow() {
            const slidersContainer = document.getElementById('slidersContainer');
            if (!slidersContainer || slidersContainer.style.display === 'none') return;
            
            const volumeGroup = slidersContainer.querySelector('.slider-group:first-child');
            const speedGroup = slidersContainer.querySelector('.slider-group:last-child');
            
            if (!volumeGroup || !speedGroup) return;
            
            // Get the actual available width of the container
            const containerWidth = slidersContainer.clientWidth;
            const containerPadding = parseInt(window.getComputedStyle(slidersContainer).paddingLeft) + 
                                    parseInt(window.getComputedStyle(slidersContainer).paddingRight);
            const availableWidth = containerWidth - containerPadding;
            
            // Get each element's minimum required width
            const volumeIcon = volumeGroup.querySelector('.slider-icon');
            const volumeSlider = volumeGroup.querySelector('.custom-slider');
            const volumeValue = volumeGroup.querySelector('.slider-value');
            const speedIcon = speedGroup.querySelector('.slider-icon');
            const speedSlider = speedGroup.querySelector('.custom-slider');
            const speedValue = speedGroup.querySelector('.slider-value');
            
            // Calculate minimum widths
            const minVolumeWidth = (volumeIcon ? volumeIcon.offsetWidth : 0) + 
                                  60 + // minimum slider width
                                  (volumeValue ? volumeValue.offsetWidth : 0) + 
                                  20; // gaps
            const minSpeedWidth = (speedIcon ? speedIcon.offsetWidth : 0) + 
                                 60 + // minimum slider width
                                 (speedValue ? speedValue.offsetWidth : 0) + 
                                 20; // gaps
            
            const totalMinimum = minVolumeWidth + minSpeedWidth + 20; // plus gap between groups
            
            // Also check if speed slider is cut off
            const speedRect = speedGroup.getBoundingClientRect();
            const containerRect = slidersContainer.getBoundingClientRect();
            const isSpeedCutOff = speedRect.right > containerRect.right;
            
            // Stack if minimum space not available or speed is cut off
            if (totalMinimum > availableWidth || isSpeedCutOff || containerWidth < 400) {
                slidersContainer.classList.add('stacked');
                console.log('[MediaPlayer] Sliders stacked - Width:', containerWidth, 'Needed:', totalMinimum);
                // Adjust video cube height if visible
                adjustVideoCubeHeight(true);
            } else {
                slidersContainer.classList.remove('stacked');
                // Reset video cube height if visible
                adjustVideoCubeHeight(false);
            }
        }
        
        /**
         * Adjust video cube height when sliders are stacked
         */
        function adjustVideoCubeHeight(isStacked) {
            if (!window.videoCube || !window.videoCube.container) return;
            
            const videoCube = window.videoCube.container;
            if (!videoCube.classList.contains('active')) return;
            
            // Only adjust if not manually resized
            if (!window.videoCube.hasBeenResized) {
                // Get the actual media player container height
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    const rect = mediaContainer.getBoundingClientRect();
                    let newHeight = rect.height;
                    
                    // Set bounds
                    if (newHeight < 200) newHeight = 200;
                    else if (newHeight > 450) newHeight = 450;
                    
                    videoCube.style.height = newHeight + 'px';
                    console.log('[VideoCube] Adjusted height for stacked sliders:', newHeight, 'px (isStacked:', isStacked, ')');
                }
            }
        }
        
        /**
         * Initialize collapse functionality
         */
        function initializeCollapsible() {
            // Add event listeners to toggle buttons
            const controlsToggle = document.getElementById('controlsToggle');
            const slidersToggle = document.getElementById('slidersToggle');
            
            if (controlsToggle) {
                controlsToggle.addEventListener('click', toggleControlsSection);
            }
            
            if (slidersToggle) {
                slidersToggle.addEventListener('click', toggleSlidersSection);
            }
            
            // Load saved state
            loadCollapseState();
            
            // Listen for window resize
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    updateCollapseForScreenSize();
                    checkSliderOverflow();
                }, 250);
            });
            
            // Initial overflow check
            setTimeout(checkSliderOverflow, 100);
            
            console.log('[MediaPlayer] Collapsible controls initialized');
        }
        
        /* ================================
           Stage 11: Video Cube Implementation
           ================================ */

        class VideoCube {
            constructor() {
                this.container = null;
                this.video = null;
                this.header = null;
                this.controls = null;
                this.resizeHandle = null;
                this.isDragging = false;
                this.isResizing = false;
                this.isMinimized = false;
                this.isHidden = false;
                this.dragOffset = { x: 0, y: 0 };
                this.resizeStart = { x: 0, y: 0, width: 0, height: 0 };
                this.savedPosition = null;
                this.restoreButton = null;
                this.defaultPosition = null;
                this.hasBeenDragged = false; // Track if user manually positioned
                this.hasBeenResized = false; // Track if user manually resized
                this.resizeTimeout = null;
                
                this.init();
            }
            
            init() {
                // Wait for DOM ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.createVideoCube());
                } else {
                    this.createVideoCube();
                }
            }
            
            createVideoCube() {
                // Create video cube container
                this.container = document.createElement('div');
                this.container.className = 'video-cube';
                this.container.id = 'videoCube';
                // Remove any default positioning
                this.container.style.right = '';
                this.container.style.bottom = '';
                
                // Create header
                this.header = document.createElement('div');
                this.header.className = 'video-cube-header';
                this.header.innerHTML = `
                    <div class="video-cube-title">וידאו</div>
                    <div class="video-cube-controls">
                        <button class="video-control-btn restore-to-default-btn" title="החזר למיקום ברירת מחדל">⤴</button>
                        <button class="video-control-btn minimize-btn" title="מזער">_</button>
                        <button class="video-control-btn close-btn" title="סגור">×</button>
                    </div>
                `;
                
                // Create video element
                this.video = document.createElement('video');
                this.video.className = 'video-cube-video';
                this.video.controls = false;
                this.video.muted = true; // Video is muted, audio plays through audio element
                
                // Create resize handle
                this.resizeHandle = document.createElement('div');
                this.resizeHandle.className = 'video-cube-resize-handle';
                
                // Assemble cube
                this.container.appendChild(this.header);
                this.container.appendChild(this.video);
                this.container.appendChild(this.resizeHandle);
                
                // Add to page body (fixed position)
                document.body.appendChild(this.container);
                
                // Get restore button reference
                this.restoreButton = document.getElementById('videoRestoreBtn');
                if (this.restoreButton) {
                    this.restoreButton.addEventListener('click', () => this.restore());
                }
                
                // Set up event handlers
                this.setupEventHandlers();
                
                // Set up resize observer to adjust video cube when media player changes size
                this.setupResizeObserver();
                
                // Expose to window
                window.videoCube = this;
                
                console.log('[VideoCube] Created successfully');
            }
            
            setupResizeObserver() {
                // Watch for media player container size changes
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer && window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(entries => {
                        // Only adjust if video cube is visible and not manually resized
                        if (this.container.classList.contains('active') && !this.hasBeenResized && !this.isDragging) {
                            // Get the actual bounding rect including padding
                            const rect = mediaContainer.getBoundingClientRect();
                            // Update video cube height to match media player
                            let newHeight = rect.height;
                            
                            // Set bounds
                            if (newHeight < 200) newHeight = 200;
                            else if (newHeight > 450) newHeight = 450;
                            
                            this.container.style.height = newHeight + 'px';
                            console.log('[VideoCube] ResizeObserver: Adjusted height to match media player:', newHeight, 'px (from rect:', rect.height, ')');
                        }
                    });
                    
                    resizeObserver.observe(mediaContainer);
                    console.log('[VideoCube] Resize observer attached to media container');
                }
            }
            
            setupEventHandlers() {
                // Drag functionality - only on header, not buttons
                this.header.addEventListener('mousedown', (e) => {
                    if (!e.target.classList.contains('video-control-btn')) {
                        this.startDrag(e);
                    }
                });
                
                // Resize functionality
                this.resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
                
                // Global mouse events
                document.addEventListener('mousemove', (e) => {
                    if (this.isDragging) this.drag(e);
                    else if (this.isResizing) this.resize(e);
                });
                
                document.addEventListener('mouseup', () => {
                    if (this.isDragging) this.endDrag();
                    else if (this.isResizing) this.endResize();
                });
                
                // Control buttons
                const minimizeBtn = this.header.querySelector('.minimize-btn');
                const closeBtn = this.header.querySelector('.close-btn');
                const restoreDefaultBtn = this.header.querySelector('.restore-to-default-btn');
                
                minimizeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.minimize();
                });
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeAndReset(); // Close and reset for next time
                });
                restoreDefaultBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.restoreToDefault();
                });
                
                // Video sync with audio
                this.syncWithAudio();
                
                // Window resize handler
                window.addEventListener('resize', () => {
                    // Clear existing timeout
                    if (this.resizeTimeout) {
                        clearTimeout(this.resizeTimeout);
                    }
                    
                    // Debounce resize events
                    this.resizeTimeout = setTimeout(() => {
                        // Only reposition if video cube is visible and not manually positioned
                        if (this.container && this.container.classList.contains('active')) {
                            console.log('[VideoCube] Window resized, checking reposition...', {
                                hasBeenDragged: this.hasBeenDragged,
                                isMinimized: this.isMinimized,
                                isHidden: this.isHidden,
                                isActive: this.container.classList.contains('active')
                            });
                            
                            // Always recalculate position on resize to maintain alignment
                            // Store current position first
                            const currentLeft = parseInt(this.container.style.left);
                            const currentTop = parseInt(this.container.style.top);
                            
                            // Get the media container's new position
                            const mediaContainer = document.querySelector('.media-player-container');
                            if (mediaContainer) {
                                const rect = mediaContainer.getBoundingClientRect();
                                
                                // If user hasn't dragged, always reposition
                                if (!this.hasBeenDragged) {
                                    this.setDefaultPosition();
                                } else {
                                    // Even if dragged, we need to ensure it's still visible
                                    // Check if cube would be off-screen
                                    const windowWidth = window.innerWidth;
                                    const windowHeight = window.innerHeight;
                                    const cubeWidth = parseInt(this.container.style.width) || 250;
                                    const cubeHeight = parseInt(this.container.style.height) || 250;
                                    
                                    // Adjust if off-screen
                                    if (currentLeft + cubeWidth > windowWidth) {
                                        this.container.style.left = Math.max(10, windowWidth - cubeWidth - 10) + 'px';
                                    }
                                    if (currentTop + cubeHeight > windowHeight) {
                                        this.container.style.top = Math.max(10, windowHeight - cubeHeight - 10) + 'px';
                                    }
                                    if (currentLeft < 0) {
                                        this.container.style.left = '10px';
                                    }
                                    if (currentTop < 0) {
                                        this.container.style.top = '10px';
                                    }
                                }
                            }
                        }
                    }, 150);
                });
            }
            
            syncWithAudio() {
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer) {
                    audioPlayer.addEventListener('play', () => {
                        if (this.video.src) {
                            this.video.play().catch(e => console.log('[VideoCube] Play failed:', e));
                        }
                    });
                    audioPlayer.addEventListener('pause', () => {
                        if (this.video.src) this.video.pause();
                    });
                    audioPlayer.addEventListener('timeupdate', () => {
                        if (this.video.src && Math.abs(this.video.currentTime - audioPlayer.currentTime) > 0.1) {
                            this.video.currentTime = audioPlayer.currentTime;
                        }
                    });
                    audioPlayer.addEventListener('seeked', () => {
                        if (this.video.src) this.video.currentTime = audioPlayer.currentTime;
                    });
                }
            }
            
            startDrag(e) {
                if (this.isMinimized) return;
                this.isDragging = true;
                this.container.classList.add('dragging');
                const rect = this.container.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                e.preventDefault();
            }
            
            drag(e) {
                if (!this.isDragging) return;
                const newX = e.clientX - this.dragOffset.x;
                const newY = e.clientY - this.dragOffset.y;
                const maxX = window.innerWidth - this.container.offsetWidth;
                const maxY = window.innerHeight - this.container.offsetHeight;
                
                // Clear any right positioning to avoid conflicts
                this.container.style.right = '';
                this.container.style.position = 'fixed';
                this.container.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
                this.container.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
                e.preventDefault();
            }
            
            endDrag() {
                this.isDragging = false;
                this.container.classList.remove('dragging');
                this.hasBeenDragged = true; // Mark that user has manually positioned
            }
            
            startResize(e) {
                if (this.isMinimized) return;
                this.isResizing = true;
                this.container.classList.add('resizing');
                const rect = this.container.getBoundingClientRect();
                this.resizeStart = {
                    x: e.clientX,
                    y: e.clientY,
                    width: rect.width,
                    height: rect.height
                };
                e.preventDefault();
                e.stopPropagation();
            }
            
            resize(e) {
                if (!this.isResizing) return;
                const deltaX = e.clientX - this.resizeStart.x;
                const deltaY = e.clientY - this.resizeStart.y;
                
                // Increase max size limits and calculate based on window size
                const maxWidth = Math.min(window.innerWidth - 100, 1200); // Max 1200px or window width - 100px
                const maxHeight = Math.min(window.innerHeight - 100, 1200); // Max 1200px or window height - 100px
                
                const newWidth = Math.max(150, Math.min(maxWidth, this.resizeStart.width + deltaX));
                const newHeight = Math.max(150, Math.min(maxHeight, this.resizeStart.height + deltaY));
                
                this.container.style.width = newWidth + 'px';
                this.container.style.height = newHeight + 'px';
                e.preventDefault();
            }
            
            endResize() {
                this.isResizing = false;
                this.container.classList.remove('resizing');
                // Mark as manually resized
                this.hasBeenResized = true;
            }
            
            loadVideo(src) {
                console.log('[VideoCube] Loading video:', src);
                this.video.src = src;
                this.video.load();
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && audioPlayer.currentTime) {
                    this.video.currentTime = audioPlayer.currentTime;
                }
                // Reset to default size before showing
                this.container.style.width = '250px';
                this.container.style.height = '250px';
                // Show the video cube
                this.show();
            }
            
            show() {
                if (this.isMinimized) {
                    this.restore();
                } else {
                    // Add class to media player container to shrink it FIRST
                    const mediaContainer = document.querySelector('.media-player-container');
                    if (mediaContainer) {
                        mediaContainer.classList.add('video-active');
                        console.log('[VideoCube] Added video-active class to media-player-container');
                    }
                    
                    // Show the video cube
                    this.container.classList.add('active');
                    // Always set default position when showing
                    this.container.style.width = '250px';
                    this.container.style.height = '250px';
                    this.hasBeenDragged = false; // Reset since we're showing fresh
                    
                    // Delay position setting to ensure media container has shrunk
                    setTimeout(() => {
                        this.setDefaultPosition();
                        // Check slider overflow after container shrinks
                        setTimeout(checkSliderOverflow, 50);
                    }, 150);
                    
                    if (this.restoreButton) this.restoreButton.style.display = 'none';
                }
            }
            
            hide() {
                this.container.classList.remove('active');
                // Don't clear video source so we can restore later
                // this.video.src = '';
                
                // Show restore button when hiding
                if (this.restoreButton) {
                    this.restoreButton.style.display = 'flex';
                    console.log('[VideoCube] Hidden, restore button shown');
                }
                
                // Remove class from media player container
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    mediaContainer.classList.remove('video-active');
                    console.log('[VideoCube] Removed video-active class from media-player-container');
                    // Check slider overflow after container expands
                    setTimeout(checkSliderOverflow, 50);
                }
                
                // Mark as hidden (different from minimized)
                this.isHidden = true;
            }
            
            minimize() {
                const rect = this.container.getBoundingClientRect();
                this.savedPosition = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
                this.isMinimized = true;
                this.container.classList.remove('active');
                if (this.restoreButton) {
                    this.restoreButton.style.display = 'flex';
                    console.log('[VideoCube] Minimized, restore button shown');
                }
                // Remove video-active class to restore media container to full width
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    mediaContainer.classList.remove('video-active');
                }
            }
            
            close() {
                this.isMinimized = false;
                this.savedPosition = null;
                this.container.classList.remove('active');
                if (this.restoreButton) this.restoreButton.style.display = 'none';
                this.video.src = '';
            }
            
            closeAndReset() {
                // Reset to default size and position FIRST while media container is still shrunk
                this.container.style.width = '250px';
                this.container.style.height = '250px';
                this.setDefaultPosition();
                
                // Then hide the video cube
                this.container.classList.remove('active');
                
                // Clear saved position so next restore uses defaults
                this.savedPosition = null;
                this.isMinimized = false;
                this.isHidden = true;
                this.hasBeenDragged = false; // Reset manual positioning flag
                
                // Show restore button
                if (this.restoreButton) {
                    this.restoreButton.style.display = 'flex';
                    console.log('[VideoCube] Closed with reset, restore button shown');
                }
                
                // Remove video-active class to restore media container width
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    mediaContainer.classList.remove('video-active');
                }
            }
            
            restore() {
                this.isMinimized = false;
                this.isHidden = false;
                
                // First, shrink the media player container
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    mediaContainer.classList.add('video-active');
                }
                
                // Show the video cube
                this.container.classList.add('active');
                
                // If we have saved position (from minimize), use it
                // Otherwise use default position (from close/X button)
                if (this.savedPosition) {
                    this.container.style.left = this.savedPosition.left + 'px';
                    this.container.style.top = this.savedPosition.top + 'px';
                    this.container.style.width = this.savedPosition.width + 'px';
                    this.container.style.height = this.savedPosition.height + 'px';
                } else {
                    // Reset to default (after X button was used)
                    this.container.style.width = '250px';
                    this.container.style.height = '250px';
                    // Delay position setting to ensure media container has resized
                    setTimeout(() => {
                        this.setDefaultPosition();
                    }, 50);
                }
                
                if (this.restoreButton) this.restoreButton.style.display = 'none';
            }
            
            restoreToDefault() {
                // Reset to default size and position
                this.container.style.width = '250px';
                this.container.style.height = '250px';
                this.setDefaultPosition();
                // Make sure it's visible
                if (!this.container.classList.contains('active')) {
                    this.container.classList.add('active');
                }
                this.isMinimized = false;
                this.isHidden = false;
                this.hasBeenDragged = false; // Reset manual positioning flag
                this.hasBeenResized = false; // Reset manual resizing flag
                if (this.restoreButton) {
                    this.restoreButton.style.display = 'none';
                }
                // Check if sliders are stacked and adjust height accordingly
                const slidersContainer = document.getElementById('slidersContainer');
                if (slidersContainer && slidersContainer.classList.contains('stacked')) {
                    this.container.style.height = '290px';
                }
                // Make sure media container is shrunk
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    mediaContainer.classList.add('video-active');
                }
                console.log('[VideoCube] Restored to default size and position');
            }
            
            setDefaultPosition() {
                const mediaContainer = document.querySelector('.media-player-container');
                if (mediaContainer) {
                    const rect = mediaContainer.getBoundingClientRect();
                    this.container.style.position = 'fixed';
                    
                    // Clear any right property that might interfere
                    this.container.style.right = '';
                    
                    // Get window dimensions
                    const windowWidth = window.innerWidth;
                    const cubeWidth = 250;
                    const gap = 10;
                    
                    // When video-active class is applied, the media player shifts right by 260px
                    // So the video cube should go in the vacant space on the left
                    // The vacant space starts at rect.left - 260px
                    
                    if (mediaContainer.classList.contains('video-active')) {
                        // Media player has been shifted right, position in the vacant space
                        // The vacant space is 260px wide (250px cube + 10px gap)
                        // Position at the start of the vacant area
                        const vacantSpaceLeft = rect.left - 260;
                        this.container.style.left = (vacantSpaceLeft > gap ? vacantSpaceLeft : gap) + 'px';
                    } else {
                        // Fallback: position to the left of media player
                        let leftPosition = rect.left - cubeWidth - gap;
                        
                        // Check if there's enough space on the left
                        if (leftPosition >= gap) {
                            this.container.style.left = leftPosition + 'px';
                        } else {
                            // If not enough space on left, position at the edge
                            this.container.style.left = gap + 'px';
                        }
                    }
                    
                    // Align with the top of the media player
                    this.container.style.top = rect.top + 'px';
                    this.container.style.width = cubeWidth + 'px';
                    
                    // Dynamically match the height of the media player container
                    // This handles when sliders stack vertically on small screens
                    let mediaHeight = rect.height;
                    
                    // Set reasonable bounds
                    // Min height for basic visibility
                    if (mediaHeight < 200) {
                        mediaHeight = 200;
                    }
                    // Max height - allow it to grow more when sliders stack
                    else if (mediaHeight > 450) {
                        mediaHeight = 450;
                    }
                    
                    this.container.style.height = mediaHeight + 'px';
                    console.log('[VideoCube] Setting height to match media player:', mediaHeight, 'px (media rect height:', rect.height, ')');
                    
                    console.log('[VideoCube] Positioned at:', {
                        left: this.container.style.left,
                        top: this.container.style.top,
                        mediaRect: rect,
                        hasVideoActive: mediaContainer.classList.contains('video-active'),
                        windowWidth: windowWidth
                    });
                } else {
                    this.container.style.position = 'fixed';
                    this.container.style.right = '';
                    this.container.style.left = '20px';
                    this.container.style.top = '100px';
                    this.container.style.width = '250px';
                    this.container.style.height = '250px';
                    console.log('[VideoCube] Media container not found, using fallback position');
                }
            }
        }

        // Initialize video cube variable
        let videoCube = null;
        
        /**
         * Initialize media player
         * Location: Will move to main.js
         */
        function initializeMediaPlayer() {
            console.log('[MediaPlayer] Initializing...');
            
            // Get all DOM elements after DOM is ready
            audioPlayer = document.getElementById('audioPlayer');
            playPauseBtn = document.getElementById('playPauseBtn');
            playIcon = document.getElementById('playIcon');
            loadingDisplay = document.getElementById('loadingDisplay');
            controlsSection = document.getElementById('controlsSection');
            statusIndicator = document.getElementById('statusIndicator');
            statusText = document.getElementById('statusText');
            audioState = document.getElementById('audioState');
            
            // Stage 3: Progress bar elements
            progressContainer = document.getElementById('progressContainer');
            progressBar = document.getElementById('progressBar');
            progressFill = document.getElementById('progressFill');
            currentTimeDisplay = document.getElementById('currentTime');
            totalTimeDisplay = document.getElementById('totalTime');
            
            // Stage 5: Control button elements
            forward5Btn = document.getElementById('forward5Btn');
            forward2_5Btn = document.getElementById('forward2_5Btn');
            rewind2_5Btn = document.getElementById('rewind2_5Btn');
            rewind5Btn = document.getElementById('rewind5Btn');
            
            // Stage 6: Slider elements
            slidersContainer = document.getElementById('slidersContainer');
            volumeSlider = document.getElementById('volumeSlider');
            volumeValue = document.getElementById('volumeValue');
            volumeIcon = document.getElementById('volumeIcon');
            speedSlider = document.getElementById('speedSlider');
            speedValue = document.getElementById('speedValue');
            speedIcon = document.getElementById('speedIcon');
            
            // Stage 7: Settings modal elements
            settingsBtn = document.getElementById('settingsBtn');
            modalOverlay = document.getElementById('modalOverlay');
            modalClose = document.getElementById('modalClose');
            tabButtons = document.querySelectorAll('.settings-tab-btn');
            tabContents = document.querySelectorAll('.settings-tab-content');
            
            console.log('[MediaPlayer] Modal elements found:', {
                settingsBtn: !!settingsBtn,
                modalOverlay: !!modalOverlay,
                modalClose: !!modalClose,
                tabButtons: tabButtons.length
            });
            
            // Hide loading, show all sections
            loadingDisplay.style.display = 'none';
            controlsSection.style.display = 'flex';
            progressContainer.style.display = 'block';
            slidersContainer.style.display = 'flex';
            
            // Set up event listeners
            playPauseBtn.addEventListener('click', togglePlayPause);
            
            // Stage 3: Progress bar event listeners
            progressBar.addEventListener('click', handleProgressClick);
            progressBar.addEventListener('mousedown', startProgressDrag);
            
            // Stage 4: Time display event listeners
            // Current time - click to jump to start, right-click to edit
            currentTimeDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                jumpToStart();
            });
            
            currentTimeDisplay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                enableTimeEdit(currentTimeDisplay);
            });
            
            // Total time - click to jump to end, right-click to edit
            totalTimeDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                jumpToEnd();
            });
            
            totalTimeDisplay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                enableTimeEdit(totalTimeDisplay);
            });
            
            // Stage 5: Control button event listeners
            forward5Btn.addEventListener('click', () => skipForward(5));
            forward2_5Btn.addEventListener('click', () => skipForward(2.5));
            rewind2_5Btn.addEventListener('click', () => skipBackward(2.5));
            rewind5Btn.addEventListener('click', () => skipBackward(5));
            
            // Stage 6: Slider event listeners
            volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
            volumeIcon.addEventListener('click', toggleMute);
            speedSlider.addEventListener('input', (e) => setSpeed(e.target.value));
            
            // Speed icon click handling with double-click detection
            let speedClickTimer = null;
            speedIcon.addEventListener('click', function(e) {
                if (speedClickTimer) {
                    // Double click detected
                    clearTimeout(speedClickTimer);
                    speedClickTimer = null;
                    resetSpeed();
                } else {
                    // Single click - wait to see if it's a double click
                    speedClickTimer = setTimeout(function() {
                        speedClickTimer = null;
                        cycleSpeed();
                    }, 250);
                }
            });
            
            // Stage 7: Settings modal event listeners
            if (settingsBtn) {
                settingsBtn.addEventListener('click', openSettingsModal);
                console.log('[MediaPlayer] Settings button listener added');
            } else {
                console.error('[MediaPlayer] Settings button not found!');
            }
            
            if (modalClose) {
                modalClose.addEventListener('click', closeSettingsModal);
                console.log('[MediaPlayer] Modal close button listener added');
            } else {
                console.error('[MediaPlayer] Modal close button not found!');
            }
            
            // Click overlay to close
            if (modalOverlay) {
                modalOverlay.addEventListener('click', function(e) {
                    console.log('[MediaPlayer] Overlay clicked, target:', e.target.id);
                    if (e.target === modalOverlay || e.target.id === 'modalOverlay') {
                        closeSettingsModal();
                    }
                });
                console.log('[MediaPlayer] Overlay click listener added');
            } else {
                console.error('[MediaPlayer] Modal overlay not found for click listener!');
            }
            
            // Tab switching
            if (tabButtons) {
                tabButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        switchTab(this.dataset.tab);
                    });
                });
            }
            
            // Stage 8: Initialize keyboard shortcuts
            loadMediaShortcuts();
            
            // Load rewind on pause settings
            loadRewindOnPauseSettings();
            
            // Initialize auto-detect functionality
            initializeAutoDetect();
            
            // Add global keyboard listener
            document.addEventListener('keydown', handleKeyPress);
            
            // Setup shortcuts configuration UI
            setupMediaShortcutUI();
            
            console.log('[MediaPlayer] Keyboard shortcuts initialized');
            
            // Initialize pedal UI (Stage 9)
            initializePedalUI();
            
            // Initialize collapsible controls (Stage 12)
            initializeCollapsible();
            
            // Check for slider overflow after initialization
            setTimeout(checkSliderOverflow, 200);
            
            // Watch for video-active class changes on media container
            const mediaContainer = document.querySelector('.media-player-container');
            if (mediaContainer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            // Container class changed, check overflow
                            setTimeout(checkSliderOverflow, 100);
                        }
                    });
                });
                observer.observe(mediaContainer, { attributes: true, attributeFilter: ['class'] });
            }
            
            // Initialize VideoCube (Stage 11)
            console.log('[MediaPlayer] Initializing VideoCube...');
            window.videoCube = new VideoCube();
            console.log('[MediaPlayer] VideoCube initialized');
            
            // Audio element events
            audioPlayer.addEventListener('loadedmetadata', () => {
                console.log('[MediaPlayer] Metadata loaded, duration:', audioPlayer.duration);
                isReady = true;
                updateStatus('ready', 'Ready to play');
                
                // Initialize time displays
                totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
                currentTimeDisplay.textContent = formatTime(0);
            });
            
            // Also mark ready on canplay event as backup
            audioPlayer.addEventListener('canplay', () => {
                if (!isReady) {
                    console.log('[MediaPlayer] Can play - marking as ready');
                    isReady = true;
                    updateStatus('ready', 'Ready to play');
                }
            });
            
            // Add loadstart event to track when loading begins
            audioPlayer.addEventListener('loadstart', () => {
                console.log('[MediaPlayer] Load started');
                isReady = false;
                updateStatus('loading', 'Loading media...');
            });
            
            // Add canplaythrough for better readiness detection
            audioPlayer.addEventListener('canplaythrough', () => {
                if (!isReady) {
                    console.log('[MediaPlayer] Can play through - marking as ready');
                    isReady = true;
                    updateStatus('ready', 'Ready to play');
                    
                    // Update time displays if not already done
                    if (totalTimeDisplay && !totalTimeDisplay.textContent || totalTimeDisplay.textContent === '00:00:00') {
                        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
                        currentTimeDisplay.textContent = formatTime(0);
                    }
                }
            });
            
            audioPlayer.addEventListener('timeupdate', updateProgress);
            
            audioPlayer.addEventListener('play', () => {
                console.log('[MediaPlayer] Play event');
                isPlaying = true;
                updatePlayPauseButton(true);
                updateStatus('playing', 'Playing');
            });
            
            audioPlayer.addEventListener('pause', () => {
                console.log('[MediaPlayer] Pause event');
                isPlaying = false;
                updatePlayPauseButton(false);
                updateStatus('paused', 'Paused');
            });
            
            audioPlayer.addEventListener('ended', () => {
                console.log('[MediaPlayer] Playback ended');
                isPlaying = false;
                updatePlayPauseButton(false);
                updateStatus('ended', 'Playback ended');
                
                // Reset progress bar
                progressFill.style.width = '0%';
                currentTimeDisplay.textContent = formatTime(0);
            });
            
            audioPlayer.addEventListener('error', (e) => {
                console.error('[MediaPlayer] Audio error:', e);
                console.error('[MediaPlayer] Error details:', {
                    code: audioPlayer.error?.code,
                    message: audioPlayer.error?.message,
                    src: audioPlayer.src,
                    networkState: audioPlayer.networkState,
                    readyState: audioPlayer.readyState
                });
                
                // Provide specific error messages
                let errorMsg = 'Error loading audio';
                if (audioPlayer.error) {
                    switch(audioPlayer.error.code) {
                        case 1: errorMsg = 'Media loading aborted'; break;
                        case 2: errorMsg = 'Network error'; break;
                        case 3: errorMsg = 'Media decoding error'; break;
                        case 4: errorMsg = 'Media format not supported'; break;
                    }
                }
                
                isReady = false;
                updateStatus('error', errorMsg);
            });
            
            console.log('[MediaPlayer] Initialization complete with progress bar');
            updateStatus('ready', 'Ready - Load a file to play');
            
            // Expose media player API globally for navigation integration
            window.mediaPlayer = {
                loadFiles: function(files, projectId) {
                    console.log('[MediaPlayer] loadFiles called with:', files, projectId);
                    
                    // Call the navigation's loadMediaFiles function if it exists
                    if (window.loadMediaFiles && typeof window.loadMediaFiles === 'function') {
                        console.log('[MediaPlayer] Delegating to navigation loadMediaFiles');
                        window.loadMediaFiles(files, projectId);
                    } else {
                        // Fallback: just load the first file directly
                        console.log('[MediaPlayer] Navigation not ready, loading first file directly');
                        if (files && files.length > 0) {
                            const firstFile = files[0];
                            // Use the correct path property based on what's available
                            const filePath = firstFile.stream_url || firstFile.full_path || firstFile.path;
                            if (filePath) {
                                loadMedia(filePath, firstFile.original_name || firstFile.filename || 'Media File', 'audio');
                            }
                        }
                    }
                },
                // Additional methods for compatibility
                loadMedia: loadMedia,
                play: play,
                pause: pause,
                togglePlayPause: togglePlayPause,
                getCurrentTime: () => audioPlayer ? audioPlayer.currentTime : 0,
                setCurrentTime: (time) => { if (audioPlayer) audioPlayer.currentTime = time; },
                getDuration: () => audioPlayer ? audioPlayer.duration : 0,
                seekTo: seekTo,
                skipForward: skipForward,
                skipBackward: skipBackward,
                setVolume: setVolume,
                setSpeed: setSpeed,
                toggleMute: toggleMute,
                resetSpeed: resetSpeed,
                // Navigation-specific properties
                files: [],
                currentIndex: 0,
                projectId: null,
                isLoading: false
            };
            
            // Expose toggle functions globally for HTML onchange handlers
            window.toggleAutoDetect = toggleAutoDetect;
            window.togglePedal = togglePedal;
            window.toggleAutoDetectRewind = toggleAutoDetectRewind;
            window.updateAutoDetectRewindAmount = updateAutoDetectRewindAmount;
            window.toggleRewindOnPause = toggleRewindOnPause;
            window.updateRewindAmount = updateRewindAmount;
            window.toggleShortcutsEnabled = toggleShortcutsEnabled;
            
            // Final initialization log
            
            // Don't auto-load test audio - wait for navigation to load files
            // loadTestAudio();
        }
        
        /**
         * Load test audio for development
         * Temporary function for testing
         */
        function loadTestAudio() {
            // Using a public domain audio file for testing
            const testAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            console.log('[MediaPlayer] Loading test audio:', testAudioUrl);
            loadMedia(testAudioUrl, 'test-audio.mp3', 'audio/mp3');
        }
        
        /* ================================
           Stage 4: Time Display Edit Functions
           ================================ */
        
        /**
         * Parse time string (HH:MM:SS) to seconds
         * Location: Will move to modules/time-display.js
         */
        function parseTime(timeString) {
            const parts = timeString.split(':');
            if (parts.length !== 3) return null;
            
            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
            if (minutes >= 60 || seconds >= 60) return null;
            
            return hours * 3600 + minutes * 60 + seconds;
        }
        
        /**
         * Enable time display editing with input masking
         * Location: Will move to modules/time-display.js
         */
        function enableTimeEdit(element) {
            console.log('[MediaPlayer] Enabling time edit for:', element.id);
            
            const originalText = element.textContent;
            
            // Create input element with time value
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalText;
            input.className = 'time-input-mask';
            input.style.cssText = element.style.cssText;
            input.style.width = '80px';
            input.style.textAlign = 'center';
            input.style.font = window.getComputedStyle(element).font;
            input.style.background = 'rgba(32, 201, 151, 0.2)';
            input.style.border = '1px solid rgba(32, 201, 151, 0.5)';
            input.style.borderRadius = '4px';
            input.style.color = 'white';
            input.style.padding = '4px 8px';
            
            // Replace span with input
            element.style.display = 'none';
            element.parentNode.insertBefore(input, element.nextSibling);
            
            // Focus and select all
            input.focus();
            input.select();
            
            // Format input as user types
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
                
                // Limit to 6 digits (HHMMSS)
                if (value.length > 6) {
                    value = value.slice(0, 6);
                }
                
                // Format as HH:MM:SS
                if (value.length >= 4) {
                    value = value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4);
                } else if (value.length >= 2) {
                    value = value.slice(0, 2) + ':' + value.slice(2);
                }
                
                e.target.value = value;
            });
            
            const finishEdit = (save) => {
                // Check if input is still in DOM (might have been removed already)
                if (!input.parentNode) {
                    return;
                }
                
                if (save) {
                    const newTime = parseTime(input.value);
                    if (newTime !== null && newTime >= 0 && newTime <= audioPlayer.duration) {
                        audioPlayer.currentTime = newTime;
                        element.textContent = formatTime(newTime);
                        console.log('[MediaPlayer] Jumped to:', formatTime(newTime));
                    } else {
                        element.textContent = originalText;
                        console.warn('[MediaPlayer] Invalid time entered');
                    }
                } else {
                    element.textContent = originalText;
                }
                
                // Remove input and show span again
                if (input.parentNode) {
                    input.remove();
                }
                element.style.display = '';
            };
            
            // Handle keyboard events
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEdit(true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    finishEdit(false);
                }
            });
            
            // Handle blur
            input.addEventListener('blur', function() {
                finishEdit(true);
            });
        }
        
        /**
         * Jump to start (00:00:00)
         * Location: Will move to modules/time-display.js
         */
        function jumpToStart() {
            console.log('[MediaPlayer] Jumping to start');
            audioPlayer.currentTime = 0;
            updateProgress();
        }
        
        /**
         * Jump to end
         * Location: Will move to modules/time-display.js
         */
        function jumpToEnd() {
            console.log('[MediaPlayer] Jumping to end');
            if (audioPlayer.duration) {
                audioPlayer.currentTime = audioPlayer.duration;
                updateProgress();
            }
        }
        
        /* ================================
           Stage 5: Control Button Functions
           ================================ */
        
        /**
         * Skip forward by specified seconds
         * RTL: Left arrow = forward
         * Location: Will move to modules/controls.js
         */
        function skipForward(seconds = 2.5) {
            if (!audioPlayer || !audioPlayer.duration || isNaN(audioPlayer.duration)) {
                console.warn('[MediaPlayer] Cannot skip - no audio loaded');
                return;
            }
            
            const newTime = Math.min(audioPlayer.currentTime + seconds, audioPlayer.duration);
            if (!isNaN(newTime) && isFinite(newTime)) {
                audioPlayer.currentTime = newTime;
                console.log('[MediaPlayer] Skipped forward', seconds, 'seconds to:', formatTime(newTime));
            }
        }
        
        /**
         * Skip backward by specified seconds
         * RTL: Right arrow = backward
         * Location: Will move to modules/controls.js
         */
        function skipBackward(seconds = 2.5) {
            if (!audioPlayer || !audioPlayer.duration || isNaN(audioPlayer.duration)) {
                console.warn('[MediaPlayer] Cannot skip - no audio loaded');
                return;
            }
            
            const newTime = Math.max(audioPlayer.currentTime - seconds, 0);
            if (!isNaN(newTime) && isFinite(newTime)) {
                audioPlayer.currentTime = newTime;
                console.log('[MediaPlayer] Skipped backward', seconds, 'seconds to:', formatTime(newTime));
            }
        }
        
        
        /* ================================
           Stage 6: Volume and Speed Functions
           ================================ */
        
        /**
         * Set volume
         * Location: Will move to modules/sliders.js
         */
        function setVolume(value) {
            const volume = value / 100;
            audioPlayer.volume = volume;
            volumeValue.textContent = value + '%';
            
            // Update icon based on volume
            if (value === 0) {
                volumeIcon.textContent = '🔇';
            } else if (value < 50) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
            
            console.log('[MediaPlayer] Volume set to:', value + '%');
        }
        
        /**
         * Toggle mute
         * Location: Will move to modules/sliders.js
         */
        function toggleMute() {
            if (isMuted) {
                // Unmute
                setVolume(previousVolume);
                volumeSlider.value = previousVolume;
                isMuted = false;
                volumeIcon.classList.remove('muted');
            } else {
                // Mute
                previousVolume = volumeSlider.value;
                setVolume(0);
                volumeSlider.value = 0;
                isMuted = true;
                volumeIcon.classList.add('muted');
            }
            console.log('[MediaPlayer] Mute toggled:', isMuted);
        }
        
        /**
         * Set playback speed
         * Location: Will move to modules/sliders.js
         */
        function setSpeed(value) {
            const speed = value / 100;
            audioPlayer.playbackRate = speed;
            speedValue.textContent = speed.toFixed(1) + 'x';
            speedSlider.value = value;
            console.log('[MediaPlayer] Speed set to:', speed + 'x');
        }
        
        /**
         * Cycle through speed presets on click
         * Location: Will move to modules/sliders.js
         */
        function cycleSpeed() {
            const currentSpeed = parseInt(speedSlider.value);
            let nextSpeed;
            
            // Cycle through: 1.0 -> 1.25 -> 1.5 -> 1.75 -> 2.0 -> 0.75 -> 1.0
            if (currentSpeed <= 75) {
                nextSpeed = 100; // 0.75x -> 1.0x
            } else if (currentSpeed <= 100) {
                nextSpeed = 125; // 1.0x -> 1.25x
            } else if (currentSpeed <= 125) {
                nextSpeed = 150; // 1.25x -> 1.5x
            } else if (currentSpeed <= 150) {
                nextSpeed = 175; // 1.5x -> 1.75x
            } else if (currentSpeed <= 175) {
                nextSpeed = 200; // 1.75x -> 2.0x
            } else {
                nextSpeed = 75; // 2.0x -> 0.75x (wrap around)
            }
            
            setSpeed(nextSpeed);
        }
        
        /**
         * Reset speed to normal
         * Location: Will move to modules/sliders.js
         */
        function resetSpeed() {
            setSpeed(100);
            console.log('[MediaPlayer] Speed reset to 1.0x');
        }
        
        /* ================================
           Stage 3: Progress Bar Functions
           ================================ */
        
        /**
         * Format time in seconds to HH:MM:SS
         * Location: Will move to modules/time-display.js
         */
        function formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) {
                return '00:00:00';
            }
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            return [hours, minutes, secs]
                .map(v => v.toString().padStart(2, '0'))
                .join(':');
        }
        
        /**
         * Update progress bar and time displays
         * Location: Will move to modules/progress-bar.js
         */
        function updateProgress() {
            if (!audioPlayer.duration || isDragging) return;
            
            const currentTime = audioPlayer.currentTime;
            const duration = audioPlayer.duration;
            const progressPercent = (currentTime / duration) * 100;
            
            // RTL: Width represents progress from right to left
            progressFill.style.width = progressPercent + '%';
            
            // Update time displays
            currentTimeDisplay.textContent = formatTime(currentTime);
            totalTimeDisplay.textContent = formatTime(duration);
        }
        
        /**
         * Calculate progress position from click/drag event
         * RTL aware - right side is 0%, left side is 100%
         * Location: Will move to modules/progress-bar.js
         */
        function calculateProgressPercent(clientX) {
            const rect = progressBar.getBoundingClientRect();
            const x = clientX - rect.left;
            const width = rect.width;
            
            // RTL: Invert the percentage (right is start, left is end)
            const percent = ((width - x) / width) * 100;
            
            // Clamp between 0 and 100
            return Math.max(0, Math.min(100, percent));
        }
        
        /**
         * Seek to specific time
         * Location: Will move to modules/progress-bar.js
         */
        function seekTo(percent) {
            if (!audioPlayer.duration) return;
            
            const time = (percent / 100) * audioPlayer.duration;
            audioPlayer.currentTime = time;
            
            // Update progress immediately
            progressFill.style.width = percent + '%';
            currentTimeDisplay.textContent = formatTime(time);
            
            console.log('[MediaPlayer] Seeked to:', formatTime(time), `(${percent.toFixed(1)}%)`);
        }
        
        /**
         * Handle click on progress bar
         * Location: Will move to modules/progress-bar.js
         */
        function handleProgressClick(event) {
            console.log('[MediaPlayer] Progress bar clicked');
            const percent = calculateProgressPercent(event.clientX);
            seekTo(percent);
        }
        
        /**
         * Start dragging on progress bar
         * Location: Will move to modules/progress-bar.js
         */
        function startProgressDrag(event) {
            isDragging = true;
            progressBar.classList.add('dragging');
            
            // Handle initial position
            const percent = calculateProgressPercent(event.clientX);
            seekTo(percent);
            
            // Set up drag handlers
            const handleDrag = (e) => {
                if (!isDragging) return;
                const percent = calculateProgressPercent(e.clientX);
                seekTo(percent);
            };
            
            const stopDrag = () => {
                isDragging = false;
                progressBar.classList.remove('dragging');
                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', stopDrag);
            };
            
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', stopDrag);
            
            event.preventDefault();
        }
        
        // Initialize when DOM is ready
        // Since this is included via PHP, we need to ensure DOM is fully ready
        console.log('[MediaPlayer] Current document.readyState:', document.readyState);
        
        // Try multiple approaches to ensure initialization
        let initialized = false;
        
        function tryInitialize() {
            if (!initialized) {
                initialized = true;
                initializeMediaPlayer();
            }
        }
        
        // Approach 1: Check current state
        if (document.readyState === 'complete') {
            console.log('[MediaPlayer] Document already complete, initializing with delay...');
            setTimeout(tryInitialize, 200);
        } else if (document.readyState === 'interactive') {
            console.log('[MediaPlayer] Document interactive, initializing with delay...');
            setTimeout(tryInitialize, 300);
        } else {
            console.log('[MediaPlayer] Document still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', function() {
                console.log('[MediaPlayer] DOMContentLoaded fired');
                setTimeout(tryInitialize, 100);
            });
        }
        
        // Approach 2: Also use window.load as backup
        window.addEventListener('load', function() {
            console.log('[MediaPlayer] Window load event fired');
            setTimeout(tryInitialize, 500);
        });
        
        // Approach 3: Fallback timer
        setTimeout(function() {
            console.log('[MediaPlayer] Fallback timer (1 second)');
            tryInitialize();
        }, 1000);
        
        // Log that script loaded
        console.log('[MediaPlayer] Script loaded - Stage 2 Basic Player');
        console.log('[MediaPlayer] Console logging is working');
        
        // Test if JavaScript is running
        try {
            console.log('[MediaPlayer] JavaScript execution test:', 1 + 1);
        } catch (e) {
            alert('JavaScript error: ' + e.message);
        }
