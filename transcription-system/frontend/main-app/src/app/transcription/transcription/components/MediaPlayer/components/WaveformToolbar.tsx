'use client';

import React from 'react';
import { MarkType } from '../types/marks';
import { ZOOM_CONFIG } from '../utils/waveformZoom';

interface WaveformToolbarProps {
  zoomLevel: number;
  showMarksMenu: boolean;
  markFilter: MarkType | null;
  navigationFilter: MarkType | 'all';
  playbackMode: 'normal' | 'marked-only' | 'skip-marked' | 'loop-mark';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleMarksMenu: () => void;
  onExportMarks: () => void;
  onImportMarks: () => void;
  onClearMarks: () => void;
  onToggleMarkFilter: () => void;
  onToggleNavigationFilter: () => void;
  onTogglePlaybackOptions: () => void;
  onPreviousMark: () => void;
  onNextMark: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function WaveformToolbar({
  zoomLevel,
  showMarksMenu,
  markFilter,
  navigationFilter,
  playbackMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleMarksMenu,
  onExportMarks,
  onImportMarks,
  onClearMarks,
  onToggleMarkFilter,
  onToggleNavigationFilter,
  onTogglePlaybackOptions,
  onPreviousMark,
  onNextMark,
  onMouseEnter,
  onMouseLeave
}: WaveformToolbarProps) {
  return (
    <div
      className="waveform-toolbar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Zoom Controls */}
      <div className="waveform-toolbar-section">
        <button
          onClick={onZoomOut}
          disabled={zoomLevel <= ZOOM_CONFIG.MIN_ZOOM}
          className="waveform-toolbar-btn"
          title="הקטן"
        >
          −
        </button>
        <div className="waveform-zoom-display">
          {zoomLevel.toFixed(1)}x
        </div>
        <button
          onClick={onZoomIn}
          disabled={zoomLevel >= ZOOM_CONFIG.MAX_ZOOM}
          className="waveform-toolbar-btn"
          title="הגדל"
        >
          +
        </button>
        <button
          onClick={onResetZoom}
          disabled={zoomLevel === 1}
          className="waveform-toolbar-btn"
          title="איפוס זום"
        >
          ↺
        </button>
      </div>
      
      <div className="waveform-toolbar-divider" />
      
      {/* Marks Controls */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleMarksMenu();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`waveform-toolbar-btn ${showMarksMenu ? 'active' : ''}`}
        title="תפריט סימונים"
      >
        📍
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMarkFilter();
        }}
        className={`waveform-toolbar-btn ${markFilter ? 'active' : ''}`}
        title="סנן סימונים לפי סוג"
      >
        🔍
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleNavigationFilter();
        }}
        className={`waveform-toolbar-btn ${navigationFilter !== 'all' ? 'active' : ''}`}
        title="בחר סוג סימון לניווט"
      >
        🧭
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlaybackOptions();
        }}
        className={`waveform-toolbar-btn ${playbackMode !== 'normal' ? 'active' : ''}`}
        title="אפשרויות ניגון"
      >
        🔁
      </button>

      <div className="waveform-toolbar-divider" />

      {/* Navigation Controls */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPreviousMark();
        }}
        className="waveform-toolbar-btn"
        title="סימון קודם"
      >
        ⏮
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNextMark();
        }}
        className="waveform-toolbar-btn"
        title="סימון הבא"
      >
        ⏭
      </button>

      <div className="waveform-toolbar-divider" />

      {/* Import/Export Controls */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExportMarks();
        }}
        className="waveform-toolbar-btn"
        title="ייצא סימונים"
      >
        💾
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onImportMarks();
        }}
        className="waveform-toolbar-btn"
        title="ייבא סימונים"
      >
        📂
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClearMarks();
        }}
        className="waveform-toolbar-btn danger"
        title="מחק את כל הסימונים"
      >
        🗑️
      </button>
    </div>
  );
}