'use client';

import React, { useState, useEffect } from 'react';
import AutoDetectRegular from './AutoDetectRegular';
import AutoDetectEnhanced from './AutoDetectEnhanced';

interface AutoDetectTabProps {
  autoDetectEnabled: boolean;
  onAutoDetectEnabledChange: (enabled: boolean) => void;
  onModeChange?: (mode: 'regular' | 'enhanced') => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onRewind?: (seconds: number) => void;
}

export default function AutoDetectTab({ 
  autoDetectEnabled, 
  onAutoDetectEnabledChange,
  onModeChange,
  isPlaying = false,
  onPlayPause,
  onRewind
}: AutoDetectTabProps) {
  // Load saved settings or use defaults
  const loadAutoDetectSettings = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('autoDetectSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error loading auto-detect settings:', e);
        }
      }
    }
    // Default settings
    return {
      mode: 'regular' as 'regular' | 'enhanced',
      regularDelay: 2.0,
      enhancedFirstPauseDelay: 1.5,
      enhancedSecondPauseDelay: 1.5,
      enhancedResumeDelay: 2.0,
      rewindOnPause: { enabled: false, amount: 0.3 }
    };
  };

  // State - use defaults initially to avoid hydration mismatch
  const [mode, setMode] = useState<'regular' | 'enhanced'>('regular');
  const [regularDelay, setRegularDelay] = useState(2.0);
  const [enhancedFirstPauseDelay, setEnhancedFirstPauseDelay] = useState(1.5);
  const [enhancedSecondPauseDelay, setEnhancedSecondPauseDelay] = useState(1.5);
  const [enhancedResumeDelay, setEnhancedResumeDelay] = useState(2.0);
  const [rewindOnPause, setRewindOnPause] = useState({ enabled: false, amount: 0.3 });

  // Load saved settings after mount to avoid hydration issues
  useEffect(() => {
    const initialSettings = loadAutoDetectSettings();
    setMode(initialSettings.mode);
    setRegularDelay(initialSettings.regularDelay);
    setEnhancedFirstPauseDelay(initialSettings.enhancedFirstPauseDelay);
    setEnhancedSecondPauseDelay(initialSettings.enhancedSecondPauseDelay);
    setEnhancedResumeDelay(initialSettings.enhancedResumeDelay);
    setRewindOnPause(initialSettings.rewindOnPause);
  }, []); // Only run once on mount

  // Save settings whenever they change
  const saveSettings = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const settings = {
        mode,
        regularDelay,
        enhancedFirstPauseDelay,
        enhancedSecondPauseDelay,
        enhancedResumeDelay,
        rewindOnPause
      };
      localStorage.setItem('autoDetectSettings', JSON.stringify(settings));
    }
  };

  useEffect(() => {
    saveSettings();
  }, [mode, regularDelay, enhancedFirstPauseDelay, enhancedSecondPauseDelay, enhancedResumeDelay, rewindOnPause]);

  // Notify parent of mode change
  useEffect(() => {
    if (onModeChange) {
      onModeChange(mode);
    }
  }, [mode, onModeChange]);

  // Handle mode change
  const handleModeChange = (newMode: 'regular' | 'enhanced') => {
    setMode(newMode);
  };

  return (
    <>
      {/* Regular Mode Logic (when enabled) */}
      {mode === 'regular' && (
        <AutoDetectRegular
          enabled={autoDetectEnabled}
          delay={regularDelay}
          rewindOnPause={rewindOnPause}
          isPlaying={isPlaying || false}
          onPlayPause={onPlayPause || (() => {})}
          onRewind={onRewind}
        />
      )}
      
      {/* Enhanced Mode Logic */}
      {mode === 'enhanced' && (
        <AutoDetectEnhanced
          enabled={autoDetectEnabled}
          firstPauseDelay={enhancedFirstPauseDelay}
          secondPauseDelay={enhancedSecondPauseDelay}
          autoResumeDelay={enhancedResumeDelay}
          rewindOnPause={rewindOnPause}
          isPlaying={isPlaying || false}
          onPlayPause={onPlayPause || (() => {})}
          onRewind={onRewind}
        />
      )}
      
      <div className="auto-detect-container">
      {/* Header matching other tabs */}
      <div className="media-auto-detect-header">
        <h3>🔍 זיהוי אוטומטי</h3>
        <p className="auto-detect-hint">עצור והפעל אוטומטית של המדיה בזמן הקלדה</p>
        <div className="media-auto-detect-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="autoDetectEnabledToggle"
              checked={autoDetectEnabled}
              onChange={(e) => onAutoDetectEnabledChange(e.target.checked)}
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
              checked={mode === 'regular'}
              onChange={() => handleModeChange('regular')}
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
              checked={mode === 'enhanced'}
              onChange={() => handleModeChange('enhanced')}
            />
            <div className="mode-card">
              <span className="mode-icon">⚡</span>
              <span className="mode-title">משופר</span>
              <span className="mode-description">המשך בזמן הקלדה, עצור בהפסקה ראשונה</span>
            </div>
          </label>
        </div>
      </div>

      {/* Settings */}
      <div className="auto-detect-settings-section">
        <h3>הגדרות זיהוי</h3>
        <div className="auto-detect-settings">
          {/* Regular Mode Settings */}
          <div className="regular-mode-settings" style={{ display: mode === 'regular' ? 'block' : 'none' }}>
            <div className="setting-item">
              <label>השהייה לפני חידוש הנגינה (שניות):</label>
              <div className="number-input-wrapper">
                <button 
                  className="spinner-btn decrease"
                  onClick={() => setRegularDelay(Math.max(0.5, regularDelay - 0.1))}
                  type="button"
                >
                  −
                </button>
                <input
                  type="number"
                  className="auto-detect-input"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={regularDelay.toFixed(1)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0.5 && val <= 5) {
                      setRegularDelay(val);
                    }
                  }}
                />
                <button 
                  className="spinner-btn increase"
                  onClick={() => setRegularDelay(Math.min(5, regularDelay + 0.1))}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Mode Settings */}
          <div className="enhanced-mode-settings" style={{ display: mode === 'enhanced' ? 'block' : 'none' }}>
            <div className="setting-item">
              <label>השהייה עד הפסקה ראשונה (שניות):</label>
              <div className="number-input-wrapper">
                <button 
                  className="spinner-btn decrease"
                  onClick={() => setEnhancedFirstPauseDelay(Math.max(0.5, enhancedFirstPauseDelay - 0.1))}
                  type="button"
                >
                  −
                </button>
                <input
                  type="number"
                  className="auto-detect-input"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={enhancedFirstPauseDelay.toFixed(1)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0.5 && val <= 5) {
                      setEnhancedFirstPauseDelay(val);
                    }
                  }}
                />
                <button 
                  className="spinner-btn increase"
                  onClick={() => setEnhancedFirstPauseDelay(Math.min(5, enhancedFirstPauseDelay + 0.1))}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            <div className="setting-item">
              <label>השהייה עד הפסקה שנייה (שניות):</label>
              <div className="number-input-wrapper">
                <button 
                  className="spinner-btn decrease"
                  onClick={() => setEnhancedSecondPauseDelay(Math.max(0.5, enhancedSecondPauseDelay - 0.1))}
                  type="button"
                >
                  −
                </button>
                <input
                  type="number"
                  className="auto-detect-input"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={enhancedSecondPauseDelay.toFixed(1)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0.5 && val <= 5) {
                      setEnhancedSecondPauseDelay(val);
                    }
                  }}
                />
                <button 
                  className="spinner-btn increase"
                  onClick={() => setEnhancedSecondPauseDelay(Math.min(5, enhancedSecondPauseDelay + 0.1))}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            <div className="setting-item">
              <label>השהייה לחידוש אוטומטי (שניות):</label>
              <div className="number-input-wrapper">
                <button 
                  className="spinner-btn decrease"
                  onClick={() => setEnhancedResumeDelay(Math.max(0.5, enhancedResumeDelay - 0.1))}
                  type="button"
                >
                  −
                </button>
                <input
                  type="number"
                  className="auto-detect-input"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={enhancedResumeDelay.toFixed(1)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0.5 && val <= 5) {
                      setEnhancedResumeDelay(val);
                    }
                  }}
                />
                <button 
                  className="spinner-btn increase"
                  onClick={() => setEnhancedResumeDelay(Math.min(5, enhancedResumeDelay + 0.1))}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="auto-detect-status-section">
        <h3>מצב נוכחי</h3>
        <div className="auto-detect-status">
          <div className={`status-indicator ${autoDetectEnabled ? 'active' : ''}`}>
            <span className="status-icon" style={{ color: autoDetectEnabled ? '#20c997' : '#666' }}>•</span>
            <span className="status-text">{autoDetectEnabled ? 'פעיל' : 'כבוי'}</span>
          </div>
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
                checked={rewindOnPause.enabled}
                onChange={(e) => setRewindOnPause({
                  ...rewindOnPause,
                  enabled: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span>אפשר חזרה אחורה בעצירה</span>
          </div>
          <div className={`rewind-amount-container ${rewindOnPause.enabled ? '' : 'disabled'}`}>
            <label>כמות (שניות):</label>
            <div className="number-input-wrapper">
              <button 
                className="spinner-btn decrease"
                onClick={() => setRewindOnPause({
                  ...rewindOnPause,
                  amount: Math.max(0.1, rewindOnPause.amount - 0.1)
                })}
                disabled={!rewindOnPause.enabled}
                type="button"
              >
                −
              </button>
              <input
                type="number"
                className="auto-detect-input"
                min="0.1"
                max="2.0"
                step="0.1"
                value={rewindOnPause.amount.toFixed(1)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0.1 && val <= 2.0) {
                    setRewindOnPause({
                      ...rewindOnPause,
                      amount: val
                    });
                  }
                }}
                disabled={!rewindOnPause.enabled}
              />
              <button 
                className="spinner-btn increase"
                onClick={() => setRewindOnPause({
                  ...rewindOnPause,
                  amount: Math.min(2.0, rewindOnPause.amount + 0.1)
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
    </div>
    </>
  );
}