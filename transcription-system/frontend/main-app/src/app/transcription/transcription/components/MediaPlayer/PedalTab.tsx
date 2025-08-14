'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PedalTabProps {
  pedalEnabled: boolean;
  onPedalEnabledChange: (enabled: boolean) => void;
  onPedalAction?: (action: string) => void;
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

export default function PedalTab({ pedalEnabled, onPedalEnabledChange, onPedalAction }: PedalTabProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHttps, setIsHttps] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  
  // Use ref to track current pedalEnabled state to avoid closure issues
  const pedalEnabledRef = useRef(pedalEnabled);
  useEffect(() => {
    pedalEnabledRef.current = pedalEnabled;
  }, [pedalEnabled]);
  
  // Load saved pedal settings or use defaults
  const loadPedalSettings = () => {
    // Check if we're in the browser
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('pedalSettings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          // Loaded saved pedal settings
          return {
            left: settings.leftAction || 'skipBackward2.5',
            center: settings.centerAction || 'playPause',
            right: settings.rightAction || 'skipForward2.5',
            continuousEnabled: settings.continuousEnabled !== undefined ? settings.continuousEnabled : true,
            continuousInterval: settings.continuousInterval || 0.5,
            rewindOnPause: settings.rewindOnPause || { enabled: false, amount: 0.3 }
          };
        } catch (e) {
          console.error('Error loading pedal settings:', e);
          // Clear corrupted settings
          localStorage.removeItem('pedalSettings');
        }
      }
    }
    // Using default pedal settings
    return {
      left: 'skipForward2.5',    // LEFT pedal goes FORWARD
      center: 'playPause', 
      right: 'skipBackward2.5',   // RIGHT pedal goes BACKWARD
      continuousEnabled: true,
      continuousInterval: 0.5,
      rewindOnPause: { enabled: false, amount: 0.3 }
    };
  };
  
  // Use a single state object for all pedal mappings like the original
  const [pedalMappings, setPedalMappings] = useState(() => {
    const settings = loadPedalSettings();
    return {
      left: settings.left,
      center: settings.center,
      right: settings.right
    };
  });
  
  // Helper functions to update individual mappings
  const updateLeftAction = (value: string) => {
    setPedalMappings(prev => {
      const newMappings = { ...prev, left: value };
      return newMappings;
    });
  };
  
  const updateCenterAction = (value: string) => {
    setPedalMappings(prev => {
      const newMappings = { ...prev, center: value };
      return newMappings;
    });
  };
  
  const updateRightAction = (value: string) => {
    setPedalMappings(prev => {
      const newMappings = { ...prev, right: value };
      return newMappings;
    });
  };
  
  // Load initial settings
  const initialSettings = loadPedalSettings();
  
  // Continuous press settings
  const [continuousEnabled, setContinuousEnabled] = useState(initialSettings.continuousEnabled);
  const [continuousInterval, setContinuousInterval] = useState(initialSettings.continuousInterval);
  
  // Rewind on pause settings
  const [rewindOnPause, setRewindOnPause] = useState(initialSettings.rewindOnPause);
  
  // Test display
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const continuousPressInterval = useRef<number | null>(null);
  const lastButtonState = useRef<number>(0);

  // Save pedal settings whenever they change
  const savePedalSettings = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const settings = {
        leftAction: pedalMappings.left,
        centerAction: pedalMappings.center,
        rightAction: pedalMappings.right,
        continuousEnabled,
        continuousInterval,
        rewindOnPause
      };
      localStorage.setItem('pedalSettings', JSON.stringify(settings));
      // Saved pedal settings
    }
  };
  
  // Save settings whenever they change
  useEffect(() => {
    savePedalSettings();
  }, [pedalMappings, continuousEnabled, continuousInterval, rewindOnPause]);
  
  useEffect(() => {
    // Check if we're on HTTPS or localhost (which is also secure)
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === '[::1]';
    const isSecure = window.location.protocol === 'https:' || isLocalhost;
    setIsHttps(isSecure);
    
    // Try to auto-reconnect to previously connected pedal after a longer delay
    // to ensure all components are mounted and any other operations are complete
    if (isSecure) {
      setTimeout(() => {
        if (autoReconnectPedalRef.current && !isConnected && !isConnecting) {
          // console.log('Starting auto-reconnect attempt...');
          autoReconnectPedalRef.current().catch((error) => {
            console.error('Auto-reconnect failed:', error);
            // Silently fail auto-reconnect - user can manually connect
          });
        }
      }, 2000); // Increased delay further to avoid conflicts
    }
  }, []);

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };
  
  // Handle input report from pedal - defined early for use in connect/disconnect
  const handleInputReport = (event: any) => {
    // Check if pedal is enabled using ref to avoid closure issues
    if (!pedalEnabledRef.current) {
      return; // Ignore all pedal input when disabled
    }
    
    const { data, reportId } = event;
    
    // Parse the data to determine which button was pressed
    // This varies by pedal model - common patterns:
    const bytes = new Uint8Array(data.buffer);
    
    // Debug logging - helps identify pedal patterns (commented out for production)
    // console.log('Pedal input report:', {
    //   reportId,
    //   bytes: Array.from(bytes),
    //   hex: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
    // });
    
    if (bytes.length === 0) return;
    
    const buttonByte = bytes[0];
    
    // Detect button changes (press/release)
    if (buttonByte !== lastButtonState.current) {
      lastButtonState.current = buttonByte;
      
      // Determine which button based on the byte value
      let buttonPressed: string | null = null;
      
      // Pattern 1: Bit flags (most common)
      if (buttonByte & 0x01) buttonPressed = 'left';
      else if (buttonByte & 0x02) buttonPressed = 'center';
      else if (buttonByte & 0x04) buttonPressed = 'right';
      
      // Pattern 2: Direct byte values
      if (!buttonPressed && buttonByte > 0) {
        switch (buttonByte) {
          case 1:
            buttonPressed = 'left';
            break;
          case 2:
            buttonPressed = 'center';
            break;
          case 3:
          case 4:
            buttonPressed = 'right';
            break;
        }
      }
      
      // Pattern 3: Check second byte for some models
      if (!buttonPressed && bytes.length > 1) {
        const secondByte = bytes[1];
        if (secondByte > 0) {
          switch (secondByte) {
            case 1:
              buttonPressed = 'left';
              break;
            case 2:
              buttonPressed = 'center';
              break;
            case 3:
            case 4:
              buttonPressed = 'right';
              break;
          }
        }
      }
      
      // Handle button press or release
      if (buttonPressed) {
        handlePedalPress(buttonPressed);
      } else {
        // Button release (value is 0)
        handlePedalRelease();
      }
    }
  };
  
  // Handle pedal button press
  const handlePedalPress = (button: string) => {
    // Use ref to check current enabled state to avoid closure issues
    if (!pedalEnabledRef.current || !onPedalAction) {
      return;
    }
    
    // Visual feedback
    setPressedButton(button);
    
    // Get the current action from localStorage to avoid stale closure issues
    let action = '';
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('pedalSettings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          switch (button) {
            case 'left':
              action = settings.leftAction || 'skipBackward2.5';
              break;
            case 'center':
              action = settings.centerAction || 'playPause';
              break;
            case 'right':
              action = settings.rightAction || 'skipForward2.5';
              break;
          }
        } catch (e) {
          // Fall back to state if localStorage fails
          switch (button) {
            case 'left':
              action = pedalMappings.left;
              break;
            case 'center':
              action = pedalMappings.center;
              break;
            case 'right':
              action = pedalMappings.right;
              break;
          }
        }
      } else {
        // No saved settings, use state
        switch (button) {
          case 'left':
            action = pedalMappings.left;
            break;
          case 'center':
            action = pedalMappings.center;
            break;
          case 'right':
            action = pedalMappings.right;
            break;
        }
      }
    }
    
    if (action && action !== 'none') {
      // Execute the action immediately
      console.warn('PEDAL ACTION:', action);  // Using warn to make it more visible
      onPedalAction(action);
      
      // If continuous mode is enabled and this is a skip/navigation action
      const continuousActions = [
        'skipBackward2.5', 'skipForward2.5',
        'skipBackward5', 'skipForward5', 
        'skipBackward10', 'skipForward10'
      ];
      
      // Get current continuous settings from localStorage too
      let currentContinuousEnabled = continuousEnabled;
      let currentContinuousInterval = continuousInterval;
      
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('pedalSettings');
        if (saved) {
          try {
            const settings = JSON.parse(saved);
            currentContinuousEnabled = settings.continuousEnabled !== undefined ? settings.continuousEnabled : true;
            currentContinuousInterval = settings.continuousInterval || 0.5;
          } catch (e) {
            // Use state values as fallback
          }
        }
      }
      
      if (currentContinuousEnabled && continuousActions.includes(action)) {
        // Start continuous action
        continuousPressInterval.current = window.setInterval(() => {
          onPedalAction(action);
        }, currentContinuousInterval * 1000);
      }
    }
  };
  
  // Handle pedal button release
  const handlePedalRelease = () => {
    // Clear visual feedback
    setPressedButton(null);
    
    // Stop continuous action if running
    if (continuousPressInterval.current) {
      clearInterval(continuousPressInterval.current);
      continuousPressInterval.current = null;
    }
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

    // If already connected, just show status
    if (isConnected && connectedDevice) {
      showStatus('הדוושה כבר מחוברת');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Request HID device access
      const devices = await (navigator as any).hid.requestDevice({
        filters: []
      });
      
      if (devices.length > 0) {
        const device = devices[0];
        
        // Check if this is the same device that's already connected
        if (connectedDevice && connectedDevice === device) {
          showStatus('הדוושה כבר מחוברת');
          setIsConnecting(false);
          return;
        }
        
        // Disconnect old device if any
        if (connectedDevice) {
          try {
            connectedDevice.removeEventListener('inputreport', handleInputReport);
            await connectedDevice.close();
          } catch (e) {
            // Error closing old device
          }
        }
        
        // Open the new device only if not already open
        try {
          if (!device.opened) {
            await device.open();
          }
        } catch (openError) {
          console.error('Error opening device:', openError);
          // Device might already be open from auto-reconnect
          if (openError instanceof Error && openError.name === 'InvalidStateError') {
            // Device already open, continuing...
          } else {
            throw openError;
          }
        }
        
        // Store the device
        setConnectedDevice(device);
        setIsConnected(true);
        setShowMappings(true);
        showStatus('הדוושה חוברה בהצלחה');
        
        // Set up event listener for input reports
        device.addEventListener('inputreport', handleInputReport);
        
        // Save device info for auto-reconnect
        savePedalDeviceInfo(device);
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

  const handleDisconnect = async () => {
    if (connectedDevice) {
      try {
        connectedDevice.removeEventListener('inputreport', handleInputReport);
        await connectedDevice.close();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
      setConnectedDevice(null);
    }
    
    // Clear any continuous press interval
    if (continuousPressInterval.current) {
      clearInterval(continuousPressInterval.current);
      continuousPressInterval.current = null;
    }
    
    setIsConnected(false);
    setShowMappings(false);
    showStatus('הדוושה נותקה');
    
    // Clear saved device info
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pedalDeviceInfo');
    }
  };

  const handleTestButton = (button: string, event: 'press' | 'release' = 'press') => {
    if (event === 'press') {
      // Use the pedal press handler for consistent behavior
      handlePedalPress(button);
    } else {
      // Use the pedal release handler for consistent behavior
      handlePedalRelease();
    }
  };
  
  // Save pedal device info for auto-reconnect
  const savePedalDeviceInfo = (device: any) => {
    if (typeof localStorage !== 'undefined') {
      try {
        const deviceInfo = {
          vendorId: device.vendorId,
          productId: device.productId,
          productName: device.productName
        };
        localStorage.setItem('pedalDeviceInfo', JSON.stringify(deviceInfo));
        // console.log('Saved pedal device info for auto-reconnect:', deviceInfo);
      } catch (error) {
        console.error('Error saving pedal device info:', error);
      }
    }
  };
  
  // Auto-reconnect needs to be defined after handleInputReport
  const autoReconnectPedalRef = useRef<() => Promise<void>>(() => Promise.resolve());
  
  // Auto-reconnect to previously connected pedal
  const autoReconnectPedal = async () => {
    try {
      if (typeof localStorage === 'undefined') return;
      
      // Prevent concurrent auto-reconnect attempts
      if (isAutoReconnecting || isConnecting || isConnected) {
        return;
      }
      
      const savedInfo = localStorage.getItem('pedalDeviceInfo');
      if (!savedInfo) {
        // console.log('No saved pedal device info');
        return;
      }
      
      const deviceInfo = JSON.parse(savedInfo);
      // console.log('Attempting auto-reconnect to pedal:', deviceInfo);
      
      setIsAutoReconnecting(true);
      showStatus('מנסה להתחבר מחדש לדוושה...');
      
      // Check if we have the required APIs
      if (!('hid' in navigator)) {
        // console.log('WebHID not available for auto-reconnect');
        setIsAutoReconnecting(false);
        return;
      }
      
      // Get already paired devices
      const devices = await (navigator as any).hid.getDevices();
      // console.log('Found', devices.length, 'paired HID devices');
      
      // Find matching device
      const matchingDevice = devices.find((d: any) => 
        d.vendorId === deviceInfo.vendorId && 
        d.productId === deviceInfo.productId
      );
      
      if (matchingDevice) {
        // console.log('Found previously connected pedal, reconnecting...');
        // console.log('Device opened state:', matchingDevice.opened);
        
        // Check if device is already opened
        if (matchingDevice.opened) {
          // console.log('Device is already open, using it as-is');
          
          // Store the device
          setConnectedDevice(matchingDevice);
          setIsConnected(true);
          setShowMappings(true);
          
          // Set up event listener
          matchingDevice.addEventListener('inputreport', handleInputReport);
          // console.log('Event listener attached to already-open device');
          
          showStatus('הדוושה כבר מחוברת');
        } else {
          // Try to open the device
          try {
            // console.log('Attempting to open device...');
            await matchingDevice.open();
            // console.log('Device opened successfully');
            
            // Store the device
            setConnectedDevice(matchingDevice);
            setIsConnected(true);
            setShowMappings(true);
            
            // Set up event listener
            matchingDevice.addEventListener('inputreport', handleInputReport);
            // console.log('Event listener attached');
            
            showStatus('הדוושה חוברה מחדש אוטומטית');
          } catch (openError: any) {
            console.error('Error opening device:', openError);
            
            if (openError.name === 'InvalidStateError') {
              // Device might be in a weird state, show message to user
              showStatus('הדוושה במצב לא תקין - נסה לנתק ולחבר מחדש');
            } else if (openError.message && openError.message.includes('operation that changes the device state is in progress')) {
              // Device is being operated on by another process/tab
              showStatus('הדוושה בשימוש על ידי תהליך אחר - סגור כרטיסיות אחרות');
            } else {
              showStatus('שגיאה בחיבור אוטומטי - נסה לחבר ידנית');
            }
          }
        }
      } else {
        // console.log('Previously connected pedal not found in paired devices');
        showStatus('הדוושה לא נמצאה - יש לחבר מחדש');
      }
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      showStatus('חיבור אוטומטי נכשל');
    } finally {
      setIsAutoReconnecting(false);
    }
  };
  
  // Store the function in a ref so it can be called from useEffect
  autoReconnectPedalRef.current = autoReconnectPedal;
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (continuousPressInterval.current) {
        clearInterval(continuousPressInterval.current);
      }
      if (connectedDevice) {
        handleDisconnect();
      }
    };
  }, []);

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
              {/* Right Button (displays on right side in RTL, controls physical right button) */}
              <div className="pedal-button-visual" data-button="right">
                <div className={`pedal-button-circle ${pressedButton === 'right' ? 'pressed' : ''}`}>
                  <span className="pedal-button-arrow">➡️</span>
                </div>
                <div className="pedal-button-label">ימין</div>
                <select 
                  id="pedal-right-action" 
                  className="pedal-action-select"
                  value={pedalMappings.right}
                  onChange={(e) => {
                    updateRightAction(e.target.value);
                  }}
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
                  value={pedalMappings.center}
                  onChange={(e) => {
                    updateCenterAction(e.target.value);
                  }}
                >
                  {pedalActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Left Button (displays on left side in RTL, controls physical left button) */}
              <div className="pedal-button-visual" data-button="left">
                <div className={`pedal-button-circle ${pressedButton === 'left' ? 'pressed' : ''}`}>
                  <span className="pedal-button-arrow">⬅️</span>
                </div>
                <div className="pedal-button-label">שמאל</div>
                <select 
                  id="pedal-left-action" 
                  className="pedal-action-select"
                  value={pedalMappings.left}
                  onChange={(e) => {
                    updateLeftAction(e.target.value);
                  }}
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
                  <div className="number-input-wrapper">
                    <button 
                      className="spinner-btn decrease"
                      onClick={() => setContinuousInterval(Math.max(0.1, continuousInterval - 0.1))}
                      type="button"
                    >
                      −
                    </button>
                    <input 
                      type="number" 
                      id="pedal-continuous-interval"
                      min="0.1" 
                      max="5" 
                      step="0.1" 
                      value={continuousInterval.toFixed(1)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val >= 0.1 && val <= 5) {
                          setContinuousInterval(val);
                        }
                      }}
                    />
                    <button 
                      className="spinner-btn increase"
                      onClick={() => setContinuousInterval(Math.min(5, continuousInterval + 0.1))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
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
                    className="rewind-amount-input"
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

          {/* Reset Settings Button */}
          <div className="pedal-reset-section">
            <button 
              className="reset-shortcuts-btn"
              onClick={() => {
                // Clear localStorage first
                if (typeof localStorage !== 'undefined') {
                  localStorage.removeItem('pedalSettings');
                  // console.log('Cleared saved pedal settings');
                }
                
                // Reset to defaults
                const defaultMappings = {
                  left: 'skipForward2.5',    // LEFT goes FORWARD
                  center: 'playPause',
                  right: 'skipBackward2.5'   // RIGHT goes BACKWARD
                };
                
                setPedalMappings(defaultMappings);
                setContinuousEnabled(true);
                setContinuousInterval(0.5);
                setRewindOnPause({ enabled: false, amount: 0.3 });
                
                // console.log('Reset pedal settings to:', defaultMappings);
                
                showStatus('ההגדרות אופסו לברירת המחדל');
              }}
            >
              אפס הגדרות לברירת מחדל
            </button>
          </div>
          
          {/* Test Area */}
          <div className="pedal-test-section">
            <h3>בדיקת דוושה</h3>
            <p className="pedal-test-hint">לחץ על כפתורי הדוושה לבדיקה</p>
            <div className="pedal-test-display" id="pedal-test-display">
              <span 
                className={`pedal-test-button ${pressedButton === 'right' ? 'active' : ''}`}
                id="test-right"
                onMouseDown={() => handleTestButton('right', 'press')}
                onMouseUp={() => handleTestButton('right', 'release')}
                onMouseLeave={() => handleTestButton('right', 'release')}
              >➡️</span>
              <span 
                className={`pedal-test-button ${pressedButton === 'center' ? 'active' : ''}`}
                id="test-center"
                onMouseDown={() => handleTestButton('center', 'press')}
                onMouseUp={() => handleTestButton('center', 'release')}
                onMouseLeave={() => handleTestButton('center', 'release')}
              >⏸️</span>
              <span 
                className={`pedal-test-button ${pressedButton === 'left' ? 'active' : ''}`}
                id="test-left"
                onMouseDown={() => handleTestButton('left', 'press')}
                onMouseUp={() => handleTestButton('left', 'release')}
                onMouseLeave={() => handleTestButton('left', 'release')}
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