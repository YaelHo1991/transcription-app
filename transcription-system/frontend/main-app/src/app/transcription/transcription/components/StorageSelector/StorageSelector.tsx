'use client';

import React, { useState, useEffect } from 'react';
import './StorageSelector.css';

interface StorageSelectorProps {
  onStorageTypeChange: (storageType: 'local' | 'server' | 'server_chunked') => void;
  defaultStorageType?: 'local' | 'server' | 'server_chunked';
  fileSize?: number;
  fileName?: string;
  disabled?: boolean;
}

export default function StorageSelector({
  onStorageTypeChange,
  defaultStorageType,
  fileSize,
  fileName,
  disabled = false
}: StorageSelectorProps) {
  const [selectedType, setSelectedType] = useState<'local' | 'server' | 'server_chunked'>(defaultStorageType || 'server');
  const [userPreferences, setUserPreferences] = useState({
    defaultStorageType: 'server' as 'local' | 'server' | 'server_chunked',
    autoChunk: false,
    migrationThreshold: 100 // MB
  });

  useEffect(() => {
    fetchUserPreferences();
  }, []);

  useEffect(() => {
    if (defaultStorageType) {
      setSelectedType(defaultStorageType);
    } else {
      // Apply auto-recommendations based on file size and user preferences
      const recommendedType = getRecommendedStorageType();
      setSelectedType(recommendedType);
    }
  }, [defaultStorageType, fileSize, userPreferences]);

  useEffect(() => {
    onStorageTypeChange(selectedType);
  }, [selectedType, onStorageTypeChange]);

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      
      const response = await fetch('http://localhost:5000/api/projects/storage/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const prefs = await response.json();
        setUserPreferences({
          defaultStorageType: prefs.defaultStorageType || 'server',
          autoChunk: prefs.autoChunk || false,
          migrationThreshold: prefs.migrationThreshold || 100
        });
      }
    } catch (error) {
      console.warn('Failed to fetch user preferences:', error);
    }
  };

  const getRecommendedStorageType = (): 'local' | 'server' | 'server_chunked' => {
    if (!fileSize) {
      return userPreferences.defaultStorageType;
    }

    const sizeInMB = fileSize / (1024 * 1024);
    
    // Large files - recommend chunked if auto-chunk is enabled
    if (sizeInMB > 100 && userPreferences.autoChunk) {
      return 'server_chunked';
    }
    
    // Files over migration threshold - recommend server
    if (sizeInMB > userPreferences.migrationThreshold) {
      return 'server';
    }
    
    // Use user's default preference
    return userPreferences.defaultStorageType;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageDescription = (type: 'local' | 'server' | 'server_chunked') => {
    switch (type) {
      case 'local':
        return 'הקובץ יישאר במחשב שלך בלבד';
      case 'server':
        return 'הקובץ יועלה לשרת';
      case 'server_chunked':
        return 'הקובץ יחולק למקטעים ויועלה לשרת';
      default:
        return '';
    }
  };

  const getStorageRecommendation = (type: 'local' | 'server' | 'server_chunked') => {
    if (!fileSize) return null;
    
    const sizeInMB = fileSize / (1024 * 1024);
    const recommended = getRecommendedStorageType();
    
    if (type === recommended) {
      if (type === 'server_chunked' && sizeInMB > 100) {
        return 'מומלץ לקבצים גדולים';
      }
      if (type === 'server' && sizeInMB > userPreferences.migrationThreshold) {
        return 'מומלץ';
      }
      if (type === userPreferences.defaultStorageType) {
        return 'ברירת מחדל';
      }
    }
    
    return null;
  };

  return (
    <div className="storage-selector">
      {fileName && (
        <div className="storage-selector-file-info">
          <div className="file-name">{fileName}</div>
          {fileSize && (
            <div className="file-size">{formatFileSize(fileSize)}</div>
          )}
        </div>
      )}
      
      <div className="storage-selector-label">
        בחר מיקום אחסון:
      </div>
      
      <div className="storage-options">
        <label className={`storage-option ${selectedType === 'local' ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
          <input
            type="radio"
            name="storageType"
            value="local"
            checked={selectedType === 'local'}
            onChange={() => !disabled && setSelectedType('local')}
            disabled={disabled}
          />
          <div className="storage-option-content">
            <div className="storage-option-header">
              <span className="storage-icon">💻</span>
              <span className="storage-title">מקומי</span>
              {getStorageRecommendation('local') && (
                <span className="storage-recommendation">
                  {getStorageRecommendation('local')}
                </span>
              )}
            </div>
            <div className="storage-description">
              {getStorageDescription('local')}
            </div>
            <div className="storage-pros-cons">
              <div className="storage-pros">✓ גישה מהירה ללא אינטרנט</div>
              <div className="storage-cons">✗ זמין רק במחשב זה</div>
            </div>
          </div>
        </label>
        
        <label className={`storage-option ${selectedType === 'server' ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
          <input
            type="radio"
            name="storageType"
            value="server"
            checked={selectedType === 'server'}
            onChange={() => !disabled && setSelectedType('server')}
            disabled={disabled}
          />
          <div className="storage-option-content">
            <div className="storage-option-header">
              <span className="storage-icon">☁️</span>
              <span className="storage-title">שרת</span>
              {getStorageRecommendation('server') && (
                <span className="storage-recommendation">
                  {getStorageRecommendation('server')}
                </span>
              )}
            </div>
            <div className="storage-description">
              {getStorageDescription('server')}
            </div>
            <div className="storage-pros-cons">
              <div className="storage-pros">✓ נגיש מכל מקום ✓ גיבוי אוטומטי</div>
              <div className="storage-cons">✗ דורש חיבור אינטרנט</div>
            </div>
          </div>
        </label>
        
        <label className={`storage-option ${selectedType === 'server_chunked' ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
          <input
            type="radio"
            name="storageType"
            value="server_chunked"
            checked={selectedType === 'server_chunked'}
            onChange={() => !disabled && setSelectedType('server_chunked')}
            disabled={disabled}
          />
          <div className="storage-option-content">
            <div className="storage-option-header">
              <span className="storage-icon">📦</span>
              <span className="storage-title">שרת מקטע</span>
              {getStorageRecommendation('server_chunked') && (
                <span className="storage-recommendation">
                  {getStorageRecommendation('server_chunked')}
                </span>
              )}
            </div>
            <div className="storage-description">
              {getStorageDescription('server_chunked')}
            </div>
            <div className="storage-pros-cons">
              <div className="storage-pros">✓ אידיאלי לקבצים גדולים ✓ העלאה מהירה יותר</div>
              <div className="storage-cons">✗ דורש חיבור אינטרנט יציב</div>
            </div>
          </div>
        </label>
      </div>
      
      {fileSize && fileSize > 100 * 1024 * 1024 && selectedType !== 'server_chunked' && (
        <div className="storage-warning">
          ⚠️ קובץ גדול זה עלול להועלות לאט. שקול להשתמש באחסון מקטע.
        </div>
      )}
      
      {selectedType === 'local' && fileSize && fileSize > 500 * 1024 * 1024 && (
        <div className="storage-warning">
          ⚠️ קבצים מקומיים גדולים עלולים להשפיע על הביצועים.
        </div>
      )}
    </div>
  );
}