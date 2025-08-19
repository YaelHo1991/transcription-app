'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRemarks } from './RemarksContext';
import RemarkItem from './RemarkItem';
import { 
  RemarkType, 
  RemarkStatus, 
  SortBy, 
  SortOrder,
  Priority,
  PinnedCategory,
  PinnedRemark,
  RemarkEvent
} from './types';
import './Remarks.css';

interface RemarksProps {
  theme?: 'transcription' | 'proofreading';
}

export default function Remarks({ theme = 'transcription' }: RemarksProps) {

  const {
    state,
    addRemark,
    getFilteredRemarks,
    getSortedRemarks,
    setFilter,
    setSort,
    deleteRemark,
    updateRemark,
    navigateToTimestamp
  } = useRemarks();
  
  const [activeFilter, setActiveFilter] = useState<RemarkType | 'all'>('all');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showFilterIcons, setShowFilterIcons] = useState(false);
  const [pinnedEditingId, setPinnedEditingId] = useState<string | null>(null);
  const [newPinnedIds, setNewPinnedIds] = useState<Set<string>>(new Set());
  const [forceShowPinned, setForceShowPinned] = useState(false);
  const pinnedInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `${timestamp}: ${msg}`]);
    console.log('DEBUG:', msg);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const remarkItemsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const pinnedInputRef = useRef<HTMLInputElement>(null);
  const latestStateRef = useRef(state);
  
  // Keep ref up to date with state
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // Listen for highlight events from TextEditor
  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      const { timestamp } = event.detail;
      setHighlightedTimestamp(timestamp);
      
      // If timestamp provided, find and scroll to matching remark
      if (timestamp) {
        const allRemarks = getFilteredRemarks();
        const matchingRemark = allRemarks.find(r => 
          r.type === RemarkType.UNCERTAINTY && 
          (r as any).timestamp?.formatted === timestamp
        );
        
        if (matchingRemark && remarkItemsRef.current[matchingRemark.id]) {
          setTimeout(() => {
            remarkItemsRef.current[matchingRemark.id]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 100);
        }
      }
    };
    
    document.addEventListener('highlightRemarkByTimestamp', handleHighlight as EventListener);
    return () => {
      document.removeEventListener('highlightRemarkByTimestamp', handleHighlight as EventListener);
    };
  }, [getFilteredRemarks]);

  // Focus input when editing ID changes
  useEffect(() => {
    addDebug(`Focus effect running: pinnedEditingId = ${pinnedEditingId}`);
    
    if (pinnedEditingId) {
      addDebug(`Starting focus attempts for: ${pinnedEditingId}`);
      
      // Initial focus attempt with selection only once
      let hasSelected = false;
      
      // Also use requestAnimationFrame for smoother focus
      requestAnimationFrame(() => {
        const input = pinnedInputRefs.current[pinnedEditingId];
        if (input && document.activeElement !== input) {
          input.focus();
          if (!hasSelected && !input.value) {
            input.select();
            hasSelected = true;
          }
        }
      });
      
      // Try to focus multiple times but without selecting after the first success
      const attempts = [50, 100, 200];
      const timers: NodeJS.Timeout[] = [];
      
      attempts.forEach(delay => {
        const timer = setTimeout(() => {
          const input = pinnedInputRefs.current[pinnedEditingId];
          
          if (input && document.activeElement !== input) {
            addDebug(`Focus attempt at ${delay}ms`);
            input.focus();
            if (!hasSelected && !input.value) {
              input.select();
              hasSelected = true;
            }
          }
        }, delay);
        timers.push(timer);
      });
      
      return () => timers.forEach(clearTimeout);
    }
  }, [pinnedEditingId]);

  // Get filtered and sorted remarks
  let filteredRemarks = getFilteredRemarks();
  
  
  const sortedRemarks = getSortedRemarks(filteredRemarks);

  // Count by type
  const countByType = {
    [RemarkType.UNCERTAINTY]: sortedRemarks.filter(r => r.type === RemarkType.UNCERTAINTY).length,
    [RemarkType.SPELLING]: sortedRemarks.filter(r => r.type === RemarkType.SPELLING).length,
    [RemarkType.MEDIA_NOTE]: sortedRemarks.filter(r => r.type === RemarkType.MEDIA_NOTE).length,
    [RemarkType.PINNED]: sortedRemarks.filter(r => r.type === RemarkType.PINNED).length
  };

  const totalCount = sortedRemarks.length;

  // Handle filter toggle
  const handleFilterToggle = (type: RemarkType | 'all') => {
    setActiveFilter(type);
    if (type === 'all') {
      setFilter({ types: [RemarkType.UNCERTAINTY, RemarkType.SPELLING, RemarkType.MEDIA_NOTE, RemarkType.PINNED] });
    } else {
      setFilter({ types: [type] });
    }
  };

  // Handle sort change
  const handleSortChange = (by: SortBy) => {
    const currentSort = state.sortOptions;
    const newOrder = currentSort.by === by && currentSort.order === SortOrder.DESC 
      ? SortOrder.ASC 
      : SortOrder.DESC;
    setSort({ by, order: newOrder });
  };

  // Handle adding new pinned remark
  const handleAddPinned = () => {
    // Force show the pinned section
    setForceShowPinned(true);
    
    let handled = false; // Flag to prevent double handling
    
    // Set up a one-time listener for the remark creation event
    const handleRemarkCreated = (event: CustomEvent) => {
      const newRemark = event.detail.remark;
      if (newRemark.type === RemarkType.PINNED && !handled) {
        handled = true; // Mark as handled
        addDebug(`Remark created event received: ${newRemark.id}`);
        
        // Mark as new for tracking
        setNewPinnedIds(prev => {
          const next = new Set(prev);
          next.add(newRemark.id);
          return next;
        });
        
        // Set editing mode immediately
        setPinnedEditingId(newRemark.id);
        
        // Remove the listener
        document.removeEventListener('remarkCreate', handleRemarkCreated as EventListener);
      }
    };
    
    // Listen for the remark creation event
    document.addEventListener('remarkCreate', handleRemarkCreated as EventListener);
    
    // Add the remark first with complete structure (without id, createdAt, updatedAt - those are auto-generated)
    const newRemark = {
      type: RemarkType.PINNED,
      content: '',
      status: RemarkStatus.OPEN,
      isPinned: true,
      category: PinnedCategory.OTHER,
      color: ''
    };
    
    addDebug(`Adding new pinned remark`);
    addRemark(newRemark);
    
    // Fallback in case event doesn't fire
    setTimeout(() => {
      document.removeEventListener('remarkCreate', handleRemarkCreated as EventListener);
      
      if (!handled) {
        // Use latest state from ref
        const pinnedRemarks = latestStateRef.current.remarks.filter(r => r.type === RemarkType.PINNED);
        addDebug(`Fallback check: Total pinned remarks: ${pinnedRemarks.length}`);
        
        if (pinnedRemarks.length > 0) {
          // Get the most recently created pinned remark
          const sortedPinned = pinnedRemarks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const newestRemark = sortedPinned[0];
          
          if (!newPinnedIds.has(newestRemark.id)) {
            handled = true;
            addDebug(`Fallback: Setting editing mode for: ${newestRemark.id}`);
            
            setNewPinnedIds(prev => {
              const next = new Set(prev);
              next.add(newestRemark.id);
              return next;
            });
            
            setPinnedEditingId(newestRemark.id);
          }
        }
      }
    }, 500);
  };

  // Handle pinned content update
  const handlePinnedUpdate = (id: string, content: string) => {
    updateRemark(id, { content: content });
  };

  // Handle pinned blur
  const handlePinnedBlur = (id: string, content: string) => {
    // Just save the content and close editing
    if (content !== (state.remarks.find(r => r.id === id) as any)?.content) {
      handlePinnedUpdate(id, content);
    }
    // Remove from new IDs 
    setNewPinnedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPinnedEditingId(null);
  };

  // Handle pinned Enter key - save and add new
  const handlePinnedEnter = (id: string, content: string) => {
    // Save current content
    handlePinnedUpdate(id, content);
    // Remove from new IDs
    setNewPinnedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Add a new editable field
    handleAddPinned();
  };

  // Handle edit pinned item
  const handleEditPinned = (id: string) => {
    setPinnedEditingId(id);
    // Focus will be handled by the useEffect
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    });
  };


  return (
    <div className="remarks-panel" ref={containerRef}>
      <div className="remarks-panel-header">
        <h3>הערות</h3>
        <div className="remarks-header-controls">
          {/* Toggle checkbox for filter icons and sort options */}
          <button
            className={`sort-toggle-btn ${showFilterIcons ? 'active' : ''}`}
            onClick={() => {
              setShowFilterIcons(!showFilterIcons);
              if (!showFilterIcons) {
                setShowSortOptions(true);
              } else {
                setShowSortOptions(false);
              }
            }}
            title="הצג אפשרויות סינון ומיון"
            style={{
              background: showFilterIcons ? 'rgba(15, 118, 110, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              padding: '4px',
              marginRight: '8px'
            }}
          >
            <span className="toggle-indicator" style={{ 
              display: 'block',
              width: '16px',
              height: '16px',
              background: showFilterIcons ? 'white' : 'rgba(255,255,255,0.5)',
              borderRadius: '2px'
            }} />
          </button>
          
          {/* Pinned items icon - click to add */}
          <button
            className="filter-icon pinned-icon"
            onClick={handleAddPinned}
            title="הוסף הערה מוצמדת"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '14px',
              color: 'white',
              marginRight: '8px',
              cursor: 'pointer'
            }}
          >
            ⚑
          </button>
          
          {/* Filter type icons - only visible when checkbox is checked */}
          {showFilterIcons && (
          <div className="filter-icons" style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`filter-icon ${activeFilter === RemarkType.UNCERTAINTY ? 'active' : ''}`}
              onClick={() => handleFilterToggle(activeFilter === RemarkType.UNCERTAINTY ? 'all' : RemarkType.UNCERTAINTY)}
              title="אי-ודאות"
              style={{
                background: activeFilter === RemarkType.UNCERTAINTY ? 'rgba(15, 118, 110, 0.15)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white'
              }}
            >
              ?
            </button>
            <button
              className={`filter-icon ${activeFilter === RemarkType.SPELLING ? 'active' : ''}`}
              onClick={() => handleFilterToggle(activeFilter === RemarkType.SPELLING ? 'all' : RemarkType.SPELLING)}
              title="איות/שמות"
              style={{
                background: activeFilter === RemarkType.SPELLING ? 'rgba(15, 118, 110, 0.15)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '14px',
                color: 'white'
              }}
            >
              ✎
            </button>
            <button
              className={`filter-icon ${activeFilter === RemarkType.MEDIA_NOTE ? 'active' : ''}`}
              onClick={() => handleFilterToggle(activeFilter === RemarkType.MEDIA_NOTE ? 'all' : RemarkType.MEDIA_NOTE)}
              title="הערות מדיה"
              style={{
                background: activeFilter === RemarkType.MEDIA_NOTE ? 'rgba(15, 118, 110, 0.15)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '14px',
                color: 'white'
              }}
            >
              ♪
            </button>
          </div>
          )}
          
          
          <span className="remarks-count">{totalCount}</span>
        </div>
      </div>
      
      
      {/* Sort options - only visible when filter icons are shown */}
      {showFilterIcons && showSortOptions && (
        <div className="remarks-sort-options" style={{
          padding: '8px',
          borderBottom: '1px solid rgba(15, 118, 110, 0.2)',
          background: 'rgba(15, 118, 110, 0.05)'
        }}>
          <button
            className={`sort-btn ${state.sortOptions.by === SortBy.TIME ? 'active' : ''}`}
            onClick={() => handleSortChange(SortBy.TIME)}
          >
            זמן {state.sortOptions.by === SortBy.TIME && (state.sortOptions.order === SortOrder.DESC ? '↓' : '↑')}
          </button>
          <button
            className={`sort-btn ${state.sortOptions.by === SortBy.TYPE ? 'active' : ''}`}
            onClick={() => handleSortChange(SortBy.TYPE)}
          >
            סוג
          </button>
          <button
            className={`sort-btn ${state.sortOptions.by === SortBy.STATUS ? 'active' : ''}`}
            onClick={() => handleSortChange(SortBy.STATUS)}
          >
            סטטוס
          </button>
        </div>
      )}
      
      <div className="remarks-list" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        padding: '0',
        margin: '0 -12px -12px -12px',
        borderRadius: '0 0 6px 6px'
      }}>
        {/* Pinned items section - grows as needed up to 25% */}
        {(sortedRemarks.filter(r => r.type === RemarkType.PINNED).length > 0 || newPinnedIds.size > 0 || forceShowPinned) && (
          <div className="pinned-remarks-section" style={{ 
            maxHeight: '25%',
            minHeight: (sortedRemarks.filter(r => r.type === RemarkType.PINNED).length > 0 || newPinnedIds.size > 0) ? '40px' : '0',
            height: 'auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'rgba(15, 118, 110, 0.03)',
            borderBottom: '1px solid rgba(15, 118, 110, 0.2)',
            marginBottom: '2px',
            margin: '0',
            padding: (sortedRemarks.filter(r => r.type === RemarkType.PINNED).length > 0 || newPinnedIds.size > 0) ? '4px 8px' : '0',
            borderRadius: '0',
            scrollbarWidth: 'thin',
            scrollbarColor: '#0f766e rgba(15, 118, 110, 0.1)'
          }}>
            {sortedRemarks.filter(r => r.type === RemarkType.PINNED)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Sort newest first
              .map(remark => {
                // Show input for remarks being edited
                const shouldShowInput = pinnedEditingId === remark.id;
                
                // Only log once when editing starts
                if (shouldShowInput && remark.id.includes('pinned-temp')) {
                  console.log(`Showing input for ${remark.id}`);
                }
                
                return (
                  <div 
                    key={remark.id}
                    ref={el => { remarkItemsRef.current[remark.id] = el; }}
                  >
                    {shouldShowInput ? (
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <input
                      ref={(el) => { 
                        pinnedInputRefs.current[remark.id] = el;
                        // Auto-focus when the input appears (without select to avoid text replacement)
                        if (el && document.activeElement !== el) {
                          setTimeout(() => {
                            el.focus();
                          }, 0);
                        }
                      }}
                      type="text"
                      defaultValue={(remark as any).content || ''}
                      autoFocus={true}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const value = e.target.value;
                        handlePinnedBlur(remark.id, value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePinnedEnter(remark.id, e.currentTarget.value);
                          e.preventDefault();
                        } else if (e.key === 'Escape') {
                          setPinnedEditingId(null);
                          setNewPinnedIds(prev => {
                            const next = new Set(prev);
                            next.delete(remark.id);
                            return next;
                          });
                        }
                      }}
                      onChange={(e) => {
                        // Update live as user types
                        updateRemark(remark.id, { content: e.target.value });
                      }}
                      dir="rtl"
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid #0f766e',
                        borderRadius: '4px',
                        fontSize: '13px',
                        background: 'white',
                        color: '#1f2937',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => {
                        deleteRemark(remark.id);
                        setNewPinnedIds(prev => {
                          const next = new Set(prev);
                          next.delete(remark.id);
                          return next;
                        });
                        setPinnedEditingId(null);
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(15, 118, 110, 0.1)',
                        color: '#0f766e',
                        border: '1px solid rgba(15, 118, 110, 0.3)',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <RemarkItem
                    remark={remark}
                    onEdit={handleEditPinned}
                    onDelete={deleteRemark}
                    onNavigate={navigateToTimestamp}
                    isSelected={state.selectedRemarkId === remark.id}
                    onCopy={handleCopyToClipboard}
                  />
                )}
                  </div>
                );
              })}
          </div>
        )}
        
        {/* Regular remarks section - remaining space */}
        <div className="regular-remarks-section" style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          margin: '0',
          padding: '0 8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#0f766e rgba(15, 118, 110, 0.1)'
        }}>
          {sortedRemarks.filter(r => r.type !== RemarkType.PINNED).length === 0 && 
           sortedRemarks.filter(r => r.type === RemarkType.PINNED).length === 0 ? (
            <div className="no-remarks">
              <p>אין הערות עדיין</p>
              <p className="hint">הערות יתווספו אוטומטית במהלך התמלול</p>
            </div>
          ) : (
            sortedRemarks.filter(r => r.type !== RemarkType.PINNED).length > 0 ? sortedRemarks.filter(r => r.type !== RemarkType.PINNED).map(remark => {
              const isHighlighted = remark.type === RemarkType.UNCERTAINTY && 
                                    highlightedTimestamp === (remark as any).timestamp?.formatted;
              
              return (
                <div 
                  key={remark.id}
                  ref={el => { remarkItemsRef.current[remark.id] = el; }}
                  style={{
                    transition: 'all 0.3s ease',
                    background: isHighlighted ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                    borderRadius: isHighlighted ? '8px' : '0',
                    padding: isHighlighted ? '4px' : '0',
                    marginBottom: isHighlighted ? '8px' : '0',
                    boxShadow: isHighlighted ? '0 0 0 2px rgba(15, 118, 110, 0.2)' : 'none'
                  }}
                >
                  <RemarkItem
                    remark={remark}
                    onDelete={deleteRemark}
                    onNavigate={navigateToTimestamp}
                    isSelected={state.selectedRemarkId === remark.id || isHighlighted}
                  />
                </div>
              );
            }) : null
          )}
        </div>
      </div>
    </div>
  );
}