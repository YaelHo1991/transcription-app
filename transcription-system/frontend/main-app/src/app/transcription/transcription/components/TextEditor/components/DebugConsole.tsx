'use client';

import React, { useState } from 'react';
import { useTranscription } from '../../../contexts/TranscriptionContext';

export const DebugConsole: React.FC<{ currentMediaId?: string }> = ({ currentMediaId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { 
    state,
    getTranscriptionsForMedia,
    getActiveTranscription 
  } = useTranscription();

  const transcriptions = currentMediaId ? getTranscriptionsForMedia(currentMediaId) : [];
  const activeTranscription = getActiveTranscription();

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: '#2a7a7a',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '12px'
        }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      width: '400px',
      maxHeight: '300px',
      background: 'rgba(42, 122, 122, 0.95)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: 9999,
      overflow: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong style={{ fontSize: '12px' }}>🐛 Debug Console</strong>
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '10px' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Current Media ID:</strong> {currentMediaId || 'None'}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Active Transcription:</strong> {activeTranscription?.name || 'None'} 
          {activeTranscription && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {' '}(ID: {activeTranscription.id?.substring(0, 20)}...)
            </span>
          )}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Total Transcriptions for Media:</strong> {transcriptions.length}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Transcriptions List:</strong>
          {transcriptions.length > 0 ? (
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {transcriptions.map((t, idx) => (
                <li key={t.id} style={{ 
                  marginBottom: '3px',
                  color: t.id === activeTranscription?.id ? '#90EE90' : 'white',
                  fontWeight: t.id === activeTranscription?.id ? 'bold' : 'normal'
                }}>
                  {idx + 1}. {t.name} 
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>
                    {' '}({t.wordCount} words)
                  </span>
                  {t.id === activeTranscription?.id && ' ✓'}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ opacity: 0.7, marginLeft: '10px' }}>No transcriptions</div>
          )}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>All Transcriptions in State:</strong> {state.transcriptions.size}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Media Maps:</strong> {state.mediaTranscriptionMap.size}
        </div>

        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '5px' }}>
            <strong>Full State Dump</strong>
          </summary>
          <pre style={{ 
            fontSize: '9px', 
            overflow: 'auto', 
            maxHeight: '150px',
            background: 'rgba(0,0,0,0.3)',
            padding: '5px',
            borderRadius: '4px',
            marginTop: '5px'
          }}>
            {JSON.stringify({
              transcriptions: Array.from(state.transcriptions.entries()).map(([id, t]) => ({
                id: id.substring(0, 20),
                name: t.name,
                content: t.content?.substring(0, 50) + '...',
                wordCount: t.wordCount
              })),
              mediaMap: Array.from(state.mediaTranscriptionMap.entries()).map(([mediaId, map]) => ({
                mediaId: mediaId.substring(0, 20),
                transcriptionIds: map.transcriptionIds.length,
                active: map.activeTranscriptionId?.substring(0, 20)
              }))
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};