'use client';

import React, { useState } from 'react';

export default function TestTextEditor() {
  const [text, setText] = useState('');

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: 'rgba(15, 76, 76, 0.4)',
      borderRadius: '12px',
      marginTop: '20px'
    }}>
      <h3 style={{ color: '#20c997', marginBottom: '15px' }}>עורך טקסט לבדיקה</h3>
      <textarea
        className="transcription-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="התחל להקליד כאן כדי לבדוק את הזיהוי האוטומטי..."
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '12px',
          backgroundColor: 'rgba(15, 76, 76, 0.6)',
          border: '1px solid rgba(32, 201, 151, 0.3)',
          borderRadius: '8px',
          color: '#e0f7f7',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'vertical',
          direction: 'rtl'
        }}
      />
      <div style={{ 
        marginTop: '10px',
        fontSize: '12px',
        color: 'rgba(224, 247, 247, 0.7)'
      }}>
        מספר תווים: {text.length}
      </div>
    </div>
  );
}