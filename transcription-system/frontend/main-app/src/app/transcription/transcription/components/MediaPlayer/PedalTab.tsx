'use client';

import React, { useState, useEffect } from 'react';

interface PedalTabProps {
  pedalEnabled: boolean;
  onPedalEnabledChange: (enabled: boolean) => void;
}

// Pedal action options - exactly from original
const pedalActions = [
  { value: 'skipBackward2.5', label: 'דלג אחורה 2.5 שניות' },
  { value: 'skipForward2.5', label: 'דלג קדימה 2.5 שניות' },
  { value: 'skipBackward5', label: 'דלג אחורה 5 שניות' },
  { value: 'skipForward5', label: 'דלג קדימה 5 שניות' },
  { value: 'skipBackward10', label: 'דלג אחורה 10 שניות' },
  { value: 'skipForward10', label: 'דלג קדימה 10 שניות' },
  { value: 'playPause', label: 'הפעל/השהה' },
  { value: 'speedUp', label: 'הגבר מהירות' },
  { value: 'speedDown', label: 'הנמך מהירות' },
  { value: 'speedReset', label: 'אפס מהירות' },
  { value: 'volumeUp', label: 'הגבר ווליום' },
  { value: 'volumeDown', label: 'הנמך ווליום' },
  { value: 'mute', label: 'השתק/בטל השתקה' },
  { value: 'jumpToStart', label: 'קפוץ להתחלה' },
  { value: 'jumpToEnd', label: 'קפוץ לסוף' },
  { value: 'none', label: 'ללא פעולה' }
];

