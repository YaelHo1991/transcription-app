'use client';

import React from 'react';
import { MarkType, MARK_COLORS } from '../types/marks';

interface WaveformDropdownsProps {
  currentTime: number;
  showMarksMenu: boolean;
  showMarkTypeSelector: boolean;
  showMarkFilter: boolean;
  markFilter: MarkType | null;
  showNavigationFilter: boolean;
  navigationFilter: MarkType | 'all';
  showPlaybackOptions: boolean;
  playbackMode: 'normal' | 'marked-only' | 'skip-marked' | 'loop-mark';
  marks: any[];
  onCloseMarksMenu: () => void;
  onCloseMarkTypeSelector: () => void;
  onCloseMarkFilter: () => void;
  onCloseNavigationFilter: () => void;
  onClosePlaybackOptions: () => void;
  onCreateMark: (type: MarkType) => void;
  onSetMarkFilter: (filter: MarkType | null) => void;
  onSetNavigationFilter: (filter: MarkType | 'all') => void;
  onSetPlaybackMode: (mode: 'normal' | 'marked-only' | 'skip-marked' | 'loop-mark') => void;
  onMarksMenuMouseLeave: () => void;
  onMarksMenuMouseEnter: () => void;
}

export default function WaveformDropdowns({
  currentTime,
  showMarksMenu,
  showMarkTypeSelector,
  showMarkFilter,
  markFilter,
  showNavigationFilter,
  navigationFilter,
  showPlaybackOptions,
  playbackMode,
  marks,
  onCloseMarksMenu,
  onCloseMarkTypeSelector,
  onCloseMarkFilter,
  onCloseNavigationFilter,
  onClosePlaybackOptions,
  onCreateMark,
  onSetMarkFilter,
  onSetNavigationFilter,
  onSetPlaybackMode,
  onMarksMenuMouseLeave,
  onMarksMenuMouseEnter
}: WaveformDropdownsProps) {
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get unique custom mark names
  const getCustomMarkNames = () => {
    return Array.from(new Set(
      marks
        .filter(mark => mark.type === MarkType.CUSTOM && mark.customName)
        .map(mark => mark.customName as string)
    ) as Set<string>);
  };

  return (
    <>
      {/* Marks Menu */}
      {showMarksMenu && (
        <div
          className="waveform-dropdown large"
          style={{ top: '100px', right: '20px' }}
          onMouseLeave={onMarksMenuMouseLeave}
          onMouseEnter={onMarksMenuMouseEnter}
        >
          <div className="waveform-instructions">
            <div>📌 קליק ימני - הוספת סימון</div>
            <div>👆 קליק - ניווט לזמן</div>
            <div>⌃👆 Ctrl+קליק - עריכת סימון</div>
            <div>❌ Shift+קליק - מחיקת סימון</div>
            <div>✋ גרור פסים - התאמת טווח (במצב עריכה)</div>
          </div>
        </div>
      )}

      {/* Mark Type Selector */}
      {showMarkTypeSelector && (
        <div
          data-type-selector
          className="waveform-dropdown"
          style={{ top: '160px', right: '20px' }}
        >
          <div className="waveform-dropdown-header">
            הוסף סימון ב-{formatTime(currentTime)}
          </div>
          {Object.entries(MARK_COLORS).map(([type, color]) => (
            <button
              key={type}
              onClick={() => onCreateMark(type as MarkType)}
              className="waveform-dropdown-btn"
            >
              <span>{color.icon}</span>
              <span>{color.nameHebrew}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mark Filter Dropdown */}
      {showMarkFilter && (
        <div
          className="waveform-dropdown"
          style={{ top: '200px', right: '20px' }}
          onMouseLeave={() => {
            setTimeout(() => onCloseMarkFilter(), 300);
          }}
        >
          <div className="waveform-dropdown-header">
            סנן סימונים לפי סוג
          </div>
          
          <button
            onClick={() => {
              onSetMarkFilter(null);
              onCloseMarkFilter();
            }}
            className={`waveform-dropdown-btn ${markFilter === null ? 'active' : ''}`}
          >
            <span>👁️</span>
            <span>הצג הכל</span>
          </button>

          {Object.entries(MARK_COLORS).map(([type, color]) => (
            <button
              key={type}
              onClick={() => {
                onSetMarkFilter(type as MarkType);
                onCloseMarkFilter();
              }}
              className={`waveform-dropdown-btn ${markFilter === type ? 'active' : ''}`}
            >
              <span>{color.icon}</span>
              <span>{color.nameHebrew}</span>
            </button>
          ))}
        </div>
      )}

      {/* Navigation Filter Dropdown */}
      {showNavigationFilter && (
        <div
          className="waveform-dropdown"
          style={{ top: '240px', right: '20px' }}
          onMouseLeave={() => {
            setTimeout(() => onCloseNavigationFilter(), 300);
          }}
        >
          <div className="waveform-dropdown-header">
            בחר סוג סימון לניווט
          </div>
          
          <button
            onClick={() => {
              onSetNavigationFilter('all');
              onCloseNavigationFilter();
            }}
            className={`waveform-dropdown-btn ${navigationFilter === 'all' ? 'active' : ''}`}
          >
            <span>🎯</span>
            <span>כל הסימונים</span>
          </button>

          {Object.entries(MARK_COLORS).map(([type, color]) => {
            const hasMarksOfType = marks.some(mark => mark.type === type);
            
            return (
              <button
                key={type}
                onClick={() => {
                  if (hasMarksOfType) {
                    onSetNavigationFilter(type as MarkType);
                    onCloseNavigationFilter();
                  }
                }}
                disabled={!hasMarksOfType}
                className={`waveform-dropdown-btn ${navigationFilter === type ? 'active' : ''}`}
              >
                <span style={{ opacity: hasMarksOfType ? 1 : 0.4 }}>{color.icon}</span>
                <span>{color.nameHebrew} {!hasMarksOfType && '(לא קיים)'}</span>
              </button>
            );
          })}

          {/* Custom Marks Section */}
          {marks.some(mark => mark.type === MarkType.CUSTOM) && (
            <>
              <div className="waveform-dropdown-divider">
                <div className="waveform-dropdown-section-title">
                  סימונים מותאמים:
                </div>
              </div>
              {getCustomMarkNames().map((customName) => (
                <button
                  key={customName}
                  onClick={() => {
                    onSetNavigationFilter(MarkType.CUSTOM);
                    onCloseNavigationFilter();
                  }}
                  className={`waveform-dropdown-btn ${navigationFilter === MarkType.CUSTOM ? 'active' : ''}`}
                >
                  <span>⚪</span>
                  <span>{customName}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Playback Options Dropdown */}
      {showPlaybackOptions && (
        <div
          className="waveform-dropdown"
          style={{ top: '240px', right: '20px', minWidth: '200px' }}
          onMouseLeave={() => {
            setTimeout(() => onClosePlaybackOptions(), 300);
          }}
        >
          <div className="waveform-dropdown-header">
            אפשרויות הפעלה
          </div>
          
          {[
            { mode: 'normal' as const, icon: '▶', label: 'הפעלה רגילה', desc: 'הפעל את כל התוכן' },
            { mode: 'marked-only' as const, icon: '▶️', label: 'סימונים בלבד', desc: 'הפעל רק קטעים מסומנים' },
            { mode: 'skip-marked' as const, icon: '⏭️', label: 'דלג על סימונים', desc: 'דלג על קטעים מסומנים' },
            { mode: 'loop-mark' as const, icon: '🔄', label: 'לולאה בסימון', desc: 'חזור על הסימון הנוכחי' }
          ].map(({ mode, icon, label, desc }) => (
            <button
              key={mode}
              onClick={() => {
                onSetPlaybackMode(mode);
                onClosePlaybackOptions();
              }}
              className={`waveform-dropdown-btn ${playbackMode === mode ? 'active' : ''}`}
            >
              <div className="waveform-dropdown-btn-content">
                <div className="waveform-dropdown-btn-main">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <div className="waveform-dropdown-btn-desc">
                  {desc}
                </div>
              </div>
            </button>
          ))}
          
          <div className="waveform-dropdown-divider">
            <div className="waveform-shortcuts-info">
              <div className="waveform-shortcuts-title">
                💡 קיצורי מקלדת (ניתן לשינוי בהגדרות):
              </div>
              <div className="waveform-shortcuts-list">
                <div>Ctrl+P - החלף מצב הפעלה</div>
                <div>L - לולאה בסימון נוכחי</div>
                <div>F - החלף סינון סימונים</div>
                <div>Alt+← / Alt+→ - ניווט בין סימונים</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}