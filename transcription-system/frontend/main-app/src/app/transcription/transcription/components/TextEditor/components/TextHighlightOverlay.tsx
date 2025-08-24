'use client';

import React, { useEffect, useRef, useState } from 'react';
import './TextHighlightOverlay.css';

interface HighlightInfo {
  startIndex: number;
  endIndex: number;
  isCurrent?: boolean;
}

interface TextHighlightOverlayProps {
  text: string;
  highlights: HighlightInfo[];
  targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  isTextArea?: boolean;
}

export default function TextHighlightOverlay({ 
  text, 
  highlights, 
  targetRef,
  isTextArea = false
}: TextHighlightOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (targetRef.current && overlayRef.current) {
        const target = targetRef.current;
        const styles = window.getComputedStyle(target);
        
        overlayRef.current.style.font = styles.font;
        overlayRef.current.style.fontSize = styles.fontSize;
        overlayRef.current.style.fontFamily = styles.fontFamily;
        overlayRef.current.style.fontWeight = styles.fontWeight;
        overlayRef.current.style.lineHeight = styles.lineHeight;
        overlayRef.current.style.letterSpacing = styles.letterSpacing;
        overlayRef.current.style.padding = styles.padding;
        overlayRef.current.style.direction = styles.direction;
        overlayRef.current.style.textAlign = styles.textAlign;
        
        setDimensions({
          width: target.offsetWidth,
          height: target.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [targetRef, text]);

  if (!highlights || highlights.length === 0) {
    return null;
  }

  // Build the highlighted text
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort highlights by start index
  const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
  
  sortedHighlights.forEach((highlight, idx) => {
    // Add text before highlight
    if (highlight.startIndex > lastIndex) {
      segments.push(
        <span key={'text-' + idx} className="overlay-text">
          {text.substring(lastIndex, highlight.startIndex)}
        </span>
      );
    }
    
    // Add highlighted text
    segments.push(
      <span 
        key={'highlight-' + idx}
        className={'overlay-highlight ' + (highlight.isCurrent ? 'current' : '')}
      >
        {text.substring(highlight.startIndex, highlight.endIndex)}
      </span>
    );
    
    lastIndex = highlight.endIndex;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-final" className="overlay-text">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return (
    <div 
      ref={overlayRef}
      className={'text-highlight-overlay ' + (isTextArea ? 'textarea' : 'input')}
      style={{
        width: dimensions.width,
        height: dimensions.height
      }}
    >
      {segments}
    </div>
  );
}