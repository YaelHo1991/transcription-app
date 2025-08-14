/**
 * Status management utility functions for the MediaPlayer component
 */

/**
 * Status message configuration
 */
export interface StatusConfig {
  duration?: number;  // Duration in milliseconds
  type?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Default status duration (3 seconds)
 */
export const DEFAULT_STATUS_DURATION = 3000;

/**
 * Status timeout reference type
 */
export type StatusTimeoutRef = React.MutableRefObject<NodeJS.Timeout | null>;

/**
 * Show global status message
 */
export function showGlobalStatus(
  message: string,
  setGlobalStatus: (status: string | null) => void,
  config: StatusConfig = {}
): void {
  const duration = config.duration || DEFAULT_STATUS_DURATION;
  
  // Set the status message
  setGlobalStatus(message);
  
  // Clear after duration
  setTimeout(() => {
    setGlobalStatus(null);
  }, duration);
}

/**
 * Show global status with timeout management
 * Cancels previous timeout if exists
 */
export function showGlobalStatusWithTimeout(
  message: string,
  setGlobalStatus: (status: string | null) => void,
  timeoutRef: StatusTimeoutRef,
  config: StatusConfig = {}
): void {
  const duration = config.duration || DEFAULT_STATUS_DURATION;
  
  // Clear existing timeout
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  
  // Set the status message
  setGlobalStatus(message);
  
  // Set new timeout
  timeoutRef.current = setTimeout(() => {
    setGlobalStatus(null);
    timeoutRef.current = null;
  }, duration);
}

/**
 * Clear global status
 */
export function clearGlobalStatus(
  setGlobalStatus: (status: string | null) => void,
  timeoutRef?: StatusTimeoutRef
): void {
  // Clear timeout if exists
  if (timeoutRef?.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  
  // Clear status
  setGlobalStatus(null);
}

/**
 * Status messages type definition
 */
interface StatusMessages {
  shortcuts: {
    enabled: string;
    disabled: string;
  };
  pedal: {
    enabled: string;
    disabled: string;
  };
  autoDetect: {
    enabled: string;
    disabled: string;
    regular: string;
    enhanced: string;
    modeChanged: (mode: 'regular' | 'enhanced') => string;
  };
  waveform: {
    canceled: string;
    error: (error: string) => string;
  };
}

/**
 * Format status messages for different modes
 */
export const statusMessages: StatusMessages = {
  shortcuts: {
    enabled: 'קיצורי מקלדת: פעילים',
    disabled: 'קיצורי מקלדת: כבויים'
  },
  pedal: {
    enabled: 'דוושה: פעילה',
    disabled: 'דוושה: כבויה'
  },
  autoDetect: {
    enabled: 'זיהוי אוטומטי: פעיל',
    disabled: 'זיהוי אוטומטי: כבוי',
    regular: 'מצב זיהוי: רגיל',
    enhanced: 'מצב זיהוי: משופר',
    modeChanged: (mode: 'regular' | 'enhanced') => 
      mode === 'enhanced' ? 'מצב זיהוי: משופר' : 'מצב זיהוי: רגיל'
  },
  waveform: {
    canceled: 'ניתוח צורת גל בוטל - אין מספיק משאבים',
    error: (error: string) => `שגיאה בטעינת צורת גל: ${error}`
  }
};

/**
 * Get formatted status message
 */
export function getStatusMessage(
  type: keyof typeof statusMessages,
  state: string | boolean
): string {
  const messages = statusMessages[type];
  
  if (typeof state === 'boolean') {
    const key = state ? 'enabled' : 'disabled';
    return (messages as any)[key] || '';
  }
  
  return (messages as any)[state] || '';
}