export default function PedalTab({ pedalEnabled, onPedalEnabledChange }: PedalTabProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHttps, setIsHttps] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  
  // Pedal button mappings
  const [leftAction, setLeftAction] = useState('skipBackward2.5');
  const [centerAction, setCenterAction] = useState('playPause');
  const [rightAction, setRightAction] = useState('skipForward2.5');
  
  // Continuous press settings
  const [continuousEnabled, setContinuousEnabled] = useState(true);
  const [continuousInterval, setContinuousInterval] = useState(0.5);
  
  // Rewind on pause settings
  const [rewindOnPause, setRewindOnPause] = useState({ enabled: false, amount: 0.3 });
  
  // Test display
  const [pressedButton, setPressedButton] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're on HTTPS
    setIsHttps(window.location.protocol === 'https:');
  }, []);

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const handleConnect = async () => {
    if (!isHttps) {
      showStatus('דרוש חיבור HTTPS לשימוש בדוושה');
      return;
    }

    if (!('hid' in navigator)) {
      showStatus('הדפדפן לא תומך ב-WebHID API');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Request HID device access
      const devices = await (navigator as any).hid.requestDevice({
        filters: []
      });
      
      if (devices.length > 0) {
        // For now, just simulate connection
        setIsConnected(true);
        setShowMappings(true);
        showStatus('הדוושה חוברה בהצלחה');
      } else {
        showStatus('לא נבחרה דוושה');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      showStatus('החיבור נכשל');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setShowMappings(false);
    showStatus('הדוושה נותקה');
  };

  const handleTestButton = (button: string) => {
    setPressedButton(button);
    setTimeout(() => setPressedButton(null), 200);
  };

  return (
    <div className="pedal-settings-container">
      {/* Header matching shortcuts tab - EXACT structure */}
      <div className="media-pedal-header">
        <h3>🦶 דוושת רגל</h3>
        <p className="pedal-hint">הגדר את כפתורי הדוושה לשליטה בנגן</p>
        <div className="media-pedal-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="pedal-enabled-toggle"
              checked={pedalEnabled}
              onChange={(e) => onPedalEnabledChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">דוושה פעילה</span>
        </div>
      </div>

      {/* HTTPS Warning for HTTP connections */}
      {!isHttps && (
        <div className="pedal-https-warning">
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <p className="warning-title">נדרש חיבור מאובטח (HTTPS)</p>
            <p className="warning-text">
              לשימוש בדוושת USB, יש לגשת לאתר דרך חיבור מאובטח.
              בקר בכתובת: <a href="https://yalitranscription.duckdns.org" target="_blank" rel="noopener noreferrer">
                https://yalitranscription.duckdns.org
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="pedal-connection-section">
        <div className="pedal-connection-content">
          <div className="pedal-status">
            <span id="pedal-status-icon" className={isConnected ? 'connected' : ''}>
              {isConnected ? '🟢' : '⚪'}
            </span>
            <span id="pedal-status-text">
              {isConnected ? 'מחובר' : 'לא מחובר'}
            </span>
          </div>
          {!isConnected ? (
            <>
              <button 
                id="pedal-connect-btn" 
                className="pedal-connect-button"
                onClick={handleConnect}
                disabled={isConnecting || !isHttps}
              >
                {isConnecting ? 'מתחבר...' : 'התחבר לדוושה'}
              </button>
              <p className="pedal-help-text">
                לחץ על "התחבר לדוושה" ובחר את המכשיר מהרשימה
              </p>
            </>
          ) : (
            <button 
              className="pedal-disconnect-button"
              onClick={handleDisconnect}
            >
              נתק דוושה
            </button>
          )}
        </div>
      </div>

      {/* Button Mappings - shown only when connected */}
      {showMappings && (
        <div className="pedal-mappings-section" id="pedal-mappings">
          <h3>הגדרות כפתורים</h3>
          
          {/* Visual Pedal Interface */}
          <div className="pedal-visual-container">
            <div className="pedal-visual">
              {/* Left Button (Right in Hebrew RTL) */}
              <div className="pedal-button-visual" data-button="left">
                <div className={`pedal-button-circle ${pressedButton === 'left' ? 'pressed' : ''}`}>
                  <span className="pedal-button-arrow">➡️</span>
                </div>
                <div className="pedal-button-label">ימין</div>
                <select 
                  id="pedal-left-action" 
                  className="pedal-action-select"
                  value={leftAction}
                  onChange={(e) => setLeftAction(e.target.value)}
                >
                  {pedalActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Center Button */}
              <div className="pedal-button-visual" data-button="center">
                <div className={`pedal-button-circle ${pressedButton === 'center' ? 'pressed' : ''}`}>
                  <span className="pedal-button-arrow">⏸️</span>
                </div>
                <div className="pedal-button-label">מרכז</div>
                <select 
                  id="pedal-center-action" 
                  className="pedal-action-select"
                  value={centerAction}
                  onChange={(e) => setCenterAction(e.target.value)}
                >
                  {pedalActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Right Button (Left in Hebrew RTL) */}
              <div className="pedal-button-visual" data-button="right">
                <div className={`pedal-button-circle ${pressedButton === 'right' ? 'pressed' : ''}`}>
                  <span className="pedal-button-arrow">⬅️</span>
                </div>
                <div className="pedal-button-label">שמאל</div>
                <select 
                  id="pedal-right-action" 
                  className="pedal-action-select"
                  value={rightAction}
                  onChange={(e) => setRightAction(e.target.value)}
                >
                  {pedalActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
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
                id="pedal-continuous-enabled"
                checked={continuousEnabled}
                onChange={(e) => setContinuousEnabled(e.target.checked)}
              />
              <span>אפשר דילוג רציף בלחיצה ממושכת</span>
            </label>
            {continuousEnabled && (
              <div className="pedal-continuous-config" id="pedal-continuous-config">
                <label>
                  מרווח זמן בלחיצה ממושכת (שניות):
                  <input 
                    type="number" 
                    id="pedal-continuous-interval"
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

          {/* Rewind on Pause Section - EXACT like shortcuts tab */}
          <div className="rewind-on-pause-section">
            <h4>⏪ חזור אחורה בעצירה</h4>
            <div className="rewind-on-pause-controls">
              <div className="rewind-on-pause-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    id="pedalRewindOnPauseEnabled"
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
                />
              </div>
            </div>
          </div>

          {/* Test Area */}
          <div className="pedal-test-section">
            <h3>בדיקת דוושה</h3>
            <p className="pedal-test-hint">לחץ על כפתורי הדוושה לבדיקה</p>
            <div className="pedal-test-display" id="pedal-test-display">
              <span 
                className={`pedal-test-button ${pressedButton === 'left' ? 'active' : ''}`}
                id="test-left"
                onClick={() => handleTestButton('left')}
              >➡️</span>
              <span 
                className={`pedal-test-button ${pressedButton === 'center' ? 'active' : ''}`}
                id="test-center"
                onClick={() => handleTestButton('center')}
              >⏸️</span>
              <span 
                className={`pedal-test-button ${pressedButton === 'right' ? 'active' : ''}`}
                id="test-right"
                onClick={() => handleTestButton('right')}
              >⬅️</span>
            </div>
          </div>
        </div>
      )}

      {/* Status message display */}
      {statusMessage && (
        <div className="pedal-status-message visible">
          {statusMessage}
        </div>
      )}
    </div>
  );
}