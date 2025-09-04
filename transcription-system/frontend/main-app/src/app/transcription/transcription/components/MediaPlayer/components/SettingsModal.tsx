'use client';

import React, { useState, useEffect, useRef } from 'react';
import StatusMessage from './StatusMessage';
import { canUsePedal, getPedalStatusMessage } from '../utils/httpsDetection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSettingsChange: (settings: any) => void;
}

const getDefaultShortcuts = () => {
  return {
    playback: [
      { action: 'playPause', key: 'רווח', label: 'הפעל/השהה', group: 'playback' },
      { action: 'stop', key: 'Esc', label: 'עצור', group: 'playback' },
    ],
    navigation: [
      { action: 'rewind5', key: '→', label: 'קפוץ אחורה 5 שניות', group: 'navigation' },
      { action: 'forward5', key: '←', label: 'קפוץ קדימה 5 שניות', group: 'navigation' },
      { action: 'rewind2_5', key: 'Shift+→', label: 'קפוץ אחורה 2.5 שניות', group: 'navigation' },
      { action: 'forward2_5', key: 'Shift+←', label: 'קפוץ קדימה 2.5 שניות', group: 'navigation' },
      { action: 'jumpToStart', key: 'Home', label: 'קפוץ להתחלה', group: 'navigation' },
      { action: 'jumpToEnd', key: 'End', label: 'קפוץ לסוף', group: 'navigation' },
    ],
    volumeSpeed: [
      { action: 'volumeUp', key: '↑', label: 'הגבר עוצמה', group: 'volumeSpeed' },
      { action: 'volumeDown', key: '↓', label: 'הנמך עוצמה', group: 'volumeSpeed' },
      { action: 'mute', key: 'M', label: 'השתק/בטל השתקה', group: 'volumeSpeed' },
      { action: 'speedUp', key: '=', label: 'הגבר מהירות', group: 'volumeSpeed' },
      { action: 'speedDown', key: '-', label: 'הנמך מהירות', group: 'volumeSpeed' },
      { action: 'speedReset', key: '0', label: 'אפס מהירות', group: 'volumeSpeed' },
    ],
    workModes: [
      { action: 'toggleShortcuts', key: 'Ctrl+Shift+s', label: 'הפעל/כבה קיצורים', group: 'workModes' },
      { action: 'togglePedal', key: 'P', label: 'הפעל/כבה דוושה', group: 'workModes' },
      { action: 'toggleAutoDetect', key: 'A', label: 'הפעל/כבה זיהוי אוטומטי', group: 'workModes' },
      { action: 'toggleMode', key: 'Ctrl+m', label: 'החלף מצב רגיל/משופר', group: 'workModes' },
    ],
    settings: [
      { action: 'toggleSettings', key: 'S', label: 'פתח הגדרות', group: 'settings' },
    ],
  };
};

