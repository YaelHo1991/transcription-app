'use client';

import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlights: Array<{
    startIndex: number;
    endIndex: number;
    isCurrent?: boolean;
  }>;
}

export default function HighlightedText({ text, highlights }: HighlightedTextProps) {
  if (!highlights || highlights.length === 0) {
    return <>{text}</>;
  }

  // Sort highlights by start index
  const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
  
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  
  sortedHighlights.forEach((highlight, idx) => {
    // Add text before highlight
    if (highlight.startIndex > lastIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.substring(lastIndex, highlight.startIndex)}
        </span>
      );
    }
    
    // Add highlighted text
    segments.push(
      <span 
        key={`highlight-${idx}`}
        style={{
          backgroundColor: highlight.isCurrent ? '#fde047' : '#bbf7d0',
          borderBottom: highlight.isCurrent ? '2px solid #eab308' : '1px solid #4ade80',
          padding: '0 2px',
          borderRadius: '2px'
        }}
      >
        {text.substring(highlight.startIndex, highlight.endIndex)}
      </span>
    );
    
    lastIndex = highlight.endIndex;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-final">
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return <>{segments}</>;
}