'use client';

import React, { useState } from 'react';
import ToolbarGroup from './components/ToolbarGroup';
import TranscriptionManagementDropdown from './components/TranscriptionManagementDropdown';

interface ToolbarContentProps {
  // File management
  showTranscriptionSwitcher: boolean;
  setShowTranscriptionSwitcher: (show: boolean) => void;
  setShowNewTranscriptionModal: (show: boolean) => void;
  setShowVersionHistoryModal: (show: boolean) => void;
  setShowMediaLinkModal: (show: boolean) => void;
  setShowSearchReplaceModal: (show: boolean) => void;
  setShowDocumentExportModal?: (show: boolean) => void;
  setShowHTMLPreviewModal?: (show: boolean) => void;
  currentTranscriptionId: string;
  handleTranscriptionChange: (id: string) => void;
  currentMediaId?: string;
  projectName?: string;
  tHandleSave?: () => void; // T-Session save handler
  
  // Text editing
  fontSize: number;
  setFontSize: (size: number | ((prev: number) => number)) => void;
  fontFamily: 'default' | 'david';
  setFontFamily: (font: 'default' | 'david') => void;
  blockViewEnabled: boolean;
  setBlockViewEnabled: (enabled: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAllBlocks?: () => void;
  multiSelectMode?: boolean;
  setMultiSelectMode?: (mode: boolean) => void;
  setShowSpeakerSwapModal?: (show: boolean) => void;
  inputLanguage?: 'hebrew' | 'english';
  setInputLanguage?: (lang: 'hebrew' | 'english') => void;
  setShowAutoCorrectModal?: (show: boolean) => void;
  autoCorrectEnabled?: boolean;
  
  // Special features
  navigationMode: boolean;
  setNavigationMode: (mode: boolean) => void;
  savedMediaTime: number | null;
  setSavedMediaTime: (time: number | null) => void;
  currentMediaTime: number;
  seekToTime: (time: number) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  shortcutsEnabled: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  
  // Backup
  blocks: any[];
  speakerColors: Map<string, string>;
  speakerNamesRef: React.MutableRefObject<Map<string, string>>;
  currentMediaFileName: string;
  setShortcutsFeedback: (msg: string) => void;
}

export default function ToolbarContent(props: ToolbarContentProps) {
  console.log('ToolbarContent rendering with language:', props.inputLanguage);
  const {
    showTranscriptionSwitcher,
    setShowTranscriptionSwitcher,
    setShowNewTranscriptionModal,
    setShowVersionHistoryModal,
    setShowMediaLinkModal,
    currentTranscriptionId,
    handleTranscriptionChange,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    blockViewEnabled,
    setBlockViewEnabled,
    navigationMode,
    setNavigationMode,
    savedMediaTime,
    setSavedMediaTime,
    currentMediaTime,
    seekToTime,
    syncEnabled,
    setSyncEnabled,
    shortcutsEnabled,
    setShowShortcutsModal,
    blocks,
    speakerColors,
    speakerNamesRef,
    currentMediaFileName,
    setShortcutsFeedback
  } = props;

  const [allExpanded, setAllExpanded] = useState(false);
  const [groupStates, setGroupStates] = useState({
    word: false,
    blocks: false,
    special: false
  });

  const toggleAllGroups = () => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    setGroupStates({
      word: newState,
      blocks: newState,
      special: newState
    });
  };

