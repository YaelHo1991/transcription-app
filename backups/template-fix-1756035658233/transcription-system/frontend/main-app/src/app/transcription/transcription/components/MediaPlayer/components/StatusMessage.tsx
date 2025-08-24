import React from 'react';

interface StatusMessageProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

export default function StatusMessage({ type, title, message, onClose }: StatusMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✕';
      case 'info': return 'ℹ';
    }
  };

  const getClassName = () => {
    return `media-status-message media-status-${type}`;
  };

  return (
    <div className={getClassName()}>
      <div className="media-status-icon">{getIcon()}</div>
      <div className="media-status-content">
        <div className="media-status-title">{title}</div>
        <div className="media-status-text">{message}</div>
      </div>
      {onClose && (
        <button className="media-status-close" onClick={onClose}>✕</button>
      )}
    </div>
  );
}