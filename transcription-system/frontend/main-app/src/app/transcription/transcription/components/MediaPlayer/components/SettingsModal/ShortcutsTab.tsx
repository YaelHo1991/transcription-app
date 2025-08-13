'use client';

import React, { useState } from 'react';
import { KeyboardShortcut } from '../../types';
import { defaultShortcuts } from '../KeyboardShortcuts';

interface ShortcutsTabProps {
  shortcuts: KeyboardShortcut[];
  shortcutsEnabled: boolean;
  rewindOnPause: { enabled: boolean; amount: number };
  onShortcutsChange: (shortcuts: KeyboardShortcut[]) => void;
  onShortcutsEnabledChange: (enabled: boolean) => void;
  onRewindOnPauseChange: (settings: { enabled: boolean; amount: number }) => void;
}

export default function ShortcutsTab({
  shortcuts,
  shortcutsEnabled,
  rewindOnPause,
  onShortcutsChange,
  onShortcutsEnabledChange,
  onRewindOnPauseChange
}: ShortcutsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Show status message like original
  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  // Group shortcuts by their group property - exactly like original
  const groupedShortcuts = shortcuts.reduce((groups, shortcut, index) => {
    const group = shortcut.group || 'אחר';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push({ ...shortcut, index });
    return groups;
  }, {} as Record<string, (KeyboardShortcut & { index: number })[]>);

  const handleKeyCapture = (index: number) => {
    setEditingIndex(index);
    setTempKey('לחץ מקש...');
  };

  const handleKeyPress = (e: React.KeyboardEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't capture ESC - let user cancel
    if (e.key === 'Escape') {
      setEditingIndex(null);
      setTempKey('');
      return;
    }
    
    // Check if this is a numpad key - critical for Shift+Numpad detection
    const isNumpad = e.code && e.code.startsWith('Numpad');
    
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    
    // Special handling for Shift+Numpad combinations
    let shiftDetected = e.shiftKey;
    
    // If we have a numpad code but the key is a navigation key, Shift was pressed
    if (isNumpad && !shiftDetected) {
      const navigationKeys = ['End', 'ArrowDown', 'PageDown', 'ArrowLeft', 
                             'Clear', 'ArrowRight', 'Home', 'ArrowUp', 'PageUp'];
      if (navigationKeys.includes(e.key)) {
        shiftDetected = true; // Shift was pressed but browser didn't report it
      }
    }
    
    if (shiftDetected) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    
    let key = e.key;
    
    // Skip modifier keys themselves
    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'Ctrl'];
    if (modifierKeys.includes(key)) {
      return; // Don't create shortcut for modifier keys alone
    }
    
    // Special handling for numpad keys
    if (isNumpad) {
      // When Shift is pressed with numpad, we MUST use e.code
      const numpadKey = e.code.substring(6); // Remove 'Numpad' prefix
      key = 'Numpad' + numpadKey; // Create identifier like 'Numpad1', 'NumpadAdd'
    } else if (key === ' ') {
      key = ' '; // Keep space as-is for internal use
    } else if (key === 'ArrowLeft') {
      key = 'ArrowLeft';
    } else if (key === 'ArrowRight') {
      key = 'ArrowRight';
    } else if (key === 'ArrowUp') {
      key = 'ArrowUp';
    } else if (key === 'ArrowDown') {
      key = 'ArrowDown';
    } else if (key === 'Escape') {
      key = 'Escape';
    } else if (key.startsWith('F') && key.length >= 2 && key.length <= 3) {
      // Handle F1-F12 keys
      const fNum = key.substring(1);
      if (!isNaN(Number(fNum)) && Number(fNum) >= 1 && Number(fNum) <= 12) {
        key = key; // Keep F-keys as is (F1, F2, etc.)
      }
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
    if (!hasNonModifier) {
      return; // Keep capturing mode active
    }
    
    const keyString = parts.join('+');
    
    // Check if it's the same key for the same action
    if (shortcuts[index].key === keyString) {
      showStatus('הקיצור כבר מוגדר למקש זה');
      setEditingIndex(null);
      setTempKey('');
      return;
    }
    
    // Check if key is already used by a different action
    for (let i = 0; i < shortcuts.length; i++) {
      if (i !== index && shortcuts[i].key === keyString) {
        showStatus(`המקש ${formatKeyDisplay(keyString)} כבר בשימוש עבור ${shortcuts[i].description}`);
        setEditingIndex(null);
        setTempKey('');
        return;
      }
    }
    
    const updatedShortcuts = [...shortcuts];
    updatedShortcuts[index].key = keyString;
    onShortcutsChange(updatedShortcuts);
    showStatus('הקיצור עודכן בהצלחה');
    setEditingIndex(null);
    setTempKey('');
  };

  const handleToggle = (index: number) => {
    const updatedShortcuts = [...shortcuts];
    updatedShortcuts[index].enabled = !updatedShortcuts[index].enabled;
    onShortcutsChange(updatedShortcuts);
  };

  const resetShortcuts = () => {
    // Reset to default shortcuts
    onShortcutsChange([...defaultShortcuts]);
    showStatus('הקיצורים אופסו לברירת המחדל');
  };

  const getGroupIcon = (groupName: string) => {
    const icons: Record<string, string> = {
      'בקרת הפעלה': '🎵',
      'ניווט': '⏩',
      'עוצמה ומהירות': '🔊',
      'מצבי עבודה': '⚙️',
      'הגדרות': '🔧'
    };
    return icons[groupName] || '📌';
  };

  const formatKeyDisplay = (key: string) => {
    // Format key for display like original
    if (!key || typeof key !== 'string') return '';
    
    // Handle space key specially
    if (key === ' ' || key === 'Space') return 'רווח';
    
    // Handle combination keys
    if (key.includes('+')) {
      const parts = key.split('+');
      const formattedParts = parts.map(part => {
        const cleanPart = part.trim();
        
        // Skip empty parts
        if (!cleanPart) return '';
        
        // Handle special keys and modifiers
        switch (cleanPart) {
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
            // Handle arrow keys
            if (cleanPart === 'ArrowRight' || cleanPart === '→') return '→';
            if (cleanPart === 'ArrowLeft' || cleanPart === '←') return '←';
            if (cleanPart === 'ArrowUp' || cleanPart === '↑') return '↑';
            if (cleanPart === 'ArrowDown' || cleanPart === '↓') return '↓';
            // For regular keys, just uppercase
            return cleanPart.toUpperCase();
        }
      }).filter(p => p !== ''); // Remove empty parts
      
      return formattedParts.join('+');
    }
    
    // Handle single keys
    switch (key) {
      case 'ArrowLeft': return '←';  
      case 'ArrowRight': return '→';
      case 'ArrowUp': return '↑';
      case 'ArrowDown': return '↓';
      case 'Escape': return 'Esc';
      case 'Home': return 'Home';
      case 'End': return 'End';
      case ' ': return 'רווח';
      default: 
        // Handle Numpad keys specially
        if (key.startsWith('Numpad')) {
          const numpadPart = key.substring(6);
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
        return key.toUpperCase();
    }
  };

  return (
    <div className="shortcuts-config">
      {/* Header with global toggle - EXACT original structure */}
      <div className="media-shortcuts-header">
        <h3>⌨️ קיצורי מקלדת</h3>
        <p className="shortcuts-hint">לחץ על קיצור כדי לשנות אותו</p>
        <div className="media-shortcuts-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="shortcutsEnabledToggle"
              checked={shortcutsEnabled}
              onChange={(e) => onShortcutsEnabledChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">קיצורים פעילים</span>
        </div>
      </div>

      {/* Shortcuts list grouped by category - EXACT original structure */}
      <div className="media-shortcuts-list">
        {Object.entries(groupedShortcuts).map(([groupName, groupShortcuts]) => (
          <div key={groupName} className="media-shortcut-group">
            <div className="group-header">{getGroupIcon(groupName)} {groupName}</div>
            
            {groupShortcuts.map(shortcut => (
              <div key={shortcut.index} className="media-shortcut-item">
                <span className="media-shortcut-label">
                  {shortcut.description}
                </span>
                
                {editingIndex === shortcut.index ? (
                  <input
                    type="text"
                    value={tempKey || ''}
                    onChange={() => {}} // Controlled by keydown handler
                    onKeyDown={(e) => handleKeyPress(e, shortcut.index)}
                    onBlur={() => {
                      setEditingIndex(null);
                      setTempKey('');
                    }}
                    autoFocus
                    className="media-shortcut-key capturing"
                  />
                ) : (
                  <button
                    className="media-shortcut-key"
                    data-action={shortcut.action}
                    id={`shortcut-${shortcut.action}`}
                    onClick={() => handleKeyCapture(shortcut.index)}
                  >
                    {formatKeyDisplay(shortcut.key)}
                  </button>
                )}
                
                <input
                  type="checkbox"
                  checked={shortcut.enabled}
                  onChange={() => handleToggle(shortcut.index)}
                  className="shortcut-checkbox"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rewind on Pause Section - EXACT original structure */}
      <div className="rewind-on-pause-section">
        <h4>⏪ חזור אחורה בעצירה</h4>
        <div className="rewind-on-pause-controls">
          <div className="rewind-on-pause-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="rewindOnPauseEnabled"
                checked={rewindOnPause.enabled}
                onChange={(e) => onRewindOnPauseChange({
                  ...rewindOnPause,
                  enabled: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span>אפשר חזרה אחורה בעצירה</span>
          </div>
          <div className={`rewind-amount-container ${rewindOnPause.enabled ? '' : 'disabled'}`} id="rewindAmountContainer">
            <label>כמות (שניות):</label>
            <div className="number-input-wrapper">
              <button 
                className="spinner-btn decrease"
                onClick={() => onRewindOnPauseChange({
                  ...rewindOnPause,
                  amount: Math.max(0.1, (rewindOnPause.amount || 0.3) - 0.1)
                })}
                disabled={!rewindOnPause.enabled}
                type="button"
              >
                −
              </button>
              <input
                type="number"
                id="rewindAmount"
                className="rewind-amount-input"
                min="0.1"
                max="2.0"
                step="0.1"
                value={(rewindOnPause.amount || 0.3).toFixed(1)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0.1 && val <= 2.0) {
                    onRewindOnPauseChange({
                      ...rewindOnPause,
                      amount: val
                    });
                  }
                }}
                disabled={!rewindOnPause.enabled}
              />
              <button 
                className="spinner-btn increase"
                onClick={() => onRewindOnPauseChange({
                  ...rewindOnPause,
                  amount: Math.min(2.0, (rewindOnPause.amount || 0.3) + 0.1)
                })}
                disabled={!rewindOnPause.enabled}
                type="button"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with reset button - EXACT original structure */}
      <div className="shortcuts-footer">
        <button className="reset-shortcuts-btn" onClick={resetShortcuts}>
          אפס לברירת מחדל
        </button>
        <div className={`media-shortcuts-status ${statusMessage ? 'visible' : ''}`} id="mediaShortcutsStatus">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}