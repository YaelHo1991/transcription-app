'use client';

import React, { useEffect, useState } from 'react';
import './NotificationModal.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationModalProps {
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose: () => void;
  isOpen: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  isOpen
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`notification-modal notification-${type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  );
};

// Singleton notification manager
class NotificationManager {
  private static instance: NotificationManager;
  private listeners: ((notification: any) => void)[] = [];

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  show(message: string, type: NotificationType = 'info', duration: number = 3000) {
    this.listeners.forEach(listener => {
      listener({ message, type, duration, isOpen: true });
    });
  }

  subscribe(listener: (notification: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const notificationManager = NotificationManager.getInstance();

// Hook for using notifications
export const useNotification = () => {
  const [notification, setNotification] = useState<any>({ isOpen: false });

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notif) => {
      setNotification(notif);
    });
    return unsubscribe;
  }, []);

  const showNotification = (message: string, type: NotificationType = 'info', duration: number = 3000) => {
    setNotification({ message, type, duration, isOpen: true });
  };

  const hideNotification = () => {
    setNotification({ ...notification, isOpen: false });
  };

  return {
    notification,
    showNotification,
    hideNotification
  };
};