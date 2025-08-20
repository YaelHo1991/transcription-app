'use client';

import React, { useState, useEffect } from 'react';
import './TSessionStatus.css';

interface TSessionStatusProps {
  lastSaveTime: Date | null;
  hasChanges: boolean;
  isSaving: boolean;
  transcriptionNumber: number;
}

export default function TSessionStatus({ 
  lastSaveTime, 
  hasChanges, 
  isSaving,
  transcriptionNumber 
}: TSessionStatusProps) {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    const updateDisplay = () => {
      if (isSaving) {
        setDisplayText('שומר...');
        return;
      }
      
      if (!lastSaveTime) {
        setDisplayText('טרם נשמר');
        return;
      }
      
      const now = Date.now();
      const diff = now - lastSaveTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      
      if (minutes === 0) {
        setDisplayText('נשמר כעת');
      } else if (minutes === 1) {
        setDisplayText('נשמר לפני דקה');
      } else if (minutes < 10) {
        setDisplayText(`נשמר לפני ${minutes} דקות`);
      } else {
        // After 10 minutes, show date and time
        const date = lastSaveTime.toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit'
        });
        const time = lastSaveTime.toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit'
        });
        setDisplayText(`נשמר ב-${date} ${time}`);
      }
    };
    
    updateDisplay();
    const interval = setInterval(updateDisplay, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastSaveTime, isSaving]);
  
  return (
    <div className="t-session-status">
      <span className="t-status-icon">
        {isSaving ? '⏳' : hasChanges ? '📝' : '💾'}
      </span>
      <span className="t-status-text">
        {displayText}
      </span>
      {transcriptionNumber > 0 && (
        <span className="t-status-number">
          תמלול {transcriptionNumber}
        </span>
      )}
    </div>
  );
}