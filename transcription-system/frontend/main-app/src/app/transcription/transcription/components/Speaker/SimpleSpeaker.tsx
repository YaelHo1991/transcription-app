'use client';

import React, { useState, useEffect } from 'react';
import { SpeakerManager } from './utils/speakerManager';
import './SimpleSpeaker.css';

interface SimpleSpeakerProps {
  theme?: 'transcription' | 'proofreading';
}

export default function SimpleSpeaker({ theme = 'transcription' }: SimpleSpeakerProps) {
  const [speakers, setSpeakers] = useState([
    { id: '1', code: 'א', name: 'דובר 1', color: '#667eea', count: 0 },
    { id: '2', code: 'ג', name: 'דובר 3', color: '#10b981', count: 0 }
  ]);
  const [speakerManager] = useState(() => new SpeakerManager());

  useEffect(() => {
    // Listen for speaker requests from TextEditor
    const handleSpeakerRequest = (event: CustomEvent) => {
      const { code, callback } = event.detail;
      
      let speaker = speakerManager.findByCode(code);
      
      if (!speaker) {
        speaker = speakerManager.addSpeaker(code);
        setSpeakers(prev => [...prev, {
          id: speaker!.id,
          code: speaker!.code,
          name: speaker!.name,
          color: speaker!.color,
          count: 0
        }]);
      }
      
      if (callback) {
        callback(speaker.name);
      }
    };

    document.addEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    return () => {
      document.removeEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    };
  }, [speakerManager]);

  const handleAddSpeaker = () => {
    const newSpeaker = speakerManager.addSpeaker();
    setSpeakers(prev => [...prev, {
      id: newSpeaker.id,
      code: newSpeaker.code,
      name: newSpeaker.name,
      color: newSpeaker.color,
      count: 0
    }]);
  };

  return (
    <div className="simple-speaker-panel">
      <div className="speaker-panel-header">
        <h3>רשימת דוברים</h3>
      </div>
      
      <button className="add-speaker-btn" onClick={handleAddSpeaker}>
        + דובר חדש
      </button>
      
      <div className="speaker-stats">
        <div className="stat-item">
          <div className="stat-value">0</div>
          <div className="stat-label">אנגלית</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">2</div>
          <div className="stat-label">עברית</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">2</div>
          <div className="stat-label">דוברים</div>
        </div>
      </div>
      
      <div className="speaker-list">
        {speakers.map(speaker => (
          <div key={speaker.id} className="speaker-item">
            <span className="speaker-count">(0)</span>
            <span className="speaker-name">
              {speaker.name} <span className="speaker-code">{speaker.code}</span>
            </span>
            <span className="speaker-dot" style={{ backgroundColor: speaker.color }}></span>
          </div>
        ))}
      </div>
      
      <div className="speaker-shortcuts">
        <div className="shortcut-title">קיצורי דרך</div>
        <div className="shortcut-item">אות עברית + TAB = דובר עברי</div>
        <div className="shortcut-item">אות אנגלית + TAB = דובר אנגלי</div>
        <div className="shortcut-item">רווח = מעבר בין בלוקים</div>
      </div>
    </div>
  );
}