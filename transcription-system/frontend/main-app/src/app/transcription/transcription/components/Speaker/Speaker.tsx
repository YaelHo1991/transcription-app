'use client';

import React, { useState, useEffect } from 'react';
import { SpeakerData, SpeakerManager } from './utils/speakerManager';
import SpeakerList from './SpeakerList';
import './Speaker.css';

interface SpeakerProps {
  onSpeakerSelect?: (speaker: SpeakerData) => void;
  onSpeakerUpdate?: (speaker: SpeakerData) => void;
  theme?: 'transcription' | 'proofreading';
}

export default function Speaker({
  onSpeakerSelect,
  onSpeakerUpdate,
  theme = 'transcription'
}: SpeakerProps) {
  const [speakers, setSpeakers] = useState<SpeakerData[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [speakerManager] = useState(() => new SpeakerManager());

  // Initialize speaker manager
  useEffect(() => {
    setSpeakers(speakerManager.getAllSpeakers());

    // Listen for speaker requests from TextEditor
    const handleSpeakerRequest = (event: CustomEvent) => {
      const { code, callback } = event.detail;
      
      // Try to find existing speaker
      let speaker = speakerManager.findByCode(code);
      
      if (!speaker) {
        // Create new speaker
        speaker = speakerManager.addSpeaker(code);
        setSpeakers([...speakerManager.getAllSpeakers()]);
        
        // Notify TextEditor of new speaker
        document.dispatchEvent(new CustomEvent('speakerCreated', {
          detail: speaker
        }));
      }
      
      // Return speaker name to TextEditor
      if (callback) {
        callback(speaker.name);
      }
    };

    // Listen for color update requests
    const handleColorUpdate = (event: CustomEvent) => {
      const { speaker: speakerName } = event.detail;
      const speaker = speakerManager.findByName(speakerName);
      
      if (speaker) {
        document.dispatchEvent(new CustomEvent('speakerColorResponse', {
          detail: {
            speaker: speakerName,
            color: speaker.color,
            colorIndex: speaker.colorIndex
          }
        }));
      }
    };

    document.addEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    document.addEventListener('speakerColorRequest', handleColorUpdate as EventListener);

    return () => {
      document.removeEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
      document.removeEventListener('speakerColorRequest', handleColorUpdate as EventListener);
    };
  }, [speakerManager]);

  // Handle adding new speaker manually
  const handleAddSpeaker = () => {
    const newSpeaker = speakerManager.addSpeaker();
    setSpeakers([...speakerManager.getAllSpeakers()]);
    setActiveSpeakerId(newSpeaker.id);
    
    // Notify TextEditor
    document.dispatchEvent(new CustomEvent('speakerCreated', {
      detail: newSpeaker
    }));
  };

  // Handle speaker selection
  const handleSpeakerSelect = (speaker: SpeakerData) => {
    // Simply set the new active speaker
    setActiveSpeakerId(speaker.id);
    
    if (onSpeakerSelect) {
      onSpeakerSelect(speaker);
    }
    
    // Notify TextEditor
    document.dispatchEvent(new CustomEvent('speakerSelected', {
      detail: speaker
    }));
  };

  // Handle speaker name edit
  const handleSpeakerEdit = (id: string, newName: string) => {
    // Get the old name before updating
    const oldSpeaker = speakerManager.getSpeaker(id);
    const oldName = oldSpeaker?.name;
    
    const speaker = speakerManager.updateSpeakerName(id, newName);
    if (speaker) {
      setSpeakers([...speakerManager.getAllSpeakers()]);
      
      if (onSpeakerUpdate) {
        onSpeakerUpdate(speaker);
      }
      
      // Notify TextEditor of name change with old name
      document.dispatchEvent(new CustomEvent('speakerUpdated', {
        detail: {
          ...speaker,
          speakerId: speaker.id,
          oldName: oldName !== newName ? oldName : undefined
        }
      }));
    }
  };

  // Handle speaker deletion
  const handleSpeakerDelete = (id: string) => {
    if (speakers.length > 1) {
      // Clear selection immediately if deleting active speaker
      if (activeSpeakerId === id) {
        setActiveSpeakerId(null);
      }
      
      speakerManager.removeSpeaker(id);
      setSpeakers([...speakerManager.getAllSpeakers()]);
      
      // Notify TextEditor
      document.dispatchEvent(new CustomEvent('speakerDeleted', {
        detail: { id }
      }));
    }
  };

  // Export speakers
  const handleExport = () => {
    const json = speakerManager.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'speakers.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import speakers
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        speakerManager.importFromJSON(content);
        setSpeakers([...speakerManager.getAllSpeakers()]);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={'speaker-panel theme-' + theme + ' ' + (isExpanded ? 'expanded' : 'collapsed')}>
      <div className="speaker-header">
        <h3 className="speaker-title">רשימת דוברים</h3>
        <div className="speaker-header-controls">
          <button 
            className="speaker-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'כווץ' : 'הרחב'}
          >
            {isExpanded ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="speaker-toolbar">
            <button 
              className="speaker-add-btn"
              onClick={handleAddSpeaker}
              title="הוסף דובר חדש (Ctrl+N)"
            >
              + דובר חדש
            </button>
            
            <div className="speaker-actions">
              <button 
                className="speaker-action-btn"
                onClick={handleExport}
                title="ייצא דוברים"
              >
                📤
              </button>
              
              <label className="speaker-action-btn" title="ייבא דוברים">
                📥
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className="speaker-stats">
            <div className="speaker-stat">
              <span className="stat-value">{speakers.length}</span>
              <span className="stat-label">דוברים</span>
            </div>
            <div className="speaker-stat">
              <span className="stat-value">
                {speakers.filter(s => s.code && isHebrewLetter(s.code)).length}
              </span>
              <span className="stat-label">עברית</span>
            </div>
            <div className="speaker-stat">
              <span className="stat-value">
                {speakers.filter(s => s.code && isEnglishLetter(s.code)).length}
              </span>
              <span className="stat-label">אנגלית</span>
            </div>
          </div>

          <SpeakerList
            speakers={speakers}
            activeSpeakerId={activeSpeakerId}
            onSelect={handleSpeakerSelect}
            onEdit={handleSpeakerEdit}
            onDelete={handleSpeakerDelete}
          />

          <div className="speaker-footer">
            <div className="speaker-shortcuts-info">
              <p>קיצורי דרך:</p>
              <ul>
                <li>אות עברית + TAB = דובר עברי</li>
                <li>אות אנגלית + TAB = דובר אנגלי</li>
                <li>רווח = מעבר בין בלוקים</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper functions
function isHebrewLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x05D0 && code <= 0x05EA) || (code >= 0x05F0 && code <= 0x05F4);
}

function isEnglishLetter(char: string): boolean {
  return /^[A-Za-z]$/.test(char);
}