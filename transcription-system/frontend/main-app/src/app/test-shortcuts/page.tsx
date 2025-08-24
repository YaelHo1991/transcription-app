'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShortcutManager } from '@/app/transcription/transcription/components/TextEditor/utils/ShortcutManager';
import { ProcessTextResult } from '@/app/transcription/transcription/components/TextEditor/types/shortcuts';

export default function TestShortcuts() {
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [lastExpansion, setLastExpansion] = useState<string>('');
  const [shortcuts, setShortcuts] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const managerRef = useRef<ShortcutManager | null>(null);
  
  useEffect(() => {
    // Initialize ShortcutManager
    const initManager = async () => {
      try {
        const manager = new ShortcutManager(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/transcription/shortcuts');
        managerRef.current = manager;
        
        // Fetch shortcuts directly from public endpoint for testing
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/transcription/shortcuts/public');
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded shortcuts from API:', data.shortcuts.length);
          console.log('Sample shortcuts:', data.shortcuts.slice(0, 3));
          
          // Manually set shortcuts for testing
          const shortcutsMap = manager.getAllShortcuts();
          shortcutsMap.clear();
          data.shortcuts.forEach(([shortcut, shortcutData]: [string, any]) => {
            shortcutsMap.set(shortcut, shortcutData);
          });
          
          console.log('Manager shortcuts map size:', shortcutsMap.size);
          console.log('Has ע\'ד?', shortcutsMap.has("ע'ד"));
          const sample = shortcutsMap.get("ע'ד");
          console.log('ע\'ד data:', sample);
        } else {
          // Try with token if public endpoint fails
          const storedToken = localStorage.getItem('token');
          if (storedToken) {
            await manager.initialize('test-user', storedToken);
          } else {
            throw new Error('Could not load shortcuts');
          }
        }
        
        // Get shortcuts for display
        const allShortcuts = manager.getAllShortcuts();
        setShortcuts(allShortcuts);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize ShortcutManager:', err);
        setError('Failed to load shortcuts. Make sure backend is running and you are logged in.');
        setIsLoading(false);
      }
    };
    
    initManager();
  }, []);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    // Check if the last character added was a space (trigger character)
    if (text.length < newText.length && newText[newCursorPos - 1] === ' ') {
      if (!managerRef.current) return;
      
      // Process the text BEFORE the space
      const textBeforeSpace = newText.substring(0, newCursorPos - 1);
      console.log('Space detected, processing:', textBeforeSpace);
      
      const result: ProcessTextResult = managerRef.current.processText(textBeforeSpace, textBeforeSpace.length);
      
      if (result.expanded) {
        // Add the space after the expansion
        const expandedWithSpace = result.text + ' ' + newText.substring(newCursorPos);
        setText(expandedWithSpace);
        setLastExpansion(`Expanded: "${result.expandedShortcut}" → "${result.expandedTo}"`);
        
        // Set cursor position after the expansion and space
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.value = expandedWithSpace;
            const newPos = result.cursorPosition + 1; // +1 for the space
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
        return;
      }
    }
    
    setText(newText);
    setCursorPos(newCursorPos);
  };
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Backup handler for other trigger keys
    if (!managerRef.current) return;
    
    // Handle other punctuation triggers (not space, which is handled in onChange)
    const triggerKeys = ['.', ',', '!', '?', ':', ';', 'Enter'];
    const key = e.key;
    
    if (triggerKeys.includes(key)) {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const currentText = textareaRef.current?.value || text;
      
      // Process text before the punctuation
      const textBeforePunctuation = currentText.substring(0, cursorPos - 1);
      const result: ProcessTextResult = managerRef.current.processText(textBeforePunctuation, textBeforePunctuation.length);
      
      if (result.expanded) {
        // Keep the punctuation after expansion
        const expandedWithPunctuation = result.text + currentText.substring(cursorPos - 1);
        setText(expandedWithPunctuation);
        setLastExpansion(`Expanded: "${result.expandedShortcut}" → "${result.expandedTo}"`);
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.value = expandedWithPunctuation;
            const newPos = result.cursorPosition + 1;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    }
  };
  
  const testShortcuts = [
    { shortcut: "ע'ד", expected: 'עורך דין' },
    { shortcut: '..', expected: '?' },
    { shortcut: ',,', expected: '"' },
    { shortcut: ';;', expected: ':' },
    { shortcut: "ביהמ'ש", expected: 'בית המשפט' },
    { shortcut: "וע'ד", expected: 'ועורך דין' },
    { shortcut: "הע'ד", expected: 'העורך דין' }
  ];
  
  const runTest = (shortcut: string) => {
    if (!managerRef.current) return;
    
    const testText = shortcut;
    // Process at the end of the shortcut (before the space would be added)
    const result = managerRef.current.processText(testText, testText.length);
    
    console.log('Test shortcut:', shortcut);
    console.log('Test result:', result);
    
    if (result.expanded) {
      setText(result.text);
      setLastExpansion(`Test: "${shortcut}" → "${result.expandedTo}"`);
    } else {
      setLastExpansion(`No expansion for: "${shortcut}"`);
      // Check if shortcut exists
      const exists = managerRef.current.hasShortcut(shortcut);
      console.log('Shortcut exists in manager:', exists);
      if (exists) {
        const data = managerRef.current.getShortcut(shortcut);
        console.log('Shortcut data:', data);
      }
    }
  };
  
  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading shortcuts...</div>;
  }
  
  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }
  
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Shortcuts Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Test Input Area</h2>
        <p>Type shortcuts and press space to expand them:</p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyUp={handleKeyUp}
          style={{
            width: '100%',
            height: '150px',
            fontSize: '16px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            direction: 'rtl'
          }}
          placeholder="נסה לכתוב ע'ד ולחץ רווח..."
        />
        <div style={{ marginTop: '10px', color: 'green' }}>
          {lastExpansion}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Quick Tests</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {testShortcuts.map(test => (
            <button
              key={test.shortcut}
              onClick={() => runTest(test.shortcut)}
              style={{
                padding: '5px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {test.shortcut} → {test.expected}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <h2>Loaded Shortcuts ({shortcuts.size})</h2>
        <div style={{ 
          maxHeight: '400px', 
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'right', padding: '5px' }}>Shortcut</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Expansion</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Source</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(shortcuts.entries()).map(([shortcut, data]) => (
                <tr key={shortcut} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '5px' }}>{shortcut}</td>
                  <td style={{ padding: '5px' }}>{data.expansion}</td>
                  <td style={{ padding: '5px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: data.source === 'system' ? '#e3f2fd' : '#fff3e0',
                      fontSize: '12px'
                    }}>
                      {data.source}
                    </span>
                  </td>
                  <td style={{ padding: '5px' }}>{data.category || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}