export default function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState(getDefaultShortcuts());
  const [pedalStatus, setPedalStatus] = useState(getPedalStatusMessage());
  const [pedalDevice, setPedalDevice] = useState<any>(null);
  
  // Shortcuts state
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [rewindOnPause, setRewindOnPause] = useState(false);
  const [rewindAmount, setRewindAmount] = useState(0.3);
  
  // Pedal state
  const [pedalEnabled, setPedalEnabled] = useState(false);
  const [pedalConnected, setPedalConnected] = useState(false);
  const [continuousPress, setContinuousPress] = useState(true);
  const [continuousInterval, setContinuousInterval] = useState(0.5);
  
  // Auto-detect state
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [autoDetectMode, setAutoDetectMode] = useState<'regular' | 'enhanced'>('regular');
  const [regularDelay, setRegularDelay] = useState(2.0);
  const [enhancedFirstDelay, setEnhancedFirstDelay] = useState(1.5);
  const [enhancedSecondDelay, setEnhancedSecondDelay] = useState(1.5);
  const [enhancedResumeDelay, setEnhancedResumeDelay] = useState(2.0);
  
  // Initialize settings from props (parent component now manages localStorage)
  useEffect(() => {
    // Get settings from parent component props instead of localStorage
    if (settings.shortcuts) {
      setShortcuts(settings.shortcuts);
    }
    if (settings.shortcutsEnabled !== undefined) setShortcutsEnabled(settings.shortcutsEnabled);
    if (settings.rewindOnPause !== undefined) setRewindOnPause(settings.rewindOnPause);
    if (settings.rewindAmount !== undefined) setRewindAmount(settings.rewindAmount);
    
    // Pedal settings
    if (settings.pedalEnabled !== undefined) setPedalEnabled(settings.pedalEnabled);
    if (settings.continuousPress !== undefined) setContinuousPress(settings.continuousPress);
    if (settings.continuousInterval !== undefined) setContinuousInterval(settings.continuousInterval);
    
    // Auto-detect settings
    if (settings.autoDetectEnabled !== undefined) setAutoDetectEnabled(settings.autoDetectEnabled);
    if (settings.autoDetectMode !== undefined) setAutoDetectMode(settings.autoDetectMode);
    if (settings.regularDelay !== undefined) setRegularDelay(settings.regularDelay);
    if (settings.enhancedFirstDelay !== undefined) setEnhancedFirstDelay(settings.enhancedFirstDelay);
    if (settings.enhancedSecondDelay !== undefined) setEnhancedSecondDelay(settings.enhancedSecondDelay);
    if (settings.enhancedResumeDelay !== undefined) setEnhancedResumeDelay(settings.enhancedResumeDelay);
  }, [settings]);
  
  // Notify parent component when settings change (parent handles localStorage)
  useEffect(() => {
    const updatedSettings = {
      shortcuts,
      shortcutsEnabled,
      rewindOnPause,
      rewindAmount,
      pedalEnabled,
      continuousPress,
      continuousInterval,
      autoDetectEnabled,
      autoDetectMode,
      regularDelay,
      enhancedFirstDelay,
      enhancedSecondDelay,
      enhancedResumeDelay,
    };
    
    // Only notify if settings have actually changed
    onSettingsChange(updatedSettings);
  }, [
    shortcuts,
    shortcutsEnabled,
    rewindOnPause,
    rewindAmount,
    pedalEnabled,
    continuousPress,
    continuousInterval,
    autoDetectEnabled,
    autoDetectMode,
    regularDelay,
    enhancedFirstDelay,
    enhancedSecondDelay,
    enhancedResumeDelay,
    onSettingsChange
  ]);
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  // Check pedal availability
  useEffect(() => {
    setPedalStatus(getPedalStatusMessage());
  }, []);
  
  const connectPedal = async () => {
    if (!canUsePedal()) {
      return;
    }
    
    try {
      const devices = await (navigator as any).hid.requestDevice({ filters: [] });
      if (devices.length > 0) {
        setPedalDevice(devices[0]);
        setPedalConnected(true);
        setPedalStatus({
          type: 'success',
          title: 'דוושה מחוברת',
          message: 'מחובר ל: ' + (devices[0].productName || 'Unknown Device')
        });
      }
    } catch (error) {
      console.error('Failed to connect pedal:', error);
      setPedalStatus({
        type: 'error',
        title: 'חיבור נכשל',
        message: 'לא ניתן להתחבר לדוושה'
      });
    }
  };
  
  const disconnectPedal = () => {
    setPedalDevice(null);
    setPedalConnected(false);
    setPedalStatus({
      type: 'success' as const,
      title: 'דוושה מנותקת',
      message: 'הדוושה נותקה בהצלחה'
    });
  };
  
  const handleShortcutEdit = (action: string) => {
    setEditingShortcut(action);
    // Listen for next key press
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = normalizeKey(e);
      // Update shortcut for this action
      updateShortcut(action, key);
      setEditingShortcut(null);
      document.removeEventListener('keydown', handleKeyPress);
    };
    document.addEventListener('keydown', handleKeyPress);
  };
  
  const normalizeKey = (e: KeyboardEvent): string => {
    let key = e.key;
    const modifiers = [];
    
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    
    // Special key mappings
    const keyMap: { [key: string]: string } = {
      ' ': 'רווח',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Escape': 'Esc',
    };
    
    key = keyMap[key] || key;
    
    if (modifiers.length > 0) {
      return modifiers.join('+') + '+' + key;
    }
    
    return key;
  };
  
  const updateShortcut = (action: string, key: string) => {
    // Update shortcuts state
    const newShortcuts = { ...shortcuts };
    for (const group in newShortcuts) {
      const shortcut = newShortcuts[group as keyof typeof newShortcuts].find((s: any) => s.action === action);
      if (shortcut) {
        shortcut.key = key;
        setShortcuts(newShortcuts);
        // Also update parent settings if needed
        const flatShortcuts = Object.values(newShortcuts).flat();
        onSettingsChange({ ...settings, shortcuts: flatShortcuts });
        break;
      }
    }
  };
  
  const resetShortcuts = () => {
    // Reset to default shortcuts
    const defaultShortcuts = getDefaultShortcuts();
    setShortcuts(defaultShortcuts);
    const flatShortcuts = Object.values(defaultShortcuts).flat();
    onSettingsChange({ ...settings, shortcuts: flatShortcuts });
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="media-modal-overlay active" 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="settings-modal">
          {/* Modal Header */}
          <div className="settings-modal-header">
            <h2 className="settings-modal-title">הגדרות נגן מדיה</h2>
            <button className="settings-modal-close" onClick={onClose}>✕</button>
          </div>
          
          {/* Modal Tabs */}
          <div className="settings-modal-tabs">
            <button 
              className={'settings-tab-btn ' + (activeTab === 'shortcuts' ? 'active' : '')}
              onClick={() => setActiveTab('shortcuts')}
            >
              קיצורי מקלדת
            </button>
            <button 
              className={'settings-tab-btn ' + (activeTab === 'pedal' ? 'active' : '')}
              onClick={() => setActiveTab('pedal')}
            >
              דוושת רגל
            </button>
            <button 
              className={'settings-tab-btn ' + (activeTab === 'autodetect' ? 'active' : '')}
              onClick={() => setActiveTab('autodetect')}
            >
              זיהוי אוטומטי
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="settings-modal-content">
            {/* Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div className="settings-tab-content active">
                <div className="shortcuts-config">
                  <div className="media-shortcuts-header">
                    <h3>⌨️ קיצורי מקלדת</h3>
                    <p className="shortcuts-hint">לחץ על קיצור כדי לשנות אותו</p>
                    <div className="media-shortcuts-toggle">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={shortcutsEnabled}
                          onChange={(e) => setShortcutsEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">קיצורים פעילים</span>
                    </div>
                  </div>
                  
                  <div className="media-shortcuts-list">
                    {/* Group 1: Playback Control */}
                    <div className="media-shortcut-group">
                      <div className="group-header">🎵 בקרת הפעלה</div>
                      {shortcuts.playback.map((shortcut) => (
                        <div key={shortcut.action} className="media-shortcut-item">
                          <span className="media-shortcut-label">{shortcut.label}</span>
                          <button 
                            className={'media-shortcut-key ' + (editingShortcut === shortcut.action ? 'editing' : '')}
                            onClick={() => handleShortcutEdit(shortcut.action)}
                          >
                            {editingShortcut === shortcut.action ? 'לחץ על מקש...' : shortcut.key}
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Group 2: Navigation */}
                    <div className="media-shortcut-group">
                      <div className="group-header">⏩ ניווט</div>
                      {shortcuts.navigation.map((shortcut) => (
                        <div key={shortcut.action} className="media-shortcut-item">
                          <span className="media-shortcut-label">{shortcut.label}</span>
                          <button 
                            className={'media-shortcut-key ' + (editingShortcut === shortcut.action ? 'editing' : '')}
                            onClick={() => handleShortcutEdit(shortcut.action)}
                          >
                            {editingShortcut === shortcut.action ? 'לחץ על מקש...' : shortcut.key}
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Group 3: Volume & Speed */}
                    <div className="media-shortcut-group">
                      <div className="group-header">🔊 עוצמה ומהירות</div>
                      {shortcuts.volumeSpeed.map((shortcut) => (
                        <div key={shortcut.action} className="media-shortcut-item">
                          <span className="media-shortcut-label">{shortcut.label}</span>
                          <button 
                            className={'media-shortcut-key ' + (editingShortcut === shortcut.action ? 'editing' : '')}
                            onClick={() => handleShortcutEdit(shortcut.action)}
                          >
                            {editingShortcut === shortcut.action ? 'לחץ על מקש...' : shortcut.key}
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Group 4: Work Modes */}
                    <div className="media-shortcut-group">
                      <div className="group-header">⚙️ מצבי עבודה</div>
                      {shortcuts.workModes.map((shortcut) => (
                        <div key={shortcut.action} className="media-shortcut-item">
                          <span className="media-shortcut-label">{shortcut.label}</span>
                          <button 
                            className={'media-shortcut-key ' + (editingShortcut === shortcut.action ? 'editing' : '')}
                            onClick={() => handleShortcutEdit(shortcut.action)}
                          >
                            {editingShortcut === shortcut.action ? 'לחץ על מקש...' : shortcut.key}
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Group 5: Settings */}
                    <div className="media-shortcut-group">
                      <div className="group-header">🔧 הגדרות</div>
                      {shortcuts.settings.map((shortcut) => (
                        <div key={shortcut.action} className="media-shortcut-item">
                          <span className="media-shortcut-label">{shortcut.label}</span>
                          <button 
                            className={'media-shortcut-key ' + (editingShortcut === shortcut.action ? 'editing' : '')}
                            onClick={() => handleShortcutEdit(shortcut.action)}
                          >
                            {editingShortcut === shortcut.action ? 'לחץ על מקש...' : shortcut.key}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Rewind on Pause Section */}
                  <div className="rewind-on-pause-section">
                    <h4>⏪ חזור אחורה בעצירה</h4>
                    <div className="rewind-on-pause-controls">
                      <div className="rewind-on-pause-toggle">
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={rewindOnPause}
                            onChange={(e) => setRewindOnPause(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <span>אפשר חזרה אחורה בעצירה</span>
                      </div>
                      <div className={'rewind-amount-container ' + (!rewindOnPause ? 'disabled' : '')}>
                        <label>כמות (שניות):</label>
                        <input 
                          type="number" 
                          className="rewind-amount-input"
                          min="0.1" 
                          max="2.0" 
                          step="0.1" 
                          value={rewindAmount}
                          onChange={(e) => setRewindAmount(Number(e.target.value))}
                          disabled={!rewindOnPause}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="shortcuts-footer">
                    <button className="reset-shortcuts-btn" onClick={resetShortcuts}>
                      אפס לברירת מחדל
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pedal Tab */}
            {activeTab === 'pedal' && (
              <div className="settings-tab-content active">
                <div className="pedal-settings-container">
                  <div className="media-pedal-header">
                    <h3>🦶 דוושת רגל</h3>
                    <p className="pedal-hint">הגדר את כפתורי הדוושה לשליטה בנגן</p>
                    <div className="media-pedal-toggle">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={pedalEnabled}
                          onChange={(e) => setPedalEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">דוושה פעילה</span>
                    </div>
                  </div>
                  
                  {/* Show HTTPS warning if needed */}
                  {pedalStatus.type !== 'success' && (
                    <StatusMessage 
                      type={pedalStatus.type}
                      title={pedalStatus.title}
                      message={pedalStatus.message}
                    />
                  )}
                  
                  {/* Connection Status */}
                  <div className="pedal-connection-section">
                    <div className="pedal-connection-content">
                      <div className="pedal-status">
                        <span id="pedal-status-icon">
                          {pedalConnected ? '🟢' : '⚪'}
                        </span>
                        <span id="pedal-status-text">
                          {pedalConnected ? 'מחובר' : 'לא מחובר'}
                        </span>
                      </div>
                      {canUsePedal() && (
                        <button 
                          className="pedal-connect-button"
                          onClick={pedalConnected ? disconnectPedal : connectPedal}
                        >
                          {pedalConnected ? 'נתק דוושה' : 'התחבר לדוושה'}
                        </button>
                      )}
                      {canUsePedal() && (
                        <p className="pedal-help-text">
                          לחץ על "התחבר לדוושה" ובחר את המכשיר מהרשימה
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Button Mappings */}
                  {pedalConnected && (
                    <div className="pedal-mappings-section">
                      <h3>הגדרות כפתורים</h3>
                      
                      {/* Visual Pedal Interface */}
                      <div className="pedal-visual-container">
                        <div className="pedal-visual">
                          {/* Left Button */}
                          <div className="pedal-button-visual" data-button="left">
                            <div className="pedal-button-circle">
                              <span className="pedal-button-arrow">➡️</span>
                            </div>
                            <div className="pedal-button-label">ימין</div>
                            <select className="pedal-action-select" defaultValue="skipBackward2.5">
                              <option value="skipBackward2.5">דלג אחורה 2.5 שניות</option>
                              <option value="skipForward2.5">דלג קדימה 2.5 שניות</option>
                              <option value="skipForward5">דלג קדימה 5 שניות</option>
                              <option value="skipBackward5">דלג אחורה 5 שניות</option>
                              <option value="playPause">הפעל/השהה</option>
                              <option value="speedUp">הגבר מהירות</option>
                              <option value="speedDown">הנמך מהירות</option>
                              <option value="mute">השתק/בטל השתקה</option>
                              <option value="none">ללא פעולה</option>
                            </select>
                          </div>
                          
                          {/* Center Button */}
                          <div className="pedal-button-visual" data-button="center">
                            <div className="pedal-button-circle">
                              <span className="pedal-button-arrow">⏸️</span>
                            </div>
                            <div className="pedal-button-label">מרכז</div>
                            <select className="pedal-action-select" defaultValue="playPause">
                              <option value="playPause">הפעל/השהה</option>
                              <option value="skipBackward2.5">דלג אחורה 2.5 שניות</option>
                              <option value="skipForward2.5">דלג קדימה 2.5 שניות</option>
                              <option value="skipForward5">דלג קדימה 5 שניות</option>
                              <option value="skipBackward5">דלג אחורה 5 שניות</option>
                              <option value="speedUp">הגבר מהירות</option>
                              <option value="speedDown">הנמך מהירות</option>
                              <option value="mute">השתק/בטל השתקה</option>
                              <option value="none">ללא פעולה</option>
                            </select>
                          </div>
                          
                          {/* Right Button */}
                          <div className="pedal-button-visual" data-button="right">
                            <div className="pedal-button-circle">
                              <span className="pedal-button-arrow">⬅️</span>
                            </div>
                            <div className="pedal-button-label">שמאל</div>
                            <select className="pedal-action-select" defaultValue="skipForward2.5">
                              <option value="skipForward2.5">דלג קדימה 2.5 שניות</option>
                              <option value="skipBackward2.5">דלג אחורה 2.5 שניות</option>
                              <option value="skipForward5">דלג קדימה 5 שניות</option>
                              <option value="skipBackward5">דלג אחורה 5 שניות</option>
                              <option value="playPause">הפעל/השהה</option>
                              <option value="speedUp">הגבר מהירות</option>
                              <option value="speedDown">הנמך מהירות</option>
                              <option value="mute">השתק/בטל השתקה</option>
                              <option value="none">ללא פעולה</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Continuous Press Settings */}
                      <div className="pedal-continuous-section">
                        <h3>לחיצה ממושכת</h3>
                        <label className="pedal-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={continuousPress}
                            onChange={(e) => setContinuousPress(e.target.checked)}
                          />
                          <span>אפשר דילוג רציף בלחיצה ממושכת</span>
                        </label>
                        {continuousPress && (
                          <div className="pedal-continuous-config">
                            <label>
                              מרווח זמן בלחיצה ממושכת (שניות):
                              <input 
                                type="number" 
                                min="0.1" 
                                max="5" 
                                step="0.1" 
                                value={continuousInterval}
                                onChange={(e) => setContinuousInterval(Number(e.target.value))}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                      
                      {/* Test Area */}
                      <div className="pedal-test-section">
                        <h3>בדיקת דוושה</h3>
                        <p className="pedal-test-hint">לחץ על כפתורי הדוושה לבדיקה</p>
                        <div className="pedal-test-display">
                          <span className="pedal-test-button" id="test-left">➡️</span>
                          <span className="pedal-test-button" id="test-center">⏸️</span>
                          <span className="pedal-test-button" id="test-right">⬅️</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Auto-detect Tab */}
            {activeTab === 'autodetect' && (
              <div className="settings-tab-content active">
                <div className="auto-detect-container">
                  <div className="media-auto-detect-header">
                    <h3>🔍 זיהוי אוטומטי</h3>
                    <p className="auto-detect-hint">עצור והפעל אוטומטית של המדיה בזמן הקלדה</p>
                    <div className="media-auto-detect-toggle">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={autoDetectEnabled}
                          onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">זיהוי אוטומטי פעיל</span>
                    </div>
                  </div>
                  
                  {/* Mode Selection */}
                  <div className="auto-detect-mode-section">
                    <h3>מצב עבודה</h3>
                    <div className="auto-detect-mode-options">
                      <label className="mode-option">
                        <input 
                          type="radio" 
                          name="autoDetectMode" 
                          value="regular" 
                          checked={autoDetectMode === 'regular'}
                          onChange={() => setAutoDetectMode('regular')}
                        />
                        <div className="mode-card">
                          <span className="mode-icon">🎯</span>
                          <span className="mode-title">רגיל</span>
                          <span className="mode-description">עצור בהתחלת הקלדה, המשך אחרי הפסקה</span>
                        </div>
                      </label>
                      <label className="mode-option">
                        <input 
                          type="radio" 
                          name="autoDetectMode" 
                          value="enhanced"
                          checked={autoDetectMode === 'enhanced'}
                          onChange={() => setAutoDetectMode('enhanced')}
                        />
                        <div className="mode-card">
                          <span className="mode-icon">⚡</span>
                          <span className="mode-title">משופר</span>
                          <span className="mode-description">המשך בזמן הקלדה, עצור בהפסקה ראשונה</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Settings based on mode */}
                  <div className="auto-detect-settings-section">
                    <h3>הגדרות זיהוי</h3>
                    <div className="auto-detect-settings">
                      {autoDetectMode === 'regular' ? (
                        <div className="regular-mode-settings">
                          <div className="setting-item">
                            <label>השהייה לפני חידוש הנגינה (שניות):</label>
                            <input 
                              type="number" 
                              className="auto-detect-input"
                              min="0.5" 
                              max="5" 
                              step="0.1" 
                              value={regularDelay}
                              onChange={(e) => setRegularDelay(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="enhanced-mode-settings">
                          <div className="setting-item">
                            <label>השהייה עד הפסקה ראשונה (שניות):</label>
                            <input 
                              type="number" 
                              className="auto-detect-input"
                              min="0.5" 
                              max="5" 
                              step="0.1" 
                              value={enhancedFirstDelay}
                              onChange={(e) => setEnhancedFirstDelay(Number(e.target.value))}
                            />
                          </div>
                          <div className="setting-item">
                            <label>השהייה עד הפסקה שנייה (שניות):</label>
                            <input 
                              type="number" 
                              className="auto-detect-input"
                              min="0.5" 
                              max="5" 
                              step="0.1" 
                              value={enhancedSecondDelay}
                              onChange={(e) => setEnhancedSecondDelay(Number(e.target.value))}
                            />
                          </div>
                          <div className="setting-item">
                            <label>השהייה לחידוש אוטומטי (שניות):</label>
                            <input 
                              type="number" 
                              className="auto-detect-input"
                              min="0.5" 
                              max="5" 
                              step="0.1" 
                              value={enhancedResumeDelay}
                              onChange={(e) => setEnhancedResumeDelay(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="auto-detect-status-section">
                    <h3>מצב נוכחי</h3>
                    <div className="auto-detect-status">
                      <div className="status-indicator">
                        <span className="status-icon">•</span>
                        <span className="status-text">
                          {autoDetectEnabled ? 'פעיל' : 'כבוי'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}