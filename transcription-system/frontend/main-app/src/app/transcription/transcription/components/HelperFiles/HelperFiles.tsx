'use client';

import React, { useState, useRef, useEffect } from 'react';
import { convertPDFToImages } from './legacyPdfUtils';
import './HelperFiles.css';

interface HelperFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: 'image' | 'pdf-page';
  rotation: number;
  order: number;
  pageNumber?: number;  // For PDF pages
  totalPages?: number;  // For PDF pages
  originalPdfName?: string;  // Source PDF file name
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface HelperFilesProps {
  isExpanded: boolean;
  onToggle: () => void;
  projects?: Array<{ id: string; name: string; mediaItems: Array<{ id: string; name: string }> }>;
}

export default function HelperFiles({ isExpanded, onToggle, projects = [] }: HelperFilesProps) {
  const [files, setFiles] = useState<HelperFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [editZoom, setEditZoom] = useState(100);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [persistentZoom, setPersistentZoom] = useState(100);
  
  // Edit mode pan state
  const [editPanPosition, setEditPanPosition] = useState({ x: 0, y: 0 });
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [editDragStart, setEditDragStart] = useState({ x: 0, y: 0 });
  const [showEditMode, setShowEditMode] = useState(false);
  const [selectedEditFileId, setSelectedEditFileId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  
  // Image pan state
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const editCanvasRef = useRef<HTMLDivElement>(null);

  const currentFile = files[currentFileIndex];

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      // Clean up all object URLs when component unmounts
      files.forEach(file => {
        // Only revoke blob URLs, not data URLs
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, []);

  const handleFileUpload = async (uploadedFiles: FileList) => {
    const newFiles: HelperFile[] = [];
    let currentOrder = files.length;
    
    for (const file of Array.from(uploadedFiles)) {
      if (file.type.startsWith('image/')) {
        // Handle regular images
        newFiles.push({
          id: 'file-' + Date.now() + '-' + currentOrder,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          type: 'image' as const,
          rotation: 0,
          order: currentOrder++
        });
      } else if (file.type === 'application/pdf') {
        // Handle PDFs - convert to images
        setIsProcessingPDF(true);
        try {
          const pdfImages = await convertPDFToImages(file);
          
          // Create a HelperFile entry for each page
          pdfImages.forEach((pageImage, pageIndex) => {
            newFiles.push({
              id: 'pdf-' + Date.now() + '-' + currentOrder,
              url: pageImage.url,
              name: file.name + ' - עמוד ${pageImage.pageNumber}',
              type: 'pdf-page' as const,
              rotation: 0,
              order: currentOrder++,
              pageNumber: pageImage.pageNumber,
              totalPages: pageImage.totalPages,
              originalPdfName: file.name
            });
          });
        } catch (error) {
          console.error('Error processing PDF:', error);
          alert('שגיאה בעיבוד קובץ PDF');
        } finally {
          setIsProcessingPDF(false);
        }
      }
    }
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      if (files.length === 0) {
        setCurrentFileIndex(0);
      }
    }
  };

  const handleRotate = (fileId: string, angle: number) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, rotation: (f.rotation + angle) % 360 } : f
    ));
  };
  
  const handleCrop = () => {
    if (selectedEditFileId && cropStart && cropEnd) {
      const selectedFile = files.find(f => f.id === selectedEditFileId);
      if (!selectedFile?.url) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Get the displayed image element
        const imgElement = editCanvasRef.current?.querySelector('img') as HTMLImageElement;
        if (!imgElement || !editCanvasRef.current) return;
        
        // Get actual container size (without padding)
        const containerRect = editCanvasRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width - 40; // 20px padding on each side
        const containerHeight = containerRect.height - 40;
        
        // Calculate the base display size (at 100% zoom)
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerWidth / containerHeight;
        
        let baseDisplayWidth, baseDisplayHeight;
        if (imgAspect > containerAspect) {
          baseDisplayWidth = containerWidth;
          baseDisplayHeight = containerWidth / imgAspect;
        } else {
          baseDisplayHeight = containerHeight;
          baseDisplayWidth = containerHeight * imgAspect;
        }
        
        // Apply zoom to get actual display size
        const zoom = editZoom / 100;
        const actualDisplayWidth = baseDisplayWidth * zoom;
        const actualDisplayHeight = baseDisplayHeight * zoom;
        
        // Calculate image position (centered + pan offset)
        const imgLeft = (containerWidth - actualDisplayWidth) / 2 + editPanPosition.x + 20; // 20px is padding
        const imgTop = (containerHeight - actualDisplayHeight) / 2 + editPanPosition.y + 20;
        
        // Convert selection box coordinates to be relative to the actual image
        const selectionLeft = Math.min(cropStart.x, cropEnd.x);
        const selectionTop = Math.min(cropStart.y, cropEnd.y);
        const selectionWidth = Math.abs(cropEnd.x - cropStart.x);
        const selectionHeight = Math.abs(cropEnd.y - cropStart.y);
        
        // Calculate position relative to the displayed image
        const relX = selectionLeft - imgLeft;
        const relY = selectionTop - imgTop;
        
        // Scale to natural image coordinates
        const scale = img.naturalWidth / actualDisplayWidth;
        const x = Math.max(0, Math.min(img.naturalWidth, relX * scale));
        const y = Math.max(0, Math.min(img.naturalHeight, relY * scale));
        const width = Math.min(img.naturalWidth - x, selectionWidth * scale);
        const height = Math.min(img.naturalHeight - y, selectionHeight * scale);
        
        console.log('Crop debug:', {
          selection: { left: selectionLeft, top: selectionTop, width: selectionWidth, height: selectionHeight },
          image: { left: imgLeft, top: imgTop, width: actualDisplayWidth, height: actualDisplayHeight },
          result: { x, y, width, height },
          natural: { width: img.naturalWidth, height: img.naturalHeight }
        });
        
        if (width < 10 || height < 10) {
          showNotification('האזור שנבחר קטן מדי');
          return;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the cropped portion
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        
        // Create new file from cropped image
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            const newFile: HelperFile = {
              id: 'cropped-' + Date.now(),
              url: croppedUrl,
              name: selectedFile.name + ' (חתוך)',
              type: 'image',
              rotation: 0,
              order: files.length
            };
            
            setFiles(prev => [...prev, newFile]);
            setIsCropping(false);
            setCropStart(null);
            setCropEnd(null);
            showNotification('התמונה נחתכה ונוספה לרשימת הקבצים');
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => {
        console.error('Failed to load image for cropping');
        showNotification('שגיאה בטעינת התמונה לחיתוך');
      };
      img.src = selectedFile.url;
    }
  };
  
  // Show styled notification
  const showNotification = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'helper-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };


  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(50, Math.min(300, prev + delta));
      // Reset pan when zooming out to 100% or less
      if (newZoom <= 100) {
        setPanPosition({ x: 0, y: 0 });
      }
      // Save zoom level for persistence
      setPersistentZoom(newZoom);
      return newZoom;
    });
  };
  
  const handleEditZoom = (delta: number) => {
    setEditZoom(prev => {
      const newZoom = Math.max(50, Math.min(300, prev + delta));
      // Reset pan when zooming out to 100% or less
      if (newZoom <= 100) {
        setEditPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };
  
  // Apply persistent zoom when switching files
  useEffect(() => {
    if (currentFile?.url) {
      // Apply the persistent zoom level
      setZoom(persistentZoom);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [currentFile, persistentZoom]);
  
  // Pan handlers for dragging the image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (rect) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - panPosition.x,
          y: e.clientY - panPosition.y
        });
        e.preventDefault();
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      setPanPosition({
        x: newX,
        y: newY
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handlePrevious = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    // Only revoke blob URLs, not data URLs
    if (fileToDelete?.url && fileToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToDelete.url);
    }
    
    const index = files.findIndex(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (currentFileIndex >= index && currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const openEditMode = () => {
    setShowEditMode(true);
    setSelectedEditFileId(currentFile?.id || null);
  };

  const closeEditMode = () => {
    setShowEditMode(false);
    setSelectedEditFileId(null);
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
    setEditPanPosition({ x: 0, y: 0 });
    setEditZoom(100);
  };

  if (!isExpanded) {
    return (
      <button className="helper-files-toggle-btn" onClick={onToggle}>
        <span>קבצי עזר</span>
      </button>
    );
  }

  // Edit Mode - Full Screen
  if (showEditMode) {
    const selectedEditFile = files.find(f => f.id === selectedEditFileId);
    
    return (
      <div className="helper-files-edit-mode">
        <div className="edit-mode-header">
          <h3>עריכת קבצי עזר</h3>
          <button className="edit-mode-close" onClick={closeEditMode}>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>✕</span>
          </button>
        </div>
        
        <div className="edit-mode-content">
          {/* Files List - Simple vertical list */}
          <div className="edit-files-sidebar">
            <h4>קבצים</h4>
            <div 
              className={'edit-files-list ' + (draggedIndex !== null ? 'dragging-active' : '')}
              onDragOver={(e) => {
                // Auto-scroll when dragging near edges
                const container = e.currentTarget;
                const rect = container.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const scrollMargin = 50;
                const scrollSpeed = 10;
                
                if (y < scrollMargin) {
                  // Scroll up
                  container.scrollTop -= scrollSpeed;
                } else if (y > rect.height - scrollMargin) {
                  // Scroll down
                  container.scrollTop += scrollSpeed;
                }
              }}
            >
              {files.map((file, index) => (
                <div 
                  key={file.id}
                  className={'edit-file-item ' + (selectedEditFileId === file.id ? 'active' : '') + ' ' + (draggedIndex === index ? 'dragging' : '') + ' ' + (dragOverIndex === index ? 'drag-over' : '')}
                  onClick={() => setSelectedEditFileId(file.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    
                    // Visual feedback for drag over
                    if (draggedIndex !== null && draggedIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    // Clear drag over when leaving
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    
                    if (!isNaN(dragIndex) && dragIndex !== index) {
                      const newFiles = [...files];
                      const draggedFile = newFiles[dragIndex];
                      
                      // Remove from old position
                      newFiles.splice(dragIndex, 1);
                      
                      // Calculate new index after removal
                      let targetIndex = index;
                      if (dragIndex < index) {
                        targetIndex--;
                      }
                      
                      // Insert at new position  
                      newFiles.splice(targetIndex, 0, draggedFile);
                      
                      // Update order
                      setFiles(newFiles.map((f, i) => ({ ...f, order: i })));
                    }
                    
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show visual feedback when entering
                    if (draggedIndex !== null && draggedIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                >
                  <div 
                    className="drag-handle"
                    draggable="true"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', index.toString());
                      setDraggedIndex(index);
                      
                      // Create a drag image
                      const dragImage = e.currentTarget.parentElement?.cloneNode(true) as HTMLElement;
                      if (dragImage) {
                        dragImage.style.opacity = '0.5';
                        dragImage.style.position = 'absolute';
                        dragImage.style.top = '-1000px';
                        document.body.appendChild(dragImage);
                        e.dataTransfer.setDragImage(dragImage, 20, 20);
                        setTimeout(() => document.body.removeChild(dragImage), 0);
                      }
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <span style={{ fontSize: '14px' }}>⋮⋮</span>
                  </div>
                  <div className="file-info">
                    <div className="file-thumb">
                      {file.url && (
                        <img src={file.url} alt="" />
                      )}
                    </div>
                    <div className="file-info-text">
                      <div className="file-name-wrapper" data-lang={/[א-ת]/.test(file.name) ? 'he' : 'en'}>
                        <span className="file-name" title={file.name}>{file.name}</span>
                      </div>
                      {file.type === 'pdf-page' && (
                        <span className="file-page-info" style={{ fontSize: '11px', opacity: 0.7 }}>
                          עמוד {file.pageNumber} מתוך {file.totalPages}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="file-actions">
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      title="מחק"
                    >
                      <span style={{ fontSize: '14px' }}>🗑</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Preview & Edit Area */}
          <div className="edit-preview-area">
            {selectedEditFile && (
              <>
                <div className="edit-toolbar">
                  <button onClick={() => handleRotate(selectedEditFile.id, -90)} title="סובב שמאלה">
                    <span style={{ fontSize: '18px' }}>↺</span>
                    <span>סובב שמאלה</span>
                  </button>
                  <button onClick={() => handleRotate(selectedEditFile.id, 90)} title="סובב ימינה">
                    <span style={{ fontSize: '18px' }}>↻</span>
                    <span>סובב ימינה</span>
                  </button>
                  <div className="zoom-controls-edit">
                    <button onClick={() => handleEditZoom(-20)} title="הקטן">
                      <span style={{ fontSize: '18px' }}>−</span>
                    </button>
                    <span className="zoom-level-edit">{editZoom}%</span>
                    <button onClick={() => handleEditZoom(20)} title="הגדל">
                      <span style={{ fontSize: '18px' }}>+</span>
                    </button>
                  </div>
                  <button 
                    className={'crop-btn ' + (isCropping ? 'active' : '')} 
                    onClick={() => {
                      if (isCropping && cropStart && cropEnd) {
                        handleCrop();
                      } else {
                        setIsCropping(!isCropping);
                        setCropStart(null);
                        setCropEnd(null);
                      }
                    }}
                    title="חתוך"
                  >
                    <span style={{ fontSize: '18px' }}>✂</span>
                    <span>{isCropping ? (cropStart && cropEnd ? 'שמור חיתוך' : 'סמן אזור') : 'חתוך'}</span>
                  </button>
                </div>
                
                <div 
                  ref={editCanvasRef}
                  className="edit-canvas-container"
                  onMouseDown={(e) => {
                    if (isCropping) {
                      // Start crop selection
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      setCropStart({ x, y });
                      setCropEnd(null);
                      setIsDrawingCrop(true);
                      e.preventDefault();
                    } else if (editZoom > 100) {
                      // Start pan if zoomed
                      setIsEditDragging(true);
                      setEditDragStart({
                        x: e.clientX - editPanPosition.x,
                        y: e.clientY - editPanPosition.y
                      });
                      e.preventDefault();
                    }
                  }}
                  onMouseMove={(e) => {
                    if (isCropping && isDrawingCrop && cropStart) {
                      // Update crop selection
                      const rect = e.currentTarget.getBoundingClientRect();
                      setCropEnd({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    } else if (isEditDragging && editZoom > 100) {
                      // Pan the image
                      setEditPanPosition({
                        x: e.clientX - editDragStart.x,
                        y: e.clientY - editDragStart.y
                      });
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isCropping && isDrawingCrop && cropStart) {
                      // Finish crop selection
                      const rect = e.currentTarget.getBoundingClientRect();
                      const endX = e.clientX - rect.left;
                      const endY = e.clientY - rect.top;
                      
                      // Make sure we have a valid selection
                      if (Math.abs(endX - cropStart.x) > 10 && Math.abs(endY - cropStart.y) > 10) {
                        setCropEnd({ x: endX, y: endY });
                      } else {
                        // Reset if selection is too small
                        setCropStart(null);
                        setCropEnd(null);
                      }
                      setIsDrawingCrop(false);
                    }
                    setIsEditDragging(false);
                  }}
                  onMouseLeave={() => {
                    setIsDrawingCrop(false);
                    setIsEditDragging(false);
                  }}
                  style={{ 
                    position: 'relative', 
                    cursor: isCropping ? 'crosshair' : (editZoom > 100 ? (isEditDragging ? 'grabbing' : 'grab') : 'default'),
                    overflow: 'hidden'
                  }}
                >
                  {selectedEditFile.url && (
                    <img 
                      src={selectedEditFile.url} 
                      alt={selectedEditFile.name}
                      style={{ 
                        transform: `translate(${editPanPosition.x}px, ${editPanPosition.y}px) scale(${editZoom / 100}) rotate(${selectedEditFile.rotation}deg)`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transition: isEditDragging ? 'none' : 'transform 0.3s ease',
                        userSelect: 'none',
                        pointerEvents: isCropping ? 'none' : 'auto'
                      }}
                    />
                  )}
                  {isCropping && cropStart && cropEnd && (
                    <div
                      style={{
                        position: 'absolute',
                        left: Math.min(cropStart.x, cropEnd.x),
                        top: Math.min(cropStart.y, cropEnd.y),
                        width: Math.abs(cropEnd.x - cropStart.x),
                        height: Math.abs(cropEnd.y - cropStart.y),
                        border: '2px solid #20c997',
                        backgroundColor: 'rgba(32, 201, 151, 0.15)',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="edit-mode-footer">
          <button className="save-btn" onClick={closeEditMode}>
            שמור וסגור
          </button>
        </div>
      </div>
    );
  }

  // Normal View Mode
  return (
    <div className="helper-files-container">
      {/* Loading overlay for PDF processing */}
      {isProcessingPDF && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          borderRadius: '15px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <div style={{ color: 'white', fontSize: '16px' }}>מעבד קובץ PDF...</div>
        </div>
      )}
      
      {/* Main Display Area */}
      <div className="helper-files-display">
        {files.length === 0 ? (
          <div className="helper-files-empty">
            <span style={{ fontSize: '48px', opacity: 0.3 }}>🖼</span>
            <p>אין קבצי עזר</p>
            <button className="add-files-empty-btn" onClick={() => fileInputRef.current?.click()}>
              הוסף קבצים
            </button>
            <button 
              className="control-btn close-btn" 
              onClick={onToggle}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px'
              }}
              title="סגור"
            >
              <span style={{ fontSize: '18px', color: 'white' }}>✕</span>
            </button>
          </div>
        ) : (
          <>
            {/* File Display with Pan Support */}
            <div 
              ref={imageContainerRef}
              className="file-display-area"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ 
                cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {currentFile?.url && (
                <img 
                  src={currentFile.url} 
                  alt={currentFile.name}
                  style={{ 
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom / 100}) rotate(${currentFile.rotation}deg)`,
                    transformOrigin: 'center',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    ...(currentFile.cropData ? {
                      clipPath: 'inset(' + currentFile.cropData.y + 'px ' + currentFile.cropData.x + 'px)'
                    } : {})
                  }}
                />
              )}
            </div>

            {/* Close button - top right corner */}
            <button 
              className="control-btn close-btn-corner" 
              onClick={onToggle}
              title="סגור"
            >
              <span style={{ fontSize: '14px', color: 'white' }}>✕</span>
            </button>
            
            {/* Split Controls - Left Side */}
            <div className="helper-controls-left">
              {/* Navigation and Zoom Group */}
              {files.length > 1 && (
                <>
                  <button 
                    className="control-btn-float" 
                    onClick={handlePrevious} 
                    disabled={currentFileIndex === 0}
                    title="קודם"
                  >
                    <span style={{ fontSize: '14px' }}>▶</span>
                  </button>
                  <span className="file-counter-float">{currentFileIndex + 1}/{files.length}</span>
                  <button 
                    className="control-btn-float" 
                    onClick={handleNext} 
                    disabled={currentFileIndex === files.length - 1}
                    title="הבא"
                  >
                    <span style={{ fontSize: '14px' }}>◀</span>
                  </button>
                </>
              )}
              
              {(files.length > 1 || files.length === 1) && <div className="control-divider-float"></div>}
              
              {/* Zoom controls */}
              <button className="control-btn-float" onClick={() => handleZoom(20)} title="הגדל">
                <span style={{ fontSize: '16px' }}>+</span>
              </button>
              <span className="zoom-level-float">{zoom}%</span>
              <button className="control-btn-float" onClick={() => handleZoom(-20)} title="הקטן">
                <span style={{ fontSize: '16px' }}>−</span>
              </button>
            </div>
            
            {/* Split Controls - Right Side */}
            <div className="helper-controls-right">
              {/* Rotate buttons */}
              {currentFile && (
                <>
                  <button 
                    className="control-btn-float" 
                    onClick={() => handleRotate(currentFile.id, -90)} 
                    title="סובב שמאלה"
                  >
                    <span style={{ fontSize: '14px' }}>↺</span>
                  </button>
                  <button 
                    className="control-btn-float" 
                    onClick={() => handleRotate(currentFile.id, 90)} 
                    title="סובב ימינה"
                  >
                    <span style={{ fontSize: '14px' }}>↻</span>
                  </button>
                  
                  <div className="control-divider-float"></div>
                </>
              )}
              
              {/* Action buttons */}
              <button className="control-btn-float" onClick={() => fileInputRef.current?.click()} title="הוסף">
                <span style={{ fontSize: '14px' }}>📁</span>
              </button>
              
              <button className="control-btn-float" onClick={openEditMode} title="ערוך">
                <span style={{ fontSize: '14px' }}>✏</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
    </div>
  );
}