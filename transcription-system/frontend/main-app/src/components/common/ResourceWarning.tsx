/**
 * Resource Warning Component
 */

import React from 'react';
import { SafetyCheck, Recommendation } from '@/lib/services/resourceMonitor';

interface ResourceWarningProps {
  check: SafetyCheck;
  onProceed: () => void;
  onCancel: () => void;
  onUseAlternative?: () => void;
}

export const ResourceWarning: React.FC<ResourceWarningProps> = ({
  check,
  onProceed,
  onCancel,
  onUseAlternative
}) => {
  const getRecommendationColor = () => {
    switch (check.recommendation) {
      case Recommendation.ABORT:
        return '#ff4444';
      case Recommendation.WAIT:
      case Recommendation.CLOSE_OTHER_APPS:
        return '#ff9944';
      case Recommendation.PROCEED_WITH_CAUTION:
        return '#ffcc00';
      case Recommendation.PROCEED:
        return '#44ff44';
      default:
        return '#ffffff';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) return ((bytes / 1024).toFixed(1)) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return ((bytes / (1024 * 1024)).toFixed(1)) + ' MB';
    return ((bytes / (1024 * 1024 * 1024)).toFixed(2)) + ' GB';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 10000,
      maxWidth: '500px',
      direction: 'rtl'
    }}>
      <h3 style={{ 
        color: getRecommendationColor(),
        marginTop: 0 
      }}>
        {check.safe ? '⚠️ אזהרה' : '❌ חסימת פעולה'}
      </h3>
      
      <p style={{ fontSize: '16px' }}>
        {check.messageHebrew}
      </p>
      
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '10px',
        borderRadius: '5px',
        margin: '15px 0'
      }}>
        <div>זיכרון נדרש: {formatBytes(check.estimatedMemoryNeeded)}</div>
        <div>זיכרון זמין: {formatBytes(check.availableMemory)}</div>
        {check.details?.memoryShortfall && (
          <div style={{ color: '#ff9944' }}>
            חסרים: {formatBytes(check.details.memoryShortfall)}
          </div>
        )}
      </div>

      {check.alternativeMethod && (
        <div style={{
          backgroundColor: 'rgba(68, 255, 68, 0.1)',
          padding: '10px',
          borderRadius: '5px',
          margin: '15px 0'
        }}>
          <strong>שיטה חלופית מומלצת:</strong><br />
          {check.alternativeMethod}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px'
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ביטול
        </button>
        
        {check.alternativeMethod && onUseAlternative && (
          <button
            onClick={onUseAlternative}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            השתמש בחלופה
          </button>
        )}
        
        {check.safe && (
          <button
            onClick={onProceed}
            style={{
              padding: '10px 20px',
              backgroundColor: check.recommendation === Recommendation.PROCEED_WITH_CAUTION 
                ? '#ff9944' 
                : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            המשך בכל זאת
          </button>
        )}
      </div>
    </div>
  );
};