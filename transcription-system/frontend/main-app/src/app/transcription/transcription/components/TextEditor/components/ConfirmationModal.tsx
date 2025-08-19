'use client';

import React, { useEffect, useRef } from 'react';
import '../modal-template.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  showIcon?: boolean;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'אישור פעולה',
  message,
  subMessage,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  type = 'warning',
  showIcon = true,
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

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      case 'warning':
      default:
        return '⚠️';
    }
  };

  const getModalClass = () => {
    switch (type) {
      case 'danger':
        return 'error-modal';
      case 'info':
        return 'info-modal';
      case 'success':
        return 'success-modal';
      case 'warning':
      default:
        return 'confirmation-modal';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'modal-btn-danger';
      case 'success':
        return 'modal-btn-success';
      case 'info':
      case 'warning':
      default:
        return 'modal-btn-primary';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container small ${getModalClass()}`} ref={modalRef}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          {!loading && (
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          {showIcon && (
            <div className="confirmation-icon">
              {getIcon()}
            </div>
          )}
          <div className="confirmation-message">{message}</div>
          {subMessage && (
            <div className="confirmation-submessage">{subMessage}</div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className={`modal-btn ${getConfirmButtonClass()} ${loading ? 'loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '' : confirmText}
          </button>
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility function for easy confirmation dialogs
export const confirm = (options: {
  message: string;
  title?: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
}): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create a temporary container
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create a wrapper component to handle the modal
    const ConfirmWrapper = () => {
      const [isOpen, setIsOpen] = React.useState(true);

      const handleConfirm = () => {
        setIsOpen(false);
        setTimeout(() => {
          document.body.removeChild(container);
          resolve(true);
        }, 200);
      };

      const handleCancel = () => {
        setIsOpen(false);
        setTimeout(() => {
          document.body.removeChild(container);
          resolve(false);
        }, 200);
      };

      return (
        <ConfirmationModal
          isOpen={isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          {...options}
        />
      );
    };

    // Render the modal
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      root.render(<ConfirmWrapper />);
    });
  });
};