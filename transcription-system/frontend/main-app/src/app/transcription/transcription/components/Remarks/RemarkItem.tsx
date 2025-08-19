'use client';

import React, { useState } from 'react';
import {
  Remark,
  RemarkType,
  REMARK_COLORS,
  UncertaintyRemark,
  SpellingRemark,
  MediaNoteRemark,
  PinnedRemark,
  Priority
} from './types';
import ConfirmDialog from './ConfirmDialog';
import UncertaintyRemarkContent from './UncertaintyRemarkContent';

interface RemarkItemProps {
  remark: Remark;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onNavigate?: (time: number) => void;
  onCopy?: (text: string) => void;
  isSelected?: boolean;
}

export default function RemarkItem({
  remark,
  onEdit,
  onDelete,
  onNavigate,
  onCopy,
  isSelected = false
}: RemarkItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  /**
   * Get delete button color based on remark type
   */
  const getDeleteButtonColor = (type: RemarkType) => {
    switch (type) {
      case RemarkType.UNCERTAINTY:
        return '#22c55e';
      case RemarkType.PINNED:
        return '#0f766e';
      default:
        return '#dc2626';
    }
  };

  /**
   * Get type label
   */
  const getTypeLabel = () => {
    switch (remark.type) {
      case RemarkType.UNCERTAINTY:
        return 'אי-ודאות';
      case RemarkType.SPELLING:
        return 'איות/שם';
      case RemarkType.MEDIA_NOTE:
        return 'הערת מדיה';
      case RemarkType.PINNED:
        return 'מוצמד';
      default:
        return '';
    }
  };

  /**
   * Get type icon
   */
  const getTypeIcon = () => {
    switch (remark.type) {
      case RemarkType.UNCERTAINTY:
        return '?';
      case RemarkType.SPELLING:
        return '✎';
      case RemarkType.MEDIA_NOTE:
        return '♪';
      case RemarkType.PINNED:
        return '⚑';
      default:
        return '•';
    }
  };

  /**
   * Get priority badge
   */
  const getPriorityBadge = (priority: Priority) => {
    const colors = {
      [Priority.HIGH]: '#dc2626',
      [Priority.MEDIUM]: '#f59e0b',
      [Priority.LOW]: '#10b981'
    };
    
    return (
      <span
        style={{
          backgroundColor: colors[priority],
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}
      >
        {priority === Priority.HIGH ? 'גבוה' : priority === Priority.MEDIUM ? 'בינוני' : 'נמוך'}
      </span>
    );
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Render content based on type
   */
  const renderContent = () => {
    switch (remark.type) {
      case RemarkType.UNCERTAINTY: {
        const uncertainRemark = remark as UncertaintyRemark;
        
        return (
          <UncertaintyRemarkContent 
            remark={uncertainRemark}
            onNavigate={onNavigate}
            onDelete={(id) => setShowDeleteConfirm(true)}
          />
        );
      }

      case RemarkType.SPELLING: {
        const spellingRemark = remark as SpellingRemark;
        return (
          <>
            <div className="remark-term">
              /{spellingRemark.term}
              <span className="occurrence-count">({spellingRemark.occurrences.length} מופעים)</span>
            </div>
            <div className="remark-timestamps">
              {spellingRemark.occurrences.slice(0, 3).map((occurrence, idx) => (
                <button
                  key={idx}
                  className="timestamp-link small"
                  onClick={() => onNavigate?.(occurrence.time)}
                >
                  {occurrence.formatted}
                </button>
              ))}
              {spellingRemark.occurrences.length > 3 && (
                <span className="more-indicator">+{spellingRemark.occurrences.length - 3}</span>
              )}
            </div>
          </>
        );
      }

      case RemarkType.MEDIA_NOTE: {
        const mediaNote = remark as MediaNoteRemark;
        return (
          <>
            <div className="remark-header">
              <button
                className="timestamp-link"
                onClick={() => onNavigate?.(mediaNote.timestamp.time)}
              >
                {mediaNote.timestamp.formatted}
              </button>
              {getPriorityBadge(mediaNote.priority)}
            </div>
            <div className="remark-text">{mediaNote.content}</div>
          </>
        );
      }

      case RemarkType.PINNED: {
        const pinnedRemark = remark as PinnedRemark;
        return (
          <div className="remark-pinned" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span className="pinned-content" style={{ 
              fontSize: '13px',
              color: '#1f2937',
              flex: 1
            }}>
              {pinnedRemark.content}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {onEdit && (
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(remark.id);
                  }}
                  title="ערוך"
                  style={{
                    background: 'rgba(15, 118, 110, 0.1)',
                    border: '1px solid rgba(15, 118, 110, 0.3)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: '#0f766e'
                  }}
                >
                  ✎
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(remark.id);
                  }}
                  title="מחק"
                  style={{
                    background: 'rgba(15, 118, 110, 0.1)',
                    border: '1px solid rgba(15, 118, 110, 0.3)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: '#0f766e'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      }

      default:
        return <div className="remark-text">{(remark as any).content || ''}</div>;
    }
  };

  return (
    <div
      className={`remark-item ${isSelected ? 'selected' : ''}`}
      style={{
        backgroundColor: remark.type === RemarkType.PINNED 
          ? 'white'
          : REMARK_COLORS[remark.type],
        border: isSelected ? '2px solid #0f766e' : remark.type === RemarkType.UNCERTAINTY 
          ? '1px solid rgba(34, 197, 94, 0.3)' 
          : remark.type === RemarkType.PINNED
          ? '1px solid #0f766e'
          : '1px solid rgba(15, 118, 110, 0.2)',
        borderRadius: '6px',
        padding: remark.type === RemarkType.UNCERTAINTY ? '8px 10px' : remark.type === RemarkType.PINNED ? '8px' : '12px',
        marginBottom: '6px',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
    >
      {remark.type !== RemarkType.UNCERTAINTY && remark.type !== RemarkType.PINNED && (
      <div className="remark-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="type-icon" style={{ fontSize: '16px' }}>{getTypeIcon()}</span>
          <span className="type-label" style={{ 
            fontSize: '12px',
            fontWeight: '600',
            color: '#0f766e'
          }}>
            {getTypeLabel()}
          </span>
        </div>
        
        <div className="remark-actions" style={{ display: 'flex', gap: '4px' }}>
          {/* Edit button removed - PINNED type is handled separately */}
          {false && (
            <button
              className="action-btn edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(remark.id);
              }}
              title="ערוך"
              style={{
                background: 'rgba(15, 118, 110, 0.1)',
                border: '1px solid rgba(15, 118, 110, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#0f766e'
              }}
            >
              ערוך
            </button>
          )}
          {onDelete && (
            <button
              className="action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              title="מחק"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: getDeleteButtonColor(remark.type)
              }}
            >
              מחק
            </button>
          )}
        </div>
      </div>
      )}
      
      <div className="remark-content" style={{
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#1f2937'
      }}>
        {renderContent()}
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        message="האם אתה בטוח שברצונך למחוק הערה זו?"
        onConfirm={() => {
          onDelete?.(remark.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

// Export styles as a separate component or use CSS modules
export const remarkItemStyles = `
  .remark-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
  }

  .remark-item.selected {
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.3);
  }

  .timestamp-link {
    background: rgba(15, 118, 110, 0.1);
    border: 1px solid rgba(15, 118, 110, 0.3);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 13px;
    font-weight: 600;
    color: #0f766e;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timestamp-link:hover {
    background: rgba(15, 118, 110, 0.2);
    transform: translateY(-1px);
  }

  .timestamp-link.small {
    font-size: 11px;
    padding: 1px 6px;
    margin-right: 4px;
  }

  .confidence-indicator {
    color: #f59e0b;
    font-weight: bold;
    margin-left: 4px;
  }

  .corrected-text {
    color: #10b981;
    font-weight: 600;
  }

  .occurrence-count {
    color: #6b7280;
    font-size: 12px;
    margin-left: 8px;
  }

  .more-indicator {
    color: #6b7280;
    font-size: 11px;
    margin-left: 4px;
  }

  .pinned-category {
    font-weight: 600;
    margin-right: 8px;
    text-transform: capitalize;
  }

  .action-btn:hover {
    transform: scale(1.05);
  }
`;