'use client';

import React, { useState } from 'react';
import { KeyboardShortcut } from './types';

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

  // Group shortcuts by their group property
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
    setTempKey('לחץ על מקש...');
  };

  const handleKeyPress = (e: React.KeyboardEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    
    let key = e.key;
    if (key === ' ') key = 'רווח';
    if (key === 'ArrowLeft') key = '←';
    if (key === 'ArrowRight') key = '→';
    if (key === 'ArrowUp') key = '↑';
    if (key === 'ArrowDown') key = '↓';
    if (key === 'Escape') key = 'Esc';
    
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      parts.push(key);
    }
    
    const keyString = parts.join('+');
    const updatedShortcuts = [...shortcuts];
    updatedShortcuts[index].key = keyString;
    onShortcutsChange(updatedShortcuts);
    setEditingIndex(null);
    setTempKey('');
  };

  const handleToggle = (index: number) => {
    const updatedShortcuts = [...shortcuts];
    updatedShortcuts[index].enabled = !updatedShortcuts[index].enabled;
    onShortcutsChange(updatedShortcuts);
  };

  const getGroupIcon = (groupName: string) => {
    const icons: Record<string, string> = {
      'בקרת הפעלה': '🎵',
      'ניווט': '⏩',
      'עוצמה ומהירות': '🔊',
      'מצבי עבודה': '⚙️',
      'בקרת לולאה': '🔄',
      'מצב וידאו': '📹',
      'פונקציות מיוחדות': '✨'
    };
    return icons[groupName] || '📌';
  };

  return (
    <div className="shortcuts-config">
      {/* Header with global toggle */}
      <div className="media-shortcuts-header" style={{
        marginBottom: '20px',
        padding: '15px',
        background: 'rgba(15, 76, 76, 0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(32, 201, 151, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#20c997', margin: '0 0 5px 0', fontSize: '18px' }}>
              ⌨️ קיצורי מקלדת
            </h3>
            <p style={{ color: 'rgba(224, 247, 247, 0.7)', fontSize: '13px', margin: 0 }}>
              לחץ על קיצור כדי לשנות אותו
            </p>
          </div>
          <div className="media-shortcuts-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={shortcutsEnabled}
                onChange={(e) => onShortcutsEnabledChange(e.target.checked)}
                style={{ marginLeft: '8px' }}
              />
              <span style={{ color: '#20c997', fontWeight: 500 }}>קיצורים פעילים</span>
            </label>
          </div>
        </div>
      </div>

      {/* Shortcuts list grouped by category */}
      <div className="media-shortcuts-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {Object.entries(groupedShortcuts).map(([groupName, groupShortcuts]) => (
          <div key={groupName} className="media-shortcut-group" style={{
            marginBottom: '20px',
            padding: '15px',
            background: 'rgba(15, 76, 76, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(32, 201, 151, 0.15)'
          }}>
            <div className="group-header" style={{
              color: '#20c997',
              fontWeight: 600,
              marginBottom: '12px',
              fontSize: '15px',
              borderBottom: '1px solid rgba(32, 201, 151, 0.2)',
              paddingBottom: '8px'
            }}>
              {getGroupIcon(groupName)} {groupName}
            </div>
            
            {groupShortcuts.map(shortcut => (
              <div key={shortcut.index} className="media-shortcut-item" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '6px',
                background: shortcut.enabled ? 'rgba(32, 201, 151, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                border: '1px solid rgba(32, 201, 151, 0.1)',
                transition: 'all 0.2s ease'
              }}>
                <span className="media-shortcut-label" style={{
                  color: shortcut.enabled ? '#e0f7f7' : 'rgba(224, 247, 247, 0.5)',
                  fontSize: '14px',
                  flex: 1
                }}>
                  {shortcut.description}
                </span>
                
                {editingIndex === shortcut.index ? (
                  <input
                    type="text"
                    value={tempKey}
                    onKeyDown={(e) => handleKeyPress(e, shortcut.index)}
                    onBlur={() => {
                      setEditingIndex(null);
                      setTempKey('');
                    }}
                    autoFocus
                    style={{
                      width: '120px',
                      padding: '4px 8px',
                      background: 'rgba(32, 201, 151, 0.1)',
                      border: '2px solid #20c997',
                      borderRadius: '4px',
                      color: '#20c997',
                      fontSize: '13px',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <button
                    className="media-shortcut-key"
                    onClick={() => handleKeyCapture(shortcut.index)}
                    style={{
                      minWidth: '120px',
                      padding: '4px 12px',
                      background: 'rgba(32, 201, 151, 0.1)',
                      border: '1px solid rgba(32, 201, 151, 0.3)',
                      borderRadius: '4px',
                      color: '#20c997',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(32, 201, 151, 0.2)';
                      e.currentTarget.style.borderColor = '#20c997';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(32, 201, 151, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(32, 201, 151, 0.3)';
                    }}
                  >
                    {shortcut.key}
                  </button>
                )}
                
                <input
                  type="checkbox"
                  checked={shortcut.enabled}
                  onChange={() => handleToggle(shortcut.index)}
                  style={{
                    marginRight: '12px',
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px'
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rewind on Pause Section */}
      <div className="rewind-on-pause-section" style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(15, 76, 76, 0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(32, 201, 151, 0.2)'
      }}>
        <h4 style={{ color: '#20c997', margin: '0 0 12px 0', fontSize: '15px' }}>
          ⏪ חזור אחורה בעצירה
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rewindOnPause.enabled}
              onChange={(e) => onRewindOnPauseChange({
                ...rewindOnPause,
                enabled: e.target.checked
              })}
              style={{ marginLeft: '8px' }}
            />
            <span style={{ color: '#e0f7f7', fontSize: '14px' }}>
              אפשר חזרה אחורה בעצירה
            </span>
          </label>
          
          {rewindOnPause.enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: 'rgba(224, 247, 247, 0.7)', fontSize: '13px' }}>
                כמות (שניות):
              </label>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={rewindOnPause.amount}
                onChange={(e) => onRewindOnPauseChange({
                  ...rewindOnPause,
                  amount: Number(e.target.value)
                })}
                style={{
                  width: '80px',
                  padding: '4px 8px',
                  background: 'rgba(32, 201, 151, 0.1)',
                  border: '1px solid rgba(32, 201, 151, 0.3)',
                  borderRadius: '4px',
                  color: '#20c997',
                  fontSize: '13px'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}