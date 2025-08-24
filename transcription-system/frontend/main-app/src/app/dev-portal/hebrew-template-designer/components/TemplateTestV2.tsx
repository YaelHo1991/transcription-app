'use client';

import React, { useState, useRef } from 'react';
import { DocxTemplateProcessor } from '../utils/docxTemplateProcessor';

interface SampleData {
  fileName: string;
  speakers: string[];
  duration: string;
  blocks: Array<{
    speaker: string;
    text: string;
  }>;
}

interface TemplateTestV2Props {
  sampleData: SampleData;
}

export default function TemplateTestV2({ sampleData }: TemplateTestV2Props) {
  const [processor] = useState(() => new DocxTemplateProcessor());
  const [templateStatus, setTemplateStatus] = useState('');
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setTemplateStatus('❌ נא להעלות קובץ Word (.docx) בלבד');
      return;
    }

    setTemplateStatus('📄 טוען תבנית...');
    
    const result = await processor.loadTemplate(file);
    
    if (result.success) {
      setTemplateStatus('✓ תבנית נטענה: ' + file.name);
      setPlaceholders(result.placeholders || []);
    } else {
      setTemplateStatus('❌ שגיאה: ' + result.message);
      setPlaceholders([]);
    }
  };

  const handleProcessTemplate = async () => {
    setIsProcessing(true);
    setTemplateStatus('🔄 מעבד תבנית...');

    try {
      const templateData = {
        fileName: sampleData.fileName,
        speakers: sampleData.speakers.join(', '),  // Use regular comma with space
        duration: sampleData.duration,
        date: new Date().toLocaleDateString('he-IL'),
        blocks: sampleData.blocks
      };

      const result = await processor.processTemplate(templateData);
      
      if (result.success) {
        setTemplateStatus('✓ ' + result.message);
      } else {
        setTemplateStatus('❌ שגיאה: ' + result.message);
      }
    } catch (error) {
      setTemplateStatus('❌ שגיאה: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTemplate = () => {
    processor.clearTemplate();
    setTemplateStatus('');
    setPlaceholders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="template-test-v2">
      <div className="v2-header">
        <h2>V2: בדיקת תבנית Word</h2>
        <p>העלה קובץ Word עם placeholders וראה איך הוא מתמלא בנתונים</p>
      </div>

      <div className="v2-upload-section">
        <div className="upload-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
          >
            📁 בחר קובץ Word (.docx)
          </button>
          
          {processor.getTemplateInfo().loaded && (
            <button onClick={clearTemplate} className="clear-btn">
              🗑️ נקה
            </button>
          )}
        </div>

        {templateStatus && (
          <div className={'status-message ' + (templateStatus.includes('✓') ? 'success' : templateStatus.includes('❌') ? 'error' : 'info')}>
            {templateStatus}
          </div>
        )}
      </div>

      {placeholders.length > 0 && (
        <div className="placeholders-section">
          <h3>Placeholders שנמצאו:</h3>
          <div className="placeholders-list">
            {placeholders.map((placeholder, index) => (
              <span key={index} className="placeholder-tag">
                {placeholder}
              </span>
            ))}
          </div>
          
          <div className="mapping-preview">
            <h4>מיפוי נתונים:</h4>
            <ul>
              <li><code>{'{fileName}'}</code> → {sampleData.fileName}</li>
              <li><code>{'{speakers}'}</code> → {sampleData.speakers.join(', ')}</li>
              <li><code>{'{duration}'}</code> → {sampleData.duration}</li>
              <li><code>{'{date}'}</code> → {new Date().toLocaleDateString('he-IL')}</li>
              <li><code>{'{#blocks}{speakerWithColon} {text}{/blocks}'}</code> → {sampleData.blocks.length} בלוקי תמלול</li>
            </ul>
          </div>
        </div>
      )}

      {processor.getTemplateInfo().loaded && (
        <div className="process-section">
          <button 
            onClick={handleProcessTemplate}
            disabled={isProcessing}
            className="process-btn"
          >
            {isProcessing ? '🔄 מעבד...' : '🎯 צור מסמך מהתבנית'}
          </button>
        </div>
      )}

      <div className="v2-instructions">
        <h3>הוראות שימוש:</h3>
        <ol>
          <li>צור קובץ Word עם העיצוב המושלם (כולל מספרי שורות בצד ימין)</li>
          <li>הוסף placeholders בקובץ:
            <ul>
              <li><code>{'{fileName}'}</code> - שם הקובץ</li>
              <li><code>{'{speakers}'}</code> - רשימת דוברים</li>
              <li><code>{'{duration}'}</code> - משך ההקלטה</li>
              <li><code>{'{date}'}</code> - תאריך</li>
              <li><code>{'{#blocks}{speakerWithColon} {text}{/blocks}'}</code> - בלוקי התמלול (או {'{#blocks}{speaker}: {text}{/blocks}'})</li>
            </ul>
          </li>
          <li>העלה את הקובץ כאן</li>
          <li>לחץ "צור מסמך" לבדיקה</li>
        </ol>
      </div>

      <style jsx>{`
        .template-test-v2 {
          background: #f0f8ff;
          border: 2px solid #4CAF50;
          border-radius: 8px;
          padding: 25px;
          margin: 20px 0;
        }

        .v2-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .v2-header h2 {
          color: #2196F3;
          margin: 0 0 10px 0;
        }

        .v2-upload-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .upload-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .upload-btn, .clear-btn, .process-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .upload-btn {
          background: #4CAF50;
          color: white;
        }

        .upload-btn:hover {
          background: #45a049;
        }

        .clear-btn {
          background: #f44336;
          color: white;
        }

        .clear-btn:hover {
          background: #da190b;
        }

        .process-btn {
          background: #2196F3;
          color: white;
          width: 100%;
          font-size: 18px;
          padding: 15px;
        }

        .process-btn:hover:not(:disabled) {
          background: #1976D2;
        }

        .process-btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .status-message {
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
          font-weight: bold;
        }

        .status-message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .status-message.info {
          background: #cce7ff;
          color: #004085;
          border: 1px solid #99d3ff;
        }

        .placeholders-section {
          background: white;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .placeholders-section h3 {
          margin-top: 0;
          color: #333;
        }

        .placeholders-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 10px 0;
        }

        .placeholder-tag {
          background: #e3f2fd;
          color: #1565C0;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 14px;
          border: 1px solid #bbdefb;
        }

        .mapping-preview {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
        }

        .mapping-preview h4 {
          margin-top: 0;
          color: #555;
        }

        .mapping-preview ul {
          margin: 10px 0;
          padding-right: 20px;
        }

        .mapping-preview li {
          margin-bottom: 5px;
          font-size: 14px;
        }

        .mapping-preview code {
          background: #e8f4fd;
          color: #1565C0;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }

        .process-section {
          margin-bottom: 20px;
        }

        .v2-instructions {
          background: #fff3cd;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #ffeaa7;
        }

        .v2-instructions h3 {
          margin-top: 0;
          color: #856404;
        }

        .v2-instructions ol {
          color: #856404;
        }

        .v2-instructions li {
          margin-bottom: 8px;
        }

        .v2-instructions ul {
          margin: 8px 0;
        }

        .v2-instructions code {
          background: #f8f9fa;
          color: #e83e8c;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}