'use client';

import React, { useState, useEffect } from 'react';
import { BlockData } from '../utils/WordDocumentGenerator';
import './HTMLPreviewModal.css';

interface HTMLPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: BlockData[];
  speakers: Map<string, string>;
  mediaFileName: string;
  mediaDuration?: string;
}

export default function HTMLPreviewModal({
  isOpen,
  onClose,
  blocks,
  speakers,
  mediaFileName,
  mediaDuration = '00:00:00'
}: HTMLPreviewModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateHTMLPreview();
    }
  }, [isOpen, blocks, speakers]);

  const generateHTMLPreview = () => {
    // Extract speaker names
    const speakerNames = Array.from(new Set(
      blocks
        .filter(b => b.speaker)
        .map(b => speakers.get(b.speaker) || b.speaker)
    ));

    // Generate formatted content for transcriptionContent
    const transcriptionBlocks = blocks.map((block, index) => {
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = block.text || '';
      
      if (speakerName && text) {
        return `
          <div class="transcription-block">
            <span class="speaker-name">${speakerName}:</span>
            <span class="tab-space">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span class="text-content">${text}</span>
          </div>
        `;
      }
      return `<div class="transcription-block">${text}</div>`;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: David, Arial, sans-serif;
            direction: rtl;
            padding: 20px;
            background: #f5f5f5;
          }
          .placeholder-section {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .placeholder-item {
            margin: 15px 0;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            background: #fafafa;
          }
          .placeholder-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .placeholder-name {
            color: #0066cc;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            background: #e3f2fd;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 14px;
          }
          .arrow {
            margin: 0 15px;
            color: #666;
            font-size: 20px;
          }
          .placeholder-value {
            color: #333;
            font-size: 16px;
            padding: 10px;
            background: white;
            border-radius: 3px;
            margin-top: 5px;
          }
          .transcription-block {
            margin: 8px 0;
            line-height: 1.8;
          }
          .speaker-name {
            font-weight: bold;
            color: #000080;
          }
          .tab-space {
            display: inline-block;
            width: 2em;
          }
          .text-content {
            color: #333;
          }
          h2 {
            color: #333;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
          }
          .instructions {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="placeholder-section">
          <h2>תצוגה מקדימה של Placeholders עבור תבנית Word</h2>
          
          <div class="instructions">
            <strong>הוראות:</strong><br>
            1. צור מסמך Word חדש<br>
            2. הוסף את ה-placeholders בדיוק כפי שמופיעים כאן<br>
            3. העלה את התבנית שלך<br>
            4. לחץ על "ייצוא" ליצירת המסמך הסופי
          </div>

          <div class="placeholder-item">
            <div class="placeholder-header">
              <span class="placeholder-name">{fileName}</span>
              <span class="arrow">←</span>
            </div>
            <div class="placeholder-value">${mediaFileName || 'ללא שם'}</div>
          </div>

          <div class="placeholder-item">
            <div class="placeholder-header">
              <span class="placeholder-name">{speakers}</span>
              <span class="arrow">←</span>
            </div>
            <div class="placeholder-value">${speakerNames.join(', ') || 'לא צוינו'}</div>
          </div>

          <div class="placeholder-item">
            <div class="placeholder-header">
              <span class="placeholder-name">{duration}</span>
              <span class="arrow">←</span>
            </div>
            <div class="placeholder-value">${mediaDuration}</div>
          </div>

          <div class="placeholder-item">
            <div class="placeholder-header">
              <span class="placeholder-name">{date}</span>
              <span class="arrow">←</span>
            </div>
            <div class="placeholder-value">${new Date().toLocaleDateString('he-IL')}</div>
          </div>

          <div class="placeholder-item">
            <div class="placeholder-header">
              <span class="placeholder-name">{transcriptionContent}</span>
              <span class="arrow">←</span>
            </div>
            <div class="placeholder-value">
              ${transcriptionBlocks}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    setHtmlContent(html);
  };


  const handleExport = async () => {
    setIsProcessing(true);
    try {
      // Use the new direct generation approach with line numbers
      const { DirectWordGenerator } = await import('../utils/DirectWordGenerator');
      const generator = new DirectWordGenerator();
      
      // Generate document with line numbers and proper RTL
      await generator.generateWithLineNumbers(
        blocks, 
        speakers, 
        mediaFileName,
        false, // includeTimestamps
        mediaDuration
      );
      
      alert(`המסמך נוצר בהצלחה עם מספרי שורות ועיצוב RTL מלא!`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('שגיאה בייצוא: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="html-preview-modal-overlay">
      <div className="html-preview-modal">
        <div className="modal-header">
          <h2>תצוגה מקדימה וייצוא HTML</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="preview-section">
            <h3>תצוגה מקדימה</h3>
            <iframe 
              srcDoc={htmlContent}
              className="preview-iframe"
              title="HTML Preview"
            />
          </div>

          <div className="template-section">
            <h3>ייצוא Word עם מספרי שורות</h3>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
              לחץ על "ייצוא" ליצירת מסמך Word עם:
              <br />• מספרי שורות בצד ימין
              <br />• עיצוב RTL מלא עם יישור לשני הצדדים
              <br />• שמות דוברים מודגשים עם טאבים
              <br />• פורמט מקצועי מוכן להדפסה
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="export-button"
            onClick={handleExport}
            disabled={isProcessing}
          >
            {isProcessing ? 'מעבד...' : 'ייצוא Word עם מספרי שורות'}
          </button>
          <button className="cancel-button" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}