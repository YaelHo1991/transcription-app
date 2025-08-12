'use client';

import React, { useState } from 'react';
import { MediaPlayerSettings, KeyboardShortcut } from './types';

interface SettingsModalProps {
  settings: MediaPlayerSettings;
  onSettingsChange: (settings: MediaPlayerSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSettingsChange, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'pedal' | 'autodetect'>('shortcuts');
  const [localSettings, setLocalSettings] = useState<MediaPlayerSettings>(settings);

  // Handle shortcut key change
  const handleShortcutKeyChange = (index: number, newKey: string) => {
    const updatedShortcuts = [...localSettings.shortcuts];
    updatedShortcuts[index].key = newKey;
    setLocalSettings({ ...localSettings, shortcuts: updatedShortcuts });
  };

  // Handle shortcut toggle
  const handleShortcutToggle = (index: number) => {
    const updatedShortcuts = [...localSettings.shortcuts];
    updatedShortcuts[index].enabled = !updatedShortcuts[index].enabled;
    setLocalSettings({ ...localSettings, shortcuts: updatedShortcuts });
  };

  // Save and close
  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <div className="settings-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="settings-modal" style={{
        backgroundColor: '#1a2332',
        borderRadius: '8px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        border: '1px solid #26d0ce'
      }}>
        {/* Header */}
        <div className="modal-header" style={{
          padding: '15px 20px',
          borderBottom: '1px solid #26d0ce',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#26d0ce' }}>הגדרות נגן מדיה</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#26d0ce',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs" style={{
          display: 'flex',
          borderBottom: '1px solid #26d0ce',
          backgroundColor: 'rgba(15, 76, 76, 0.2)'
        }}>
          <button
            onClick={() => setActiveTab('shortcuts')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'shortcuts' ? '#26d0ce' : 'transparent',
              color: activeTab === 'shortcuts' ? '#1a2332' : '#26d0ce',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'shortcuts' ? 'bold' : 'normal'
            }}
          >
            קיצורי מקלדת
          </button>
          <button
            onClick={() => setActiveTab('pedal')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'pedal' ? '#26d0ce' : 'transparent',
              color: activeTab === 'pedal' ? '#1a2332' : '#26d0ce',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'pedal' ? 'bold' : 'normal'
            }}
          >
            פדל
          </button>
          <button
            onClick={() => setActiveTab('autodetect')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'autodetect' ? '#26d0ce' : 'transparent',
              color: activeTab === 'autodetect' ? '#1a2332' : '#26d0ce',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'autodetect' ? 'bold' : 'normal'
            }}
          >
            זיהוי אוטומטי
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-content" style={{
          padding: '20px',
          maxHeight: 'calc(80vh - 180px)',
          overflowY: 'auto'
        }}>
          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="shortcuts-tab">
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#26d0ce' }}>
                  <input
                    type="checkbox"
                    checked={localSettings.rewindOnPause.enabled}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      rewindOnPause: { ...localSettings.rewindOnPause, enabled: e.target.checked }
                    })}
                    style={{ marginLeft: '10px' }}
                  />
                  חזרה אחורה בעצירה
                </label>
                {localSettings.rewindOnPause.enabled && (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={localSettings.rewindOnPause.amount}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      rewindOnPause: { ...localSettings.rewindOnPause, amount: Number(e.target.value) }
                    })}
                    style={{
                      marginTop: '5px',
                      padding: '5px',
                      backgroundColor: '#0f4c4c',
                      border: '1px solid #26d0ce',
                      color: '#26d0ce',
                      borderRadius: '4px'
                    }}
                  />
                )}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #26d0ce' }}>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#26d0ce' }}>פעולה</th>
                    <th style={{ padding: '10px', textAlign: 'center', color: '#26d0ce' }}>קיצור</th>
                    <th style={{ padding: '10px', textAlign: 'center', color: '#26d0ce' }}>פעיל</th>
                  </tr>
                </thead>
                <tbody>
                  {localSettings.shortcuts.map((shortcut, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(38, 208, 206, 0.2)' }}>
                      <td style={{ padding: '10px', color: '#e0e0e0' }}>{shortcut.description}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <input
                          type="text"
                          value={shortcut.key}
                          onChange={(e) => handleShortcutKeyChange(index, e.target.value)}
                          style={{
                            padding: '5px',
                            backgroundColor: '#0f4c4c',
                            border: '1px solid #26d0ce',
                            color: '#26d0ce',
                            borderRadius: '4px',
                            width: '100px',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={shortcut.enabled}
                          onChange={() => handleShortcutToggle(index)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pedal Tab */}
          {activeTab === 'pedal' && (
            <div className="pedal-tab">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#26d0ce', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    checked={localSettings.pedal.enabled}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      pedal: { ...localSettings.pedal, enabled: e.target.checked }
                    })}
                    style={{ marginLeft: '10px' }}
                  />
                  הפעל פדל
                </label>
                
                <div style={{ 
                  padding: '15px',
                  backgroundColor: 'rgba(15, 76, 76, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <p style={{ color: '#26d0ce', margin: '0 0 10px 0' }}>
                    סטטוס: {localSettings.pedal.connected ? 'מחובר ✓' : 'לא מחובר ✗'}
                  </p>
                  {!localSettings.pedal.connected && (
                    <button style={{
                      padding: '8px 16px',
                      backgroundColor: '#26d0ce',
                      color: '#1a2332',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}>
                      חבר פדל
                    </button>
                  )}
                </div>

                <h3 style={{ color: '#26d0ce', marginBottom: '10px' }}>מיפוי כפתורים</h3>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '5px' }}>שמאל</label>
                    <select
                      value={localSettings.pedal.buttonMappings.left || 'forward5'}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        pedal: {
                          ...localSettings.pedal,
                          buttonMappings: { ...localSettings.pedal.buttonMappings, left: e.target.value }
                        }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#0f4c4c',
                        border: '1px solid #26d0ce',
                        color: '#26d0ce',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="playPause">נגן/השהה</option>
                      <option value="forward5">קדימה 5 שניות</option>
                      <option value="forward2.5">קדימה 2.5 שניות</option>
                      <option value="rewind5">אחורה 5 שניות</option>
                      <option value="rewind2.5">אחורה 2.5 שניות</option>
                    </select>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '5px' }}>אמצע</label>
                    <select
                      value={localSettings.pedal.buttonMappings.middle || 'playPause'}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        pedal: {
                          ...localSettings.pedal,
                          buttonMappings: { ...localSettings.pedal.buttonMappings, middle: e.target.value }
                        }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#0f4c4c',
                        border: '1px solid #26d0ce',
                        color: '#26d0ce',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="playPause">נגן/השהה</option>
                      <option value="forward5">קדימה 5 שניות</option>
                      <option value="forward2.5">קדימה 2.5 שניות</option>
                      <option value="rewind5">אחורה 5 שניות</option>
                      <option value="rewind2.5">אחורה 2.5 שניות</option>
                    </select>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '5px' }}>ימין</label>
                    <select
                      value={localSettings.pedal.buttonMappings.right || 'rewind5'}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        pedal: {
                          ...localSettings.pedal,
                          buttonMappings: { ...localSettings.pedal.buttonMappings, right: e.target.value }
                        }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#0f4c4c',
                        border: '1px solid #26d0ce',
                        color: '#26d0ce',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="playPause">נגן/השהה</option>
                      <option value="forward5">קדימה 5 שניות</option>
                      <option value="forward2.5">קדימה 2.5 שניות</option>
                      <option value="rewind5">אחורה 5 שניות</option>
                      <option value="rewind2.5">אחורה 2.5 שניות</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Detect Tab */}
          {activeTab === 'autodetect' && (
            <div className="autodetect-tab">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#26d0ce', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    checked={localSettings.autoDetect.enabled}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      autoDetect: { ...localSettings.autoDetect, enabled: e.target.checked }
                    })}
                    style={{ marginLeft: '10px' }}
                  />
                  הפעל זיהוי אוטומטי
                </label>

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#26d0ce', marginBottom: '10px' }}>מצב זיהוי</h3>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', color: '#e0e0e0' }}>
                      <input
                        type="radio"
                        name="mode"
                        value="regular"
                        checked={localSettings.autoDetect.mode === 'regular'}
                        onChange={() => setLocalSettings({
                          ...localSettings,
                          autoDetect: { ...localSettings.autoDetect, mode: 'regular' }
                        })}
                        style={{ marginLeft: '5px' }}
                      />
                      רגיל
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', color: '#e0e0e0' }}>
                      <input
                        type="radio"
                        name="mode"
                        value="enhanced"
                        checked={localSettings.autoDetect.mode === 'enhanced'}
                        onChange={() => setLocalSettings({
                          ...localSettings,
                          autoDetect: { ...localSettings.autoDetect, mode: 'enhanced' }
                        })}
                        style={{ marginLeft: '5px' }}
                      />
                      משופר
                    </label>
                  </div>
                </div>

                {localSettings.autoDetect.mode === 'regular' && (
                  <div style={{ 
                    padding: '15px',
                    backgroundColor: 'rgba(15, 76, 76, 0.3)',
                    borderRadius: '4px'
                  }}>
                    <p style={{ color: '#e0e0e0', marginBottom: '10px' }}>
                      במצב רגיל: המדיה נעצרת מיד עם תחילת ההקלדה וממשיכה לאחר הפסקה בהקלדה.
                    </p>
                    <label style={{ color: '#26d0ce', display: 'block', marginBottom: '5px' }}>
                      השהייה להמשך נגינה (ms):
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="5000"
                      step="100"
                      value={localSettings.autoDetect.firstPauseDelay}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        autoDetect: { ...localSettings.autoDetect, firstPauseDelay: Number(e.target.value) }
                      })}
                      style={{
                        padding: '5px',
                        backgroundColor: '#0f4c4c',
                        border: '1px solid #26d0ce',
                        color: '#26d0ce',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                )}

                {localSettings.autoDetect.mode === 'enhanced' && (
                  <div style={{ 
                    padding: '15px',
                    backgroundColor: 'rgba(15, 76, 76, 0.3)',
                    borderRadius: '4px'
                  }}>
                    <p style={{ color: '#e0e0e0', marginBottom: '10px' }}>
                      במצב משופר: המדיה ממשיכה לנגן עם תחילת ההקלדה, נעצרת לאחר הפסקה ראשונה, וממשיכה לאחר הפסקה שנייה.
                    </p>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ color: '#26d0ce', display: 'block', marginBottom: '5px' }}>
                        הפסקה ראשונה לעצירה (ms):
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        step="100"
                        value={localSettings.autoDetect.firstPauseDelay}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          autoDetect: { ...localSettings.autoDetect, firstPauseDelay: Number(e.target.value) }
                        })}
                        style={{
                          padding: '5px',
                          backgroundColor: '#0f4c4c',
                          border: '1px solid #26d0ce',
                          color: '#26d0ce',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ color: '#26d0ce', display: 'block', marginBottom: '5px' }}>
                        הפסקה שנייה להמשך (ms):
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        step="100"
                        value={localSettings.autoDetect.secondPauseDelay}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          autoDetect: { ...localSettings.autoDetect, secondPauseDelay: Number(e.target.value) }
                        })}
                        style={{
                          padding: '5px',
                          backgroundColor: '#0f4c4c',
                          border: '1px solid #26d0ce',
                          color: '#26d0ce',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ color: '#26d0ce', display: 'block', marginBottom: '5px' }}>
                        המשך אוטומטי לאחר (ms):
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        value={localSettings.autoDetect.autoResumeDelay}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          autoDetect: { ...localSettings.autoDetect, autoResumeDelay: Number(e.target.value) }
                        })}
                        style={{
                          padding: '5px',
                          backgroundColor: '#0f4c4c',
                          border: '1px solid #26d0ce',
                          color: '#26d0ce',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{
          padding: '15px 20px',
          borderTop: '1px solid #26d0ce',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: 'transparent',
              color: '#26d0ce',
              border: '1px solid #26d0ce',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              backgroundColor: '#26d0ce',
              color: '#1a2332',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}