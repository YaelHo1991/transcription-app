import React, { useState, useRef, useEffect } from 'react';
import './ShortcutPopup.css';

interface ShortcutPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShortcut: (shortcut: string, expansion: string) => Promise<void>;
  feedbackMessage?: string;
}

export const ShortcutPopup: React.FC<ShortcutPopupProps> = ({
  isOpen,
  onClose,
  onAddShortcut,
  feedbackMessage
}) => {
  const [shortcut, setShortcut] = useState('');
  const [expansion, setExpansion] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const shortcutInputRef = useRef<HTMLInputElement>(null);

  // Focus on shortcut input when opened
  useEffect(() => {
    if (isOpen && shortcutInputRef.current) {
      setTimeout(() => shortcutInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('shortcut-popup-header')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !expansion.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAddShortcut(shortcut.trim(), expansion.trim());
      // Clear form on success
      setShortcut('');
      setExpansion('');
      // Focus back on shortcut input
      shortcutInputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add shortcut:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="shortcut-popup"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="shortcut-popup-header">
        <span>הוספת קיצור</span>
        <button
          className="shortcut-popup-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="shortcut-popup-form">
        <input
          ref={shortcutInputRef}
          type="text"
          placeholder="קיצור"
          value={shortcut}
          onChange={(e) => setShortcut(e.target.value)}
          className="shortcut-popup-input"
          disabled={isAdding}
        />

        <input
          type="text"
          placeholder="משמעות"
          value={expansion}
          onChange={(e) => setExpansion(e.target.value)}
          className="shortcut-popup-input"
          disabled={isAdding}
        />

        <button
          type="submit"
          className="shortcut-popup-add-btn"
          disabled={!shortcut.trim() || !expansion.trim() || isAdding}
        >
          {isAdding ? '...' : 'הוסף'}
        </button>
      </form>

      {feedbackMessage && (
        <div className={`shortcut-popup-feedback ${
          feedbackMessage.includes('שגיאה') || feedbackMessage.includes('כבר קיים')
            ? 'error'
            : feedbackMessage.includes('מקומית')
              ? 'warning'
              : 'success'
        }`}>
          {feedbackMessage}
        </div>
      )}
    </div>
  );
};