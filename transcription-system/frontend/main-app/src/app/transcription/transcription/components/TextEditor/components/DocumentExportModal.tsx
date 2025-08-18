'use client';

import React, { useState, useRef } from 'react';
import WordDocumentGenerator, { BlockData } from '../utils/WordDocumentGenerator';
import { TemplateProcessor } from '../utils/templateProcessor';
import { saveAs } from 'file-saver';
import './DocumentExportModal.css';

interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: BlockData[];
  speakers: Map<string, string>;
  mediaFileName: string;
  mediaDuration?: string;
  onExportComplete?: (format: string) => void;
}

type ExportFormat = 'word' | 'txt' | 'pdf';

export default function DocumentExportModal({
  isOpen,
  onClose,
  blocks,
  speakers,
  mediaFileName,
  mediaDuration,
  onExportComplete
}: DocumentExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('word');
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [templateProcessor] = useState(() => new TemplateProcessor());
  const [hasTemplate, setHasTemplate] = useState(false);
  const [templateFileName, setTemplateFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!isOpen) return null;
  
  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('נא להעלות קובץ Word (.docx) בלבד');
      return;
    }

    const result = await templateProcessor.loadTemplate(file);
    if (result) {
      setHasTemplate(true);
      setTemplateFileName(file.name);
    } else {
      alert('שגיאה בטעינת התבנית');
    }
  };

  const clearTemplate = () => {
    templateProcessor.clearTemplate();
    setHasTemplate(false);
    setTemplateFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      switch (selectedFormat) {
        case 'word':
          if (hasTemplate) {
            // Use template processor
            const success = await templateProcessor.processTemplate(
              blocks,
              speakers,
              mediaFileName,
              includeTimestamps,
              mediaDuration,
              customFileName || undefined
            );
            if (!success) {
              alert('שגיאה בעיבוד התבנית');
              setIsExporting(false);
              return;
            }
          } else {
            // Use regular generator
            const generator = new WordDocumentGenerator();
            await generator.generateDocument(
              blocks,
              speakers,
              mediaFileName,
              {
                includeTimestamps,
                fileName: customFileName || undefined,
                mediaDuration
              }
            );
          }
          break;
          
        case 'txt':
          const generator = new WordDocumentGenerator();
          const textContent = generator.generatePlainText(
            blocks,
            speakers,
            mediaFileName,
            includeTimestamps,
            mediaDuration
          );
          
          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          const fileName = customFileName || 
            `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_תמלול.txt`;
          saveAs(blob, fileName + (fileName.endsWith('.txt') ? '' : '.txt'));
          break;
          
        case 'pdf':
          // PDF export would require additional library like jsPDF
          alert('ייצוא PDF יתווסף בקרוב');
          setIsExporting(false);
          return;
      }
      
      if (onExportComplete) {
        onExportComplete(selectedFormat);
      }
      
      // Close modal after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
      }, 500);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('שגיאה בייצוא המסמך');
      setIsExporting(false);
    }
  };
  
  const getPreviewText = () => {
    const speakerNames = Array.from(new Set(
      blocks
        .filter(b => b.speaker)
        .map(b => speakers.get(b.speaker) || b.speaker)
    ));
    
    // Calculate duration in HH:MM:SS format
    // Try to get max time from speakerTime or by parsing timestamps in text
    let maxTime = 0;
    
    blocks.forEach(block => {
      // First check speakerTime
      if (block.speakerTime && block.speakerTime > maxTime) {
        maxTime = block.speakerTime;
      }
      
      // Also check for timestamps in the text (format: HH:MM:SS or MM:SS)
      if (block.text) {
        const timestampMatches = block.text.match(/\d{1,2}:\d{2}(:\d{2})?/g);
        if (timestampMatches) {
          timestampMatches.forEach(timestamp => {
            const parts = timestamp.split(':');
            let timeInSeconds = 0;
            if (parts.length === 3) {
              // HH:MM:SS
              timeInSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            } else if (parts.length === 2) {
              // MM:SS
              timeInSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
            if (timeInSeconds > maxTime) {
              maxTime = timeInSeconds;
            }
          });
        }
      }
    });
    
    // Use the actual media duration if provided, otherwise calculate from blocks
    const duration = mediaDuration || (() => {
      const hours = Math.floor(maxTime / 3600);
      const minutes = Math.floor((maxTime % 3600) / 60);
      const seconds = Math.floor(maxTime % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    })();
    
    return {
      speakers: speakerNames.join(', ') || 'לא צוינו',
      duration,
      blockCount: blocks.filter(b => b.text || b.speaker).length
    };
  };
  
  const preview = getPreviewText();
  
  return (
    <>
      <div className="doc-export-overlay" onClick={onClose}></div>
      <div className="doc-export-container">
        <div className="doc-export-header">
          <h2>ייצוא תמלול למסמך</h2>
          <button className="doc-export-close" onClick={onClose}>×</button>
        </div>
        
        <div className="doc-export-body">
          {/* Format Selection */}
          <div className="doc-export-section">
            <h3>בחר פורמט ייצוא:</h3>
            <div className="doc-format-options">
              <label className={`doc-format-option ${selectedFormat === 'word' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="word"
                  checked={selectedFormat === 'word'}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                />
                <span className="format-icon">📄</span>
                <span className="format-name">Word (.docx)</span>
                <span className="format-desc">מסמך Word עם עיצוב מלא</span>
              </label>
              
              <label className={`doc-format-option ${selectedFormat === 'txt' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="txt"
                  checked={selectedFormat === 'txt'}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                />
                <span className="format-icon">📝</span>
                <span className="format-name">טקסט פשוט (.txt)</span>
                <span className="format-desc">קובץ טקסט ללא עיצוב</span>
              </label>
              
              <label className={`doc-format-option ${selectedFormat === 'pdf' ? 'selected' : ''} disabled`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={selectedFormat === 'pdf'}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  disabled
                />
                <span className="format-icon">📑</span>
                <span className="format-name">PDF</span>
                <span className="format-desc">בקרוב...</span>
              </label>
            </div>
          </div>
          
          {/* Template Upload Section - Only for Word format */}
          {selectedFormat === 'word' && (
            <div className="doc-export-section">
              <h3>תבנית Word (אופציונלי):</h3>
              <div className="template-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleTemplateUpload}
                  style={{ display: 'none' }}
                />
                {!hasTemplate ? (
                  <button 
                    className="template-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    📁 העלה תבנית Word
                  </button>
                ) : (
                  <div className="template-loaded">
                    <span className="template-name">✓ {templateFileName}</span>
                    <button 
                      className="template-clear-btn"
                      onClick={clearTemplate}
                      type="button"
                    >
                      הסר
                    </button>
                  </div>
                )}
                <div className="template-info">
                  <small>
                    Placeholders: {'{fileName}'}, {'{speakers}'}, {'{duration}'}, {'{date}'}<br/>
                    לתמלול: {'{transcriptionContent}'} או {'{formattedContent}'} (לבדיקת RTL)
                  </small>
                </div>
              </div>
            </div>
          )}
          
          {/* Options */}
          <div className="doc-export-section">
            <h3>אפשרויות:</h3>
            <div className="doc-export-options">
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                />
                <span>כלול חותמות זמן (אחרת יוחלפו ב-...)</span>
              </label>
            </div>
          </div>
          
          {/* File Name */}
          <div className="doc-export-section">
            <h3>שם הקובץ:</h3>
            <input
              type="text"
              className="filename-input"
              placeholder={`${mediaFileName?.replace(/\.[^/.]+$/, '') || 'transcription'}_תמלול`}
              value={customFileName || `${mediaFileName?.replace(/\.[^/.]+$/, '') || 'transcription'}_תמלול`}
              onChange={(e) => setCustomFileName(e.target.value)}
            />
          </div>
          
          {/* Preview */}
          <div className="doc-export-section preview-section">
            <h3>תצוגה מקדימה:</h3>
            <div className="preview-box">
              <div className="preview-line">
                <strong>שם הקובץ:</strong> {mediaFileName || 'ללא שם'}
              </div>
              <div className="preview-line">
                <strong>דוברים:</strong> {preview.speakers}, <strong>זמן הקלטה:</strong> {preview.duration} דקות
              </div>
              <div className="preview-line">
                <strong>מספר בלוקים:</strong> {preview.blockCount}
              </div>
              <div className="preview-line">
                <strong>חותמות זמן:</strong> {includeTimestamps ? 'יכללו במסמך' : 'יוחלפו ב-...'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="doc-export-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isExporting}
          >
            ביטול
          </button>
          <button 
            className="btn btn-body-only"
            onClick={async () => {
              setIsExporting(true);
              try {
                const generator = new WordDocumentGenerator();
                const fileName = customFileName || 
                  `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_גוף_בלבד.docx`;
                await generator.generateBodyOnly(
                  blocks,
                  speakers,
                  includeTimestamps,
                  fileName
                );
                setTimeout(() => {
                  onClose();
                  setIsExporting(false);
                }, 500);
              } catch (error) {
                console.error('Body export failed:', error);
                alert('שגיאה בייצוא גוף התמלול');
                setIsExporting(false);
              }
            }}
            disabled={isExporting || blocks.length === 0}
            title="ייצוא גוף התמלול בלבד עם עיצוב מושלם"
          >
            {isExporting ? 'מייצא...' : 'גוף בלבד'}
          </button>
          {hasTemplate && (
            <>
              <button 
                className="btn btn-test"
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    const result = await templateProcessor.processTemplateWithFormattedContent(
                      blocks,
                      speakers,
                      mediaFileName,
                      includeTimestamps,
                      mediaDuration,
                      customFileName || undefined
                    );
                    if (!result) {
                      alert('שגיאה בעיבוד התבנית');
                      setIsExporting(false);
                      return;
                    }
                    setTimeout(() => {
                      onClose();
                      setIsExporting(false);
                    }, 500);
                  } catch (error) {
                    console.error('Pre-formatted test failed:', error);
                    alert('שגיאה בבדיקת תבנית מעוצבת מראש');
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || blocks.length === 0}
                title="בדיקת תבנית עם תוכן מעוצב מראש - משתמש ב-{formattedContent}"
                style={{ backgroundColor: '#ff9800', color: 'white' }}
              >
                {isExporting ? 'בודק...' : '🧪 Test Pre-formatted'}
              </button>
              <button 
                className="btn btn-combine"
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    const result = await templateProcessor.processTemplateWithFormattedBody(
                      blocks,
                      speakers,
                      mediaFileName,
                      includeTimestamps,
                      mediaDuration,
                      customFileName || undefined
                    );
                    if (!result) {
                      alert('שגיאה במיזוג התבנית');
                      setIsExporting(false);
                      return;
                    }
                    setTimeout(() => {
                      onClose();
                      setIsExporting(false);
                    }, 500);
                  } catch (error) {
                    console.error('Combine failed:', error);
                    alert('שגיאה במיזוג');
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || blocks.length === 0}
                title="מיזוג תבנית עם גוף מעוצב"
              >
                {isExporting ? 'ממזג...' : '🔀 מיזוג'}
              </button>
            </>
          )}
          <button 
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || blocks.length === 0}
          >
            {isExporting ? 'מייצא...' : 'שמור מסמך'}
          </button>
        </div>
      </div>
    </>
  );
}