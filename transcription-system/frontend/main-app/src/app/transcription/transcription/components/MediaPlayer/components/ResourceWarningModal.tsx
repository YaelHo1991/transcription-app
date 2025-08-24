'use client';

import React, { useEffect, useRef } from 'react';
import '../../TextEditor/modal-template.css';

export interface ResourceWarningData {
  fileSize: string;
  memoryNeeded: string;
  memoryAvailable: string;
  message: string;
  messageHebrew: string;
  recommendation?: string;
  alternativeMethod?: string;
}

interface ResourceWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onUseAlternative?: () => void;
  data: ResourceWarningData | null;
  loading?: boolean;
}

export const ResourceWarningModal: React.FC<ResourceWarningModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onUseAlternative,
  data,
  loading = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, loading]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container medium confirmation-modal" ref={modalRef}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">אזהרת משאבי מערכת</h3>
          {!loading && (
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="confirmation-icon">
            ⚠️
          </div>
          
          {/* Hebrew message */}
          <div className="confirmation-message" style={{ marginBottom: '12px' }}>
            {data.messageHebrew}
          </div>
          
          {/* English message */}
          <div className="confirmation-submessage" style={{ marginBottom: '16px', fontSize: '13px', opacity: '0.8' }}>
            {data.message}
          </div>
          
          {/* Resource details */}
          <div className="resource-details" style={{
            background: 'rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            margin: '12px 0',
            fontSize: '13px',
            direction: 'rtl'
          }}>
            <div style={{ marginBottom: '6px' }}>
              <strong>גודל קובץ:</strong> {data.fileSize}
            </div>
            <div style={{ marginBottom: '6px' }}>
              <strong>זיכרון נדרש:</strong> {data.memoryNeeded}
            </div>
            <div>
              <strong>זיכרון זמין:</strong> {data.memoryAvailable}
            </div>
          </div>
          
          {/* Alternative method */}
          {data.alternativeMethod && (
            <div className="confirmation-submessage" style={{
              background: 'rgba(32, 201, 151, 0.1)',
              border: '1px solid rgba(32, 201, 151, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              margin: '12px 0',
              fontSize: '13px',
              direction: 'rtl'
            }}>
              <strong>אפשרות מומלצת:</strong> {data.alternativeMethod}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {data.alternativeMethod && onUseAlternative && (
            <button
              className="modal-btn modal-btn-success"
              onClick={onUseAlternative}
              disabled={loading}
            >
              השתמש באפשרות מומלצת
            </button>
          )}
          <button
            className="modal-btn modal-btn-primary"
            onClick={onContinue}
            disabled={loading}
          >
            המשך בכל זאת
          </button>
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to format bytes
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return ((bytes / 1024).toFixed(1)) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return ((bytes / (1024 * 1024)).toFixed(1)) + ' MB';
  return ((bytes / (1024 * 1024 * 1024)).toFixed(2)) + ' GB';
};