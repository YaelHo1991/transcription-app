'use client';

import React, { useState, useEffect } from 'react';

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

  const initialSettings = loadAutoDetectSettings();
  
  // State
  const [mode, setMode] = useState<'regular' | 'enhanced'>(initialSettings.mode);
  const [regularDelay, setRegularDelay] = useState(initialSettings.regularDelay);
  const [enhancedFirstPauseDelay, setEnhancedFirstPauseDelay] = useState(initialSettings.enhancedFirstPauseDelay);
  const [enhancedSecondPauseDelay, setEnhancedSecondPauseDelay] = useState(initialSettings.enhancedSecondPauseDelay);
  const [enhancedResumeDelay, setEnhancedResumeDelay] = useState(initialSettings.enhancedResumeDelay);
  const [rewindOnPause, setRewindOnPause] = useState(initialSettings.rewindOnPause);
  
  // Typing detection state
  const [isTyping, setIsTyping] = useState(false);
  const [enhancedModeState, setEnhancedModeState] = useState<'idle' | 'typing' | 'firstPause' | 'secondTyping'>('idle');
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const autoResumeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const wasPlayingBeforeTypingRef = React.useRef(false);

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
    setEnhancedModeState('idle');
    // Clear any existing timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (autoResumeTimeoutRef.current) {
      clearTimeout(autoResumeTimeoutRef.current);
      autoResumeTimeoutRef.current = null;
    }
  };

  // Check if element is part of text editor
  const isTextEditorElement = (element: EventTarget | null): boolean => {
    if (!element || !(element instanceof HTMLElement)) return false;
    
    // Check if it's a text input area
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement ||
        element.contentEditable === 'true') {
      
      // Also check for specific classes
      if (element.closest('.transcription-textarea') ||
          element.closest('.text-editor-container') ||
          element.closest('.transcription-text')) {
        return true;
      }
      
      // Skip if it's a settings input
      if (element.closest('.settings-modal') ||
          element.closest('.media-modal-overlay')) {
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  // Handle typing detected
  const handleTypingDetected = () => {
    if (!autoDetectEnabled) return;
    
    if (mode === 'regular') {
      // Regular mode: pause when typing starts
      if (isPlaying && !wasPlayingBeforeTypingRef.current) {
        wasPlayingBeforeTypingRef.current = true;
        
        // Pause playback
        if (onPlayPause) {
          onPlayPause();
        }
        
        // Apply rewind if enabled
        if (rewindOnPause.enabled && rewindOnPause.amount > 0 && onRewind) {
          onRewind(rewindOnPause.amount);
        }
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to resume
      typingTimeoutRef.current = setTimeout(() => {
        if (wasPlayingBeforeTypingRef.current && onPlayPause) {
          onPlayPause(); // Resume
          wasPlayingBeforeTypingRef.current = false;
        }
        setIsTyping(false);
      }, regularDelay * 1000);
      
      setIsTyping(true);
    } else {
      // Enhanced mode: more complex state management
      handleEnhancedModeTyping();
    }
  };

  // Handle enhanced mode typing logic
  const handleEnhancedModeTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    switch (enhancedModeState) {
      case 'idle':
        // Start typing - don't pause yet
        setEnhancedModeState('typing');
        setIsTyping(true);
        
        // Set timeout for first pause
        typingTimeoutRef.current = setTimeout(() => {
          if (isPlaying && onPlayPause) {
            wasPlayingBeforeTypingRef.current = true;
            onPlayPause(); // Pause
            
            // Apply rewind if enabled
            if (rewindOnPause.enabled && rewindOnPause.amount > 0 && onRewind) {
              onRewind(rewindOnPause.amount);
            }
          }
          setEnhancedModeState('firstPause');
          setIsTyping(false);
          
          // Set timeout for auto-resume
          autoResumeTimeoutRef.current = setTimeout(() => {
            if (wasPlayingBeforeTypingRef.current && onPlayPause) {
              onPlayPause(); // Resume
              wasPlayingBeforeTypingRef.current = false;
            }
            setEnhancedModeState('idle');
          }, enhancedResumeDelay * 1000);
        }, enhancedFirstPauseDelay * 1000);
        break;
        
      case 'typing':
        // Still in first typing phase - reset the timer
        typingTimeoutRef.current = setTimeout(() => {
          if (isPlaying && onPlayPause) {
            wasPlayingBeforeTypingRef.current = true;
            onPlayPause(); // Pause
            
            // Apply rewind if enabled
            if (rewindOnPause.enabled && rewindOnPause.amount > 0 && onRewind) {
              onRewind(rewindOnPause.amount);
            }
          }
          setEnhancedModeState('firstPause');
          setIsTyping(false);
          
          // Set timeout for auto-resume
          autoResumeTimeoutRef.current = setTimeout(() => {
            if (wasPlayingBeforeTypingRef.current && onPlayPause) {
              onPlayPause(); // Resume
              wasPlayingBeforeTypingRef.current = false;
            }
            setEnhancedModeState('idle');
          }, enhancedResumeDelay * 1000);
        }, enhancedFirstPauseDelay * 1000);
        break;
        
      case 'firstPause':
        // Resumed typing after first pause
        // Clear auto-resume timeout
        if (autoResumeTimeoutRef.current) {
          clearTimeout(autoResumeTimeoutRef.current);
          autoResumeTimeoutRef.current = null;
        }
        
        setEnhancedModeState('secondTyping');
        setIsTyping(true);
        
        // Set timeout for second pause detection
        typingTimeoutRef.current = setTimeout(() => {
          // After second typing pause, auto-resume
          if (wasPlayingBeforeTypingRef.current && onPlayPause) {
            onPlayPause(); // Resume
            wasPlayingBeforeTypingRef.current = false;
          }
          setEnhancedModeState('idle');
          setIsTyping(false);
        }, enhancedSecondPauseDelay * 1000);
        break;
        
      case 'secondTyping':
        // Continue second typing phase - reset timer
        typingTimeoutRef.current = setTimeout(() => {
          // After second typing pause, auto-resume
          if (wasPlayingBeforeTypingRef.current && onPlayPause) {
            onPlayPause(); // Resume
            wasPlayingBeforeTypingRef.current = false;
          }
          setEnhancedModeState('idle');
          setIsTyping(false);
        }, enhancedSecondPauseDelay * 1000);
        break;
    }
  };

  // Set up typing detection listeners
  useEffect(() => {
    if (!autoDetectEnabled) {
      // Clear any existing timeouts when disabled
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
        autoResumeTimeoutRef.current = null;
      }
      setIsTyping(false);
      setEnhancedModeState('idle');
      wasPlayingBeforeTypingRef.current = false;
      return;
    }

    const handleInput = (event: Event) => {
      if (isTextEditorElement(event.target)) {
        handleTypingDetected();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditorElement(event.target)) {
        handleTypingDetected();
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear timeouts on cleanup
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
      }
    };
  }, [autoDetectEnabled, mode, isPlaying, regularDelay, enhancedFirstPauseDelay, enhancedSecondPauseDelay, enhancedResumeDelay, rewindOnPause]);

  // Get status text based on current state
  const getStatusText = () => {
    if (!autoDetectEnabled) return 'כבוי';
    if (isTyping) return 'מזהה הקלדה';
    if (enhancedModeState === 'firstPause') return 'הפסקה ראשונה';
    if (enhancedModeState === 'secondTyping') return 'הקלדה שנייה';
    return 'ממתין';
  };

  const getEnhancedStatusText = () => {
    switch (enhancedModeState) {
      case 'typing':
        return 'הקלדה - ממשיך נגינה';
      case 'firstPause':
        return 'הפסקה ראשונה - מושהה';
      case 'secondTyping':
        return 'הקלדה נוספת - ממתין לסיום';
      default:
        return '';
    }
  };

  return (
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

          {/* Enhanced Mode Settings */}
          <div className="enhanced-mode-settings" style={{ display: mode === 'enhanced' ? 'block' : 'none' }}>
            <div className="setting-item">
              <label>השהייה עד הפסקה ראשונה (שניות):</label>
              <input
                type="number"
                className="auto-detect-input"
                min="0.5"
                max="5"
                step="0.1"
                value={enhancedFirstPauseDelay}
                onChange={(e) => setEnhancedFirstPauseDelay(Number(e.target.value))}
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
                value={enhancedSecondPauseDelay}
                onChange={(e) => setEnhancedSecondPauseDelay(Number(e.target.value))}
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
        </div>
      </div>

      {/* Status */}
      <div className="auto-detect-status-section">
        <h3>מצב נוכחי</h3>
        <div className="auto-detect-status">
          <div className={`status-indicator ${autoDetectEnabled ? 'active' : ''}`}>
            <span className="status-icon" style={{ color: autoDetectEnabled ? '#20c997' : '#666' }}>•</span>
            <span className="status-text">{getStatusText()}</span>
          </div>
        </div>
        {autoDetectEnabled && mode === 'enhanced' && enhancedModeState !== 'idle' && (
          <div className="enhanced-mode-status" style={{ marginTop: '10px', color: 'rgba(224, 247, 247, 0.8)', fontSize: '13px', textAlign: 'center' }}>
            <span>{getEnhancedStatusText()}</span>
          </div>
        )}
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
            <input
              type="number"
              className="rewind-amount-input"
              min="0.1"
              max="2.0"
              step="0.1"
              value={rewindOnPause.amount}
              onChange={(e) => setRewindOnPause({
                ...rewindOnPause,
                amount: Number(e.target.value) || 0.3
              })}
              disabled={!rewindOnPause.enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}