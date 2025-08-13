'use client';

import React, { useState } from 'react';
import { MediaPlayerSettings } from '../../types';
import ShortcutsTab from './ShortcutsTab';

interface SettingsModalProps {
  settings: MediaPlayerSettings;
  onSettingsChange: (settings: MediaPlayerSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSettingsChange, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'pedal' | 'autodetect'>('shortcuts');
  const [localSettings, setLocalSettings] = useState<MediaPlayerSettings>(settings);

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
        width: '800px',
        maxWidth: '90vw',
        maxHeight: '90vh',
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
              fontWeight: activeTab === 'shortcuts' ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
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
              fontWeight: activeTab === 'pedal' ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}
          >
            דוושת רגל
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
              fontWeight: activeTab === 'autodetect' ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}
          >
            זיהוי אוטומטי
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-content" style={{
          padding: '20px',
          maxHeight: 'calc(90vh - 180px)',
          overflowY: 'auto'
        }}>
          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <ShortcutsTab
              shortcuts={localSettings.shortcuts}
              shortcutsEnabled={localSettings.shortcutsEnabled}
              rewindOnPause={localSettings.rewindOnPause}
              onShortcutsChange={(shortcuts) => setLocalSettings(prev => ({ ...prev, shortcuts }))}
              onShortcutsEnabledChange={(enabled) => setLocalSettings(prev => ({ ...prev, shortcutsEnabled: enabled }))}
              onRewindOnPauseChange={(rewindSettings) => setLocalSettings(prev => ({ ...prev, rewindOnPause: rewindSettings }))}
            />
          )}

          {/* Pedal Tab - Placeholder for now */}
          {activeTab === 'pedal' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#26d0ce' }}>
              <h3>🦶 דוושת רגל</h3>
              <p style={{ color: 'rgba(224, 247, 247, 0.7)', marginTop: '20px' }}>
                תכונה זו תיושם בשלב 2
              </p>
            </div>
          )}

          {/* Auto-Detect Tab - Placeholder for now */}
          {activeTab === 'autodetect' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#26d0ce' }}>
              <h3>🔍 זיהוי אוטומטי</h3>
              <p style={{ color: 'rgba(224, 247, 247, 0.7)', marginTop: '20px' }}>
                תכונה זו תיושם בשלב 3
              </p>
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
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(38, 208, 206, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
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
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#20c997';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#26d0ce';
            }}
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}