'use client';

import React, { useState } from 'react';
import WordDocumentGenerator, { BlockData } from '../utils/WordDocumentGenerator';
import { TemplateProcessor } from '../utils/templateProcessor';
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

export default function DocumentExportModal({
  isOpen,
  onClose,
  blocks,
  speakers,
  mediaFileName,
  mediaDuration,
  onExportComplete
}: DocumentExportModalProps) {
  /**
   * Join array of Hebrew text with RTL-proper comma placement
   */
  const joinWithRTLCommas = (items: string[]): string => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    
    // For RTL Hebrew text, the comma should stick to the previous word
    // Use Right-to-Left Mark (RLM) after comma to ensure proper positioning
    const RLM = '\u200F'; // Right-to-Left Mark
    
    // Join with comma + RLM to keep comma with previous text in RTL
    return items.join(',' + RLM + ' ');
  };

  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [customFileName, setCustomFileName] = useState(mediaFileName.replace(/\.[^/.]+$/, ''));
  const [isExporting, setIsExporting] = useState(false);
  const [templateProcessor] = useState(() => new TemplateProcessor());
  const [hasTemplate, setHasTemplate] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  
  // Auto-load template when modal opens
  React.useEffect(() => {
    if (isOpen && !hasTemplate) {
      // Try to load template, but don't block if it fails
      loadDefaultTemplate().catch(err => {
        console.warn('Could not auto-load template:', err);
        // Continue without template - user can upload manually
      });
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const loadDefaultTemplate = async () => {
    setTemplateLoading(true);
    try {
      // Use relative URL for production, explicit URL for localhost
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? '' // Use relative URL on production
        : 'http://localhost:5000'; // Use explicit URL on localhost
      
      // Check for session template first
      const sessionTemplate = localStorage.getItem('sessionTemplate');
      let templateUrl = `${baseUrl}/api/template/export-template`;
      
      if (sessionTemplate) {
        // Use session template if available
        templateUrl = `${baseUrl}/api/template/export-template?template=${encodeURIComponent(sessionTemplate)}`;
      }
      
      const response = await fetch(templateUrl);
      if (response.ok) {
        const blob = await response.blob();
        const templateName = sessionTemplate || 'hebrew-export-template.docx';
        const file = new File([blob], templateName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const result = await templateProcessor.loadTemplate(file);
        if (result) {
          setHasTemplate(true);
          if (sessionTemplate) {
            console.log(`Using session template: ${sessionTemplate}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading default template:', error);
    } finally {
      setTemplateLoading(false);
    }
  };
  

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (hasTemplate) {
        // Use template processor with Hebrew conversion
        const success = await templateProcessor.processTemplateWithConversion(
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
      
      if (onExportComplete) {
        onExportComplete('word');
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
      return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    })();
    
    return {
      speakers: joinWithRTLCommas(speakerNames) || 'לא צוינו',
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
              placeholder={(mediaFileName?.replace(/\.[^/.]+$/, '') || 'transcription') + '_תמלול'}
              value={customFileName || (mediaFileName?.replace(/\.[^/.]+$/, '') || 'transcription') + '_תמלול'}
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