  return (
    <>
      {/* Master expand/collapse button */}
      <button
        className="toolbar-btn"
        onClick={toggleAllGroups}
        title={allExpanded ? 'סגור הכל' : 'פתח הכל'}
      >
        <span className="toolbar-icon">{allExpanded ? '◀' : '▶'}</span>
      </button>
      
      <div className="toolbar-divider" />
      
      {/* Word Processing Group - Undo/Redo, Font, Search */}
      <ToolbarGroup
        groupIcon="📝"
        groupTitle="עיבוד תמלילים"
        expanded={groupStates.word}
        onExpandChange={(expanded) => {
          setGroupStates(prev => ({ ...prev, word: expanded }));
          setAllExpanded(expanded && groupStates.blocks && groupStates.special);
        }}
        buttons={[
          {
            icon: '↷',  // Reversed for RTL
            title: 'בטל (Ctrl+Z)',
            onClick: () => {
              if (props.onUndo) {
                props.onUndo();
              }
            }
          },
          {
            icon: '↶',  // Reversed for RTL
            title: 'בצע שוב (Ctrl+Y)',
            onClick: () => {
              if (props.onRedo) {
                props.onRedo();
              }
            }
          },
          {
            icon: '🔍',
            title: 'חפש והחלף',
            onClick: () => props.setShowSearchReplaceModal(true)
          },
          {
            icon: 'A-',
            title: 'הקטן גופן',
            onClick: () => setFontSize(prev => Math.max(12, prev - 1))
          },
          {
            customElement: <span className="font-size-display">{fontSize}</span>
          },
          {
            icon: 'A+',
            title: 'הגדל גופן',
            onClick: () => setFontSize(prev => Math.min(24, prev + 1))
          },
          {
            icon: fontFamily === 'david' ? 'א' : 'D',
            title: fontFamily === 'david' ? 'חזור לגופן רגיל' : 'גופן דוד',
            onClick: () => setFontFamily(fontFamily === 'david' ? 'default' : 'david'),
            active: fontFamily === 'david'
          }
        ]}
      />
      
      <div className="toolbar-divider" />
      
      {/* Blocks Management Group */}
      <ToolbarGroup
        groupIcon="▣"
        groupTitle="ניהול בלוקים"
        expanded={groupStates.blocks}
        onExpandChange={(expanded) => {
          setGroupStates(prev => ({ ...prev, blocks: expanded }));
          setAllExpanded(expanded && groupStates.word && groupStates.special);
        }}
        buttons={[
          {
            icon: '▣',
            title: blockViewEnabled ? 'תצוגה רגילה' : 'תצוגת בלוקים',
            onClick: () => setBlockViewEnabled(!blockViewEnabled),
            active: blockViewEnabled
          },
          {
            icon: '☰',
            title: 'בחר את כל הבלוקים',
            onClick: () => {
              if (props.onSelectAllBlocks) {
                props.onSelectAllBlocks();
              }
            }
          },
          {
            icon: '⬚',
            title: props.multiSelectMode ? 'צא ממצב בחירה מרובה' : 'מצב בחירה מרובה (Ctrl+Click)',
            onClick: () => {
              if (props.setMultiSelectMode) {
                props.setMultiSelectMode(!props.multiSelectMode);
              }
            },
            active: props.multiSelectMode
          },
          {
            icon: '🔄',
            title: 'החלף דוברים',
            onClick: () => {
              if (props.setShowSpeakerSwapModal) {
                props.setShowSpeakerSwapModal(true);
              }
            }
          },
          {
            icon: '✓',
            title: props.autoCorrectEnabled ? 'תיקון אוטומטי פעיל' : 'תיקון אוטומטי כבוי',
            onClick: () => {
              if (props.setShowAutoCorrectModal) {
                props.setShowAutoCorrectModal(true);
              }
            },
            active: props.autoCorrectEnabled
          }
        ]}
      />
      
      <div className="toolbar-divider" />
      
      {/* Special Features Group */}
      <ToolbarGroup
        groupIcon="⚡"
        groupTitle="תכונות מיוחדות"
        expanded={groupStates.special}
        onExpandChange={(expanded) => {
          setGroupStates(prev => ({ ...prev, special: expanded }));
          setAllExpanded(expanded && groupStates.word && groupStates.blocks);
        }}
        buttons={[
          {
            icon: '⌨️',
            title: 'ניהול קיצורים',
            onClick: () => setShowShortcutsModal(true),
            active: shortcutsEnabled
          },
          {
            icon: '🧭',
            title: navigationMode ? 'כבה מצב ניווט' : 'הפעל מצב ניווט',
            onClick: () => {
              if (navigationMode) {
                setNavigationMode(false);
                if (savedMediaTime !== null) {
                  seekToTime(savedMediaTime);
                  setSavedMediaTime(null);
                }
              } else {
                setNavigationMode(true);
                setSavedMediaTime(currentMediaTime);
              }
            },
            active: navigationMode
          },
          {
            icon: '🔄',
            title: 'סנכרון עם נגן',
            onClick: () => setSyncEnabled(!syncEnabled),
            active: syncEnabled
          },
          {
            icon: '⚙️',
            title: 'הגדרות',
            onClick: () => console.log('Settings')
          }
        ]}
      />
      
      <div className="toolbar-spacer" />
    </>
  );
}