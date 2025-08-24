'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  TranscriptionData,
  TranscriptionState,
  MediaTranscriptionMap,
  CreateTranscriptionOptions,
  TranscriptionOperationResult,
  MediaSegment
} from '../types/transcription';
import axios from 'axios';

interface TranscriptionContextType {
  // State
  state: TranscriptionState;
  isInitializing: boolean;
  
  // Actions
  createTranscription: (options: CreateTranscriptionOptions) => TranscriptionOperationResult;
  deleteTranscription: (transcriptionId: string) => TranscriptionOperationResult;
  updateTranscriptionContent: (transcriptionId: string, content: string) => void;
  switchTranscription: (transcriptionId: string) => void;
  clearTranscription: (transcriptionId: string) => void;
  
  // Multi-media operations
  linkMediaToTranscription: (transcriptionId: string, mediaId: string) => void;
  unlinkMediaFromTranscription: (transcriptionId: string, mediaId: string) => void;
  splitTranscription: (transcriptionId: string, splitPoint: number) => TranscriptionOperationResult;
  reorderMediaSegments: (transcriptionId: string, newOrder: string[]) => void;
  
  // Getters
  getTranscriptionsForMedia: (mediaId: string) => TranscriptionData[];
  getActiveTranscription: () => TranscriptionData | undefined;
  getTranscriptionById: (transcriptionId: string) => TranscriptionData | undefined;
  getNextTranscriptionNumber: (mediaId: string) => number;
  
  // Session management
  saveToSession: (transcriptionId: string, blocks: any[], speakers: any[]) => Promise<void>;
  loadFromSession: (mediaId: string, transcriptionNumber: number) => Promise<any>;
  createBackup: (transcriptionId: string, blocks: any[], speakers: any[]) => Promise<void>;
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined);

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error('useTranscription must be used within TranscriptionProvider');
  }
  return context;
};

interface TranscriptionProviderProps {
  children: React.ReactNode;
  initialMediaId?: string;
  initialMediaName?: string;
}

