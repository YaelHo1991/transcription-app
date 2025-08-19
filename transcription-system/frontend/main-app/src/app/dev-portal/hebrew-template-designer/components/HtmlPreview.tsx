'use client';

import React, { useState } from 'react';

interface HtmlPreviewProps {
  html: string;
}

export default function HtmlPreview({ html }: HtmlPreviewProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="html-preview">
      <div className="preview-controls">
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className="toggle-btn"
        >
          {showRaw ? 'הצג תצוגה מקדימה' : 'הצג קוד HTML'}
        </button>
      </div>

      {showRaw ? (
        <div className="raw-html">
          <pre>{html}</pre>
        </div>
      ) : (
        <div className="rendered-preview">
          <iframe
            srcDoc={html}
            style={{
              width: '100%',
              height: '500px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              overflow: 'visible'
            }}
            title="HTML Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}