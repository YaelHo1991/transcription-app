'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SpeakerData } from './utils/speakerManager';

interface SpeakerListProps {
  speakers: SpeakerData[];
  activeSpeakerId: string | null;
  onSelect: (speaker: SpeakerData) => void;
  onEdit: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export default function SpeakerList({
  speakers,
  activeSpeakerId,
  onSelect,
  onEdit,
  onDelete
}: SpeakerListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Start editing
  const startEdit = (speaker: SpeakerData) => {
    setEditingId(speaker.id);
    setEditValue(speaker.name);
  };

  // Save edit
  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onEdit(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Handle key down in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="speaker-list">
      {speakers.map((speaker) => (
        <div
          key={speaker.id}
          className={'speaker-item ' + (activeSpeakerId === speaker.id ? 'active' : '')}
          onClick={() => onSelect(speaker)}
        >
          <span 
            className="speaker-color-dot"
            style={{ backgroundColor: speaker.color }}
          />
          
          <span className="speaker-code">
            {speaker.code || '•'}
          </span>
          
          {editingId === speaker.id ? (
            <input
              ref={editInputRef}
              className="speaker-name-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            />
          ) : (
            <span 
              className="speaker-name"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEdit(speaker);
              }}
            >
              {speaker.name}
            </span>
          )}
          
          <span className="speaker-count">
            ({speaker.blockCount})
          </span>
          
          <div className="speaker-item-actions">
            <button
              className="speaker-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(speaker);
              }}
              title="ערוך שם (F2)"
            >
              ✏️
            </button>
            
            {speakers.length > 1 && (
              <button
                className="speaker-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('למחוק את ' + speaker.name + '?')) {
                    onDelete(speaker.id);
                  }
                }}
                title="מחק דובר"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}