export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({ 
  children, 
  initialMediaId,
  initialMediaName 
}) => {
  const [state, setState] = useState<TranscriptionState>({
    transcriptions: new Map(),
    mediaTranscriptionMap: new Map(),
    activeTranscriptionId: undefined,
    activeMediaId: initialMediaId
  });
  
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Log initial media info
  console.log('📍 TranscriptionProvider initialized with mediaId:', initialMediaId, 'mediaName:', initialMediaName);
  console.log('📦 Initial state:', {
    transcriptionsCount: state.transcriptions.size,
    activeTranscriptionId: state.activeTranscriptionId,
    activeMediaId: state.activeMediaId
  });

  // Track if we've initialized for this media - use a ref to avoid re-renders
  const initializedMediaRef = useRef<Set<string>>(new Set());
  
  // Cache for session content to improve performance
  const sessionCacheRef = useRef<Map<string, any>>(new Map());
  
  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<{ transcriptionId: string; content: string } | null>(null);

  const generateTranscriptionId = () => {
    // Add a small delay and more randomness to ensure uniqueness
    return `transcription-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 7)}`;
  };

  const createTranscription = useCallback((options: CreateTranscriptionOptions): TranscriptionOperationResult => {
    try {
      // Prevent duplicate creation
      const transcriptionId = generateTranscriptionId();
      
      // Check if this ID already exists (shouldn't happen but just in case)
      if (state.transcriptions.has(transcriptionId)) {
        console.warn('Transcription ID already exists, skipping creation');
        return { success: false, error: 'Duplicate ID detected' };
      }
      
      // Get existing transcriptions before generating ID
      const existingTranscriptions = getTranscriptionsForMedia(options.mediaId);
      const transcriptionNumber = existingTranscriptions.length + 1;
      
      const newTranscription: TranscriptionData = {
        id: transcriptionId,
        mediaIds: [options.mediaId],
        content: options.content || '',
        number: transcriptionNumber,
        name: options.name || `תמלול ${transcriptionNumber}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 0,
        isMultiMedia: false,
        speakers: options.copySpeakers && options.sourceTranscriptionId 
          ? state.transcriptions.get(options.sourceTranscriptionId)?.speakers 
          : [],
        remarks: []
      };

      setState(prevState => {
        const newTranscriptions = new Map(prevState.transcriptions);
        newTranscriptions.set(transcriptionId, newTranscription);

        const newMediaMap = new Map(prevState.mediaTranscriptionMap);
        const existingMediaMap = newMediaMap.get(options.mediaId);
        
        // Create a new object to avoid mutation
        const mediaMap = existingMediaMap ? {
          ...existingMediaMap,
          transcriptionIds: [...existingMediaMap.transcriptionIds, transcriptionId],
          activeTranscriptionId: transcriptionId
        } : {
          mediaId: options.mediaId,
          transcriptionIds: [transcriptionId],
          activeTranscriptionId: transcriptionId
        };
        
        newMediaMap.set(options.mediaId, mediaMap);

        return {
          ...prevState,
          transcriptions: newTranscriptions,
          mediaTranscriptionMap: newMediaMap,
          activeTranscriptionId: transcriptionId
        };
      });

      return { success: true, transcriptionId };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [state]);

  const deleteTranscription = useCallback((transcriptionId: string): TranscriptionOperationResult => {
    try {
      const transcription = state.transcriptions.get(transcriptionId);
      if (!transcription) {
        return { success: false, error: 'Transcription not found' };
      }

      setState(prevState => {
        const newTranscriptions = new Map(prevState.transcriptions);
        newTranscriptions.delete(transcriptionId);

        const newMediaMap = new Map(prevState.mediaTranscriptionMap);
        transcription.mediaIds.forEach(mediaId => {
          const mediaMap = newMediaMap.get(mediaId);
          if (mediaMap) {
            mediaMap.transcriptionIds = mediaMap.transcriptionIds.filter(id => id !== transcriptionId);
            if (mediaMap.activeTranscriptionId === transcriptionId) {
              mediaMap.activeTranscriptionId = mediaMap.transcriptionIds[0];
            }
            newMediaMap.set(mediaId, mediaMap);
          }
        });

        return {
          ...prevState,
          transcriptions: newTranscriptions,
          mediaTranscriptionMap: newMediaMap,
          activeTranscriptionId: prevState.activeTranscriptionId === transcriptionId 
            ? undefined 
            : prevState.activeTranscriptionId
        };
      });

      return { success: true, transcriptionId };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [state]);

  const updateTranscriptionContent = useCallback((transcriptionId: string, content: string) => {
    setState(prevState => {
      const newTranscriptions = new Map(prevState.transcriptions);
      const transcription = newTranscriptions.get(transcriptionId);
      
      if (transcription) {
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        transcription.content = content;
        transcription.wordCount = words.length;
        transcription.updatedAt = new Date();
        newTranscriptions.set(transcriptionId, transcription);
      }

      return {
        ...prevState,
        transcriptions: newTranscriptions
      };
    });
  }, []);

  const switchTranscription = useCallback(async (transcriptionId: string) => {
    // Save current transcription before switching
    const currentTranscription = getActiveTranscription();
    if (currentTranscription && window.blockManagerRef?.current) {
      const blocks = window.blockManagerRef.current.getBlocks();
      const speakers = window.speakerManagerRef?.current?.getAllSpeakers ? 
        window.speakerManagerRef.current.getAllSpeakers() : [];
      await saveToSession(currentTranscription.id, blocks, speakers);
    }
    
    // Switch to new transcription
    setState(prevState => {
      const transcription = prevState.transcriptions.get(transcriptionId);
      if (!transcription) return prevState;

      const newMediaMap = new Map(prevState.mediaTranscriptionMap);
      transcription.mediaIds.forEach(mediaId => {
        const mediaMap = newMediaMap.get(mediaId);
        if (mediaMap) {
          mediaMap.activeTranscriptionId = transcriptionId;
          newMediaMap.set(mediaId, mediaMap);
        }
      });

      return {
        ...prevState,
        mediaTranscriptionMap: newMediaMap,
        activeTranscriptionId: transcriptionId
      };
    });
  }, []);

  const clearTranscription = useCallback((transcriptionId: string) => {
    updateTranscriptionContent(transcriptionId, '');
  }, [updateTranscriptionContent]);

  const linkMediaToTranscription = useCallback((transcriptionId: string, mediaId: string) => {
    setState(prevState => {
      const newTranscriptions = new Map(prevState.transcriptions);
      const transcription = newTranscriptions.get(transcriptionId);
      
      if (transcription && !transcription.mediaIds.includes(mediaId)) {
        transcription.mediaIds.push(mediaId);
        transcription.isMultiMedia = transcription.mediaIds.length > 1;
        transcription.updatedAt = new Date();
        newTranscriptions.set(transcriptionId, transcription);

        const newMediaMap = new Map(prevState.mediaTranscriptionMap);
        const mediaMap = newMediaMap.get(mediaId) || {
          mediaId,
          transcriptionIds: []
        };
        
        if (!mediaMap.transcriptionIds.includes(transcriptionId)) {
          mediaMap.transcriptionIds.push(transcriptionId);
        }
        newMediaMap.set(mediaId, mediaMap);

        return {
          ...prevState,
          transcriptions: newTranscriptions,
          mediaTranscriptionMap: newMediaMap
        };
      }

      return prevState;
    });
  }, []);

  const unlinkMediaFromTranscription = useCallback((transcriptionId: string, mediaId: string) => {
    setState(prevState => {
      const newTranscriptions = new Map(prevState.transcriptions);
      const transcription = newTranscriptions.get(transcriptionId);
      
      if (transcription) {
        transcription.mediaIds = transcription.mediaIds.filter(id => id !== mediaId);
        transcription.isMultiMedia = transcription.mediaIds.length > 1;
        transcription.updatedAt = new Date();
        newTranscriptions.set(transcriptionId, transcription);

        const newMediaMap = new Map(prevState.mediaTranscriptionMap);
        const mediaMap = newMediaMap.get(mediaId);
        if (mediaMap) {
          mediaMap.transcriptionIds = mediaMap.transcriptionIds.filter(id => id !== transcriptionId);
          if (mediaMap.activeTranscriptionId === transcriptionId) {
            mediaMap.activeTranscriptionId = mediaMap.transcriptionIds[0];
          }
          newMediaMap.set(mediaId, mediaMap);
        }

        return {
          ...prevState,
          transcriptions: newTranscriptions,
          mediaTranscriptionMap: newMediaMap
        };
      }

      return prevState;
    });
  }, []);

  const splitTranscription = useCallback((transcriptionId: string, splitPoint: number): TranscriptionOperationResult => {
    try {
      const originalTranscription = state.transcriptions.get(transcriptionId);
      if (!originalTranscription) {
        return { success: false, error: 'Transcription not found' };
      }

      const firstPart = originalTranscription.content.substring(0, splitPoint);
      const secondPart = originalTranscription.content.substring(splitPoint);

      // Update original transcription with first part
      updateTranscriptionContent(transcriptionId, firstPart);

      // Create new transcription with second part
      const result = createTranscription({
        mediaId: originalTranscription.mediaIds[0],
        name: `${originalTranscription.name} - חלק 2`,
        content: secondPart,
        copySpeakers: true,
        sourceTranscriptionId: transcriptionId
      });

      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [state, updateTranscriptionContent, createTranscription]);

  const reorderMediaSegments = useCallback((transcriptionId: string, newOrder: string[]) => {
    setState(prevState => {
      const newTranscriptions = new Map(prevState.transcriptions);
      const transcription = newTranscriptions.get(transcriptionId);
      
      if (transcription && transcription.mediaSegments) {
        const reorderedSegments = newOrder.map((mediaId, index) => {
          const segment = transcription.mediaSegments?.find(s => s.mediaId === mediaId);
          if (segment) {
            return { ...segment, order: index };
          }
          return null;
        }).filter(Boolean) as MediaSegment[];
        
        transcription.mediaSegments = reorderedSegments;
        transcription.updatedAt = new Date();
        newTranscriptions.set(transcriptionId, transcription);
      }

      return {
        ...prevState,
        transcriptions: newTranscriptions
      };
    });
  }, []);

  const getTranscriptionsForMedia = useCallback((mediaId: string): TranscriptionData[] => {
    const mediaMap = state.mediaTranscriptionMap.get(mediaId);
    if (!mediaMap) return [];
    
    return mediaMap.transcriptionIds
      .map(id => state.transcriptions.get(id))
      .filter(Boolean) as TranscriptionData[];
  }, [state]);

  const getActiveTranscription = useCallback((): TranscriptionData | undefined => {
    if (state.activeTranscriptionId) {
      return state.transcriptions.get(state.activeTranscriptionId);
    }
    return undefined;
  }, [state]);

  const getTranscriptionById = useCallback((transcriptionId: string): TranscriptionData | undefined => {
    return state.transcriptions.get(transcriptionId);
  }, [state]);

  const getNextTranscriptionNumber = useCallback((mediaId: string): number => {
    const transcriptions = getTranscriptionsForMedia(mediaId);
    return transcriptions.length + 1;
  }, [getTranscriptionsForMedia]);
  
  // Session management functions
  const saveToSession = useCallback(async (
    transcriptionId: string, 
    blocks: any[], 
    speakers: any[]
  ): Promise<void> => {
    try {
      const transcription = state.transcriptions.get(transcriptionId);
      if (!transcription) return;
      
      const mediaId = transcription.mediaIds[0];
      console.log('💾 Saving session:', {
        mediaId,
        transcriptionNumber: transcription.number,
        blocksCount: blocks.length,
        speakersCount: speakers.length,
        firstBlock: blocks[0]
      });
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/save`,
        {
          mediaId,
          transcriptionNumber: transcription.number,
          blocks,
          speakers,
          projectName: 'Current Project',
          transcriptionTitle: transcription.name,
          mediaFile: initialMediaName
        }
      );
      
      if (response.data.success) {
        console.log('✅ Session saved successfully to:', response.data.path);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [state, initialMediaName]);
  
  const loadFromSession = useCallback(async (
    mediaId: string, 
    transcriptionNumber: number
  ): Promise<any> => {
    try {
      // Check cache first
      const cacheKey = `${mediaId}-${transcriptionNumber}`;
      if (sessionCacheRef.current.has(cacheKey)) {
        return sessionCacheRef.current.get(cacheKey);
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/load/${mediaId}/${transcriptionNumber}`
      );
      
      if (response.data.success) {
        // Cache the result
        sessionCacheRef.current.set(cacheKey, response.data);
        return response.data;
      }
      
      return { blocks: [], speakers: [] };
    } catch (error) {
      console.error('Error loading session:', error);
      return { blocks: [], speakers: [] };
    }
  }, []);
  
  const createBackup = useCallback(async (
    transcriptionId: string,
    blocks: any[],
    speakers: any[]
  ): Promise<void> => {
    try {
      const transcription = state.transcriptions.get(transcriptionId);
      if (!transcription) return;
      
      const mediaId = transcription.mediaIds[0];
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/backup/${mediaId}/${transcription.number}`,
        {
          blocks,
          speakers,
          projectName: 'Current Project',
          transcriptionTitle: transcription.name,
          mediaFile: initialMediaName
        }
      );
      
      if (response.data.success) {
        console.log('Backup created:', response.data.version);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }, [state, initialMediaName]);

  // Track previous media ID to detect changes
  const previousMediaIdRef = useRef<string | undefined>();
  
  // Create default transcription when media loads - moved to the end after all functions are defined
  const isInitializingRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple runs
    if (!initialMediaId || !initialMediaName || isInitializingRef.current) {
      return;
    }
    
    // Detect media change
    const isMediaChange = previousMediaIdRef.current && previousMediaIdRef.current !== initialMediaId;
    
    if (isMediaChange) {
      console.log('🔄 Media changed from', previousMediaIdRef.current, 'to', initialMediaId);
      
      // Note: Auto-save is now handled in page.tsx before media change
      // This ensures save completes before component unmounts
      
      // Force clear ALL transcriptions when media changes
      setState(prevState => {
        console.log('🧹 Clearing all transcriptions. Previous state had:', prevState.transcriptions.size, 'transcriptions');
        
        // Create completely new empty state
        return {
          transcriptions: new Map(),
          mediaTranscriptionMap: new Map(),
          activeTranscriptionId: undefined,
          activeMediaId: initialMediaId
        };
      });
      
      // Clear the initialized set so we can initialize the new media
      initializedMediaRef.current.clear();
      
      // Also clear the session cache to force reload
      sessionCacheRef.current.clear();
      
      // Clear the loaded transcriptions tracker in TextEditor
      if ((window as any).clearLoadedTranscriptions) {
        (window as any).clearLoadedTranscriptions();
      }
    }
    
    // Update previous media ID
    previousMediaIdRef.current = initialMediaId;
    
    // Check if already initialized for this media
    if (initializedMediaRef.current.has(initialMediaId)) {
      return;
    }
    
    // Mark as initializing but don't block the UI
    isInitializingRef.current = true;
    initializedMediaRef.current.add(initialMediaId);
    setIsInitializing(false); // Never block the UI
    console.log('🔄 Starting transcription initialization for media:', initialMediaId);
    
    // Use a small delay to ensure everything is ready
    const timeoutId = setTimeout(async () => {
      try {
        // First, check if there are existing sessions for this media
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/list/${initialMediaId}`
        );
        
        if (response.data.success && response.data.transcriptions && response.data.transcriptions.length > 0) {
          console.log('🔍 Found existing sessions for media:', response.data.transcriptions);
          
          // Show notification about existing work but always create new transcription
          if ((window as any).showExistingWorkNotification) {
            (window as any).showExistingWorkNotification(
              initialMediaName,
              response.data.transcriptions.length
            );
          }
          
          // Always create a new transcription (as requested by user)
          console.log('🆕 Creating new transcription despite existing work (user preference)');
          const existingTranscriptions = response.data.transcriptions;
          const nextNumber = Math.max(...existingTranscriptions.map((t: any) => t.number)) + 1;
          
          const result = createTranscription({
            mediaId: initialMediaId,
            name: `תמלול ${nextNumber}`,
            content: ''
          });
          
          if (result.success) {
            console.log('✅ New transcription created with number:', nextNumber);
            
            // Create initial TXT file for the new transcription
            console.log('📝 Creating initial TXT file for new transcription');
            const initialBlock = {
              id: `block-${Date.now()}-0`,
              speaker: '',
              text: '',
              timestamp: undefined
            };
            
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/save`,
                {
                  mediaId: initialMediaId,
                  transcriptionNumber: nextNumber,
                  blocks: [initialBlock],
                  speakers: [],
                  projectName: 'Current Project',
                  transcriptionTitle: `תמלול ${nextNumber}`,
                  mediaFile: initialMediaName
                }
              );
              console.log('✅ Initial TXT file created for new transcription');
            } catch (error) {
              console.error('❌ Error creating initial TXT file:', error);
            }
          }
        } else {
          // No existing sessions, create default transcription
          console.log('🆕 No existing sessions found, creating default transcription');
          const existingTranscriptions = getTranscriptionsForMedia(initialMediaId);
          
          if (existingTranscriptions.length === 0) {
            const result = createTranscription({
              mediaId: initialMediaId,
              name: 'תמלול ראשי',
              content: ''
            });
            
            if (result.success) {
              console.log('✅ Default transcription created with ID:', result.transcriptionId);
              
              // Immediately create an initial TXT file with empty content
              console.log('📝 Creating initial TXT file for default transcription');
              const initialBlock = {
                id: `block-${Date.now()}-0`,
                speaker: '',
                text: '',
                timestamp: undefined
              };
              
              try {
                await axios.post(
                  `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/save`,
                  {
                    mediaId: initialMediaId,
                    transcriptionNumber: 1,
                    blocks: [initialBlock],
                    speakers: [],
                    projectName: 'Current Project',
                    transcriptionTitle: 'תמלול ראשי',
                    mediaFile: initialMediaName
                  }
                );
                console.log('✅ Initial TXT file created successfully');
              } catch (error) {
                console.error('❌ Error creating initial TXT file:', error);
              }
            } else {
              console.error('❌ Failed to create default transcription:', result.error);
            }
          } else {
            console.log('📦 Found existing transcriptions:', existingTranscriptions.length);
          }
        }
      } catch (error) {
        console.error('Error checking for existing sessions:', error);
        // Fallback: create default transcription
        console.log('🔄 Fallback: Creating default transcription due to error');
        const existingTranscriptions = getTranscriptionsForMedia(initialMediaId);
        
        if (existingTranscriptions.length === 0) {
          const result = createTranscription({
            mediaId: initialMediaId,
            name: 'תמלול ראשי',
            content: ''
          });
          
          if (result.success) {
            console.log('✅ Fallback transcription created with ID:', result.transcriptionId);
            
            // Immediately create an initial TXT file with empty content
            console.log('📝 Creating initial TXT file for fallback transcription');
            const initialBlock = {
              id: `block-${Date.now()}-0`,
              speaker: '',
              text: '',
              timestamp: undefined
            };
            
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}'}/api/transcription/sessions/save`,
                {
                  mediaId: initialMediaId,
                  transcriptionNumber: 1,
                  blocks: [initialBlock],
                  speakers: [],
                  projectName: 'Current Project',
                  transcriptionTitle: 'תמלול ראשי',
                  mediaFile: initialMediaName
                }
              );
              console.log('✅ Initial TXT file created successfully');
            } catch (error) {
              console.error('❌ Error creating initial TXT file:', error);
            }
          } else {
            console.error('❌ Failed to create fallback transcription:', result.error);
          }
        }
      } finally {
        // Always reset initializing flag, even on error
        isInitializingRef.current = false;
        setIsInitializing(false);
        console.log('✅ Transcription initialization complete');
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      isInitializingRef.current = false;
    };
  }, [initialMediaId, initialMediaName, getTranscriptionsForMedia, createTranscription]);

  // Auto-save effect
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      const activeTranscription = getActiveTranscription();
      if (activeTranscription && window.blockManagerRef?.current) {
        const blocks = window.blockManagerRef.current.getBlocks();
        const speakers = window.speakerManagerRef?.current?.getAllSpeakers ? 
        window.speakerManagerRef.current.getAllSpeakers() : [];
        
        // Only save if content changed
        const currentContent = JSON.stringify({ blocks, speakers });
        if (lastSaveRef.current?.transcriptionId !== activeTranscription.id ||
            lastSaveRef.current?.content !== currentContent) {
          saveToSession(activeTranscription.id, blocks, speakers);
          lastSaveRef.current = {
            transcriptionId: activeTranscription.id,
            content: currentContent
          };
        }
      }
    }, 30000); // Save every 30 seconds
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [getActiveTranscription, saveToSession]);
  
  // Expose context to window for modal access
  useEffect(() => {
    (window as any).transcriptionContext = {
      getActiveTranscription,
      saveToSession,
      loadFromSession,
      createBackup
    };
    
    return () => {
      delete (window as any).transcriptionContext;
    };
  }, [getActiveTranscription, saveToSession, loadFromSession, createBackup]);
  
  const value: TranscriptionContextType = {
    state,
    isInitializing,
    createTranscription,
    deleteTranscription,
    updateTranscriptionContent,
    switchTranscription,
    clearTranscription,
    linkMediaToTranscription,
    unlinkMediaFromTranscription,
    splitTranscription,
    reorderMediaSegments,
    getTranscriptionsForMedia,
    getActiveTranscription,
    getTranscriptionById,
    getNextTranscriptionNumber,
    saveToSession,
    loadFromSession,
    createBackup
  };

  return (
    <TranscriptionContext.Provider value={value}>
      {children}
    </TranscriptionContext.Provider>
  );
};