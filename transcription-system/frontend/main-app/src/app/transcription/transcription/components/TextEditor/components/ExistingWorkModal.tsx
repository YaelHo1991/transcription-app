'use client';

import React from 'react';
import './ExistingWorkModal.css';

interface ExistingWorkModalProps {
  isOpen: boolean;
  mediaName: string;
  existingTranscriptions: number;
  onContinue: () => void;
}

export default function ExistingWorkModal({
  isOpen,
  mediaName,
  existingTranscriptions,
  onContinue
}: ExistingWorkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="existing-work-modal-overlay">
      <div className="existing-work-modal">
        <div className="existing-work-modal-header">
          <h3>🔍 עבודה קיימת נמצאה</h3>
        </div>
        
        <div className="existing-work-modal-content">
          <div className="media-info">
            <strong>מדיה:</strong> {mediaName}
          </div>
          
          <div className="existing-info">
            נמצאו <strong>{existingTranscriptions}</strong> תמלילים קיימים עבור המדיה הזו.
            הם נשמרו באותה תיקיה.
          </div>
          
          <div className="action-info">
            תמלול חדש יתווסף לאוסף הקיים.
          </div>
        </div>
        
        <div className="existing-work-modal-footer">
          <button 
            className="continue-btn"
            onClick={onContinue}
            autoFocus
          >
            המשך עם תמלול חדש
          </button>
        </div>
      </div>
    </div>
  );
}