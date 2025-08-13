# Text Editor Integration Guide

## Overview
The Text Editor component is designed to integrate seamlessly with the media player, providing synchronized transcription capabilities with mark management and real-time playback coordination.

## Architecture

### Component Structure
```
TextEditor/
├── TextEditor.tsx           # Main editor component
├── TextEditor.css          # Styling
├── types.ts               # TypeScript definitions
├── hooks/
│   └── useMediaSync.ts    # Media synchronization hook
└── INTEGRATION.md         # This file
```

## Integration API

### 1. Component Props

```typescript
interface TextEditorProps {
  // Media Control
  currentTime: number;           // Current playback time
  duration: number;              // Total media duration
  isPlaying: boolean;           // Playback state
  onSeek: (time: number) => void; // Seek to specific time
  onPlayPause: () => void;      // Toggle play/pause
  
  // Mark Management
  marks: Mark[];                // All marks from media player
  onMarkCreate: (mark: Partial<Mark>) => void;
  onMarkUpdate: (markId: string, updates: Partial<Mark>) => void;
  onMarkDelete: (markId: string) => void;
  onMarkNavigate: (markId: string) => void;
  
  // Content Management
  content?: string;             // Initial content
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
  
  // Configuration
  config?: EditorConfig;
  shortcuts?: EditorShortcuts;
  
  // Session Management
  sessionId?: string;
  onSessionUpdate?: (session: EditorSession) => void;
}
```

### 2. Media Synchronization

The `useMediaSync` hook provides comprehensive synchronization:

```typescript
const {
  syncState,        // Connection and sync status
  activeMark,       // Currently active mark
  activeSegment,    // Currently active text segment
  syncToTime,       // Jump to specific time
  syncToMark,       // Jump to specific mark
  insertTimestamp,  // Insert timestamp at cursor
  createMarkAtCursor // Create mark at current position
} = useMediaSync({
  currentTime,
  duration,
  isPlaying,
  marks,
  onSeek
});
```

### 3. Integration Points

#### From Media Player to Editor
- **Time Updates**: Editor highlights active segments based on `currentTime`
- **Mark Changes**: Editor updates mark sidebar when marks are added/modified
- **Playback State**: Editor shows playing/paused indicator
- **Navigation**: Editor scrolls to active content during playback

#### From Editor to Media Player
- **Timestamp Clicks**: Clicking timestamps seeks media to that time
- **Mark Creation**: Creating marks in editor adds them to media timeline
- **Segment Selection**: Selecting text segments can create range marks
- **Keyboard Shortcuts**: Editor shortcuts can control playback

## Usage Example

```tsx
import { TextEditor } from './components/TextEditor/TextEditor';
import { WaveformCanvas } from './components/WaveformCanvas';
import { useState, useRef } from 'react';

function TranscriptionPage() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [content, setContent] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  const handleMarkCreate = (mark: Partial<Mark>) => {
    const newMark: Mark = {
      id: generateId(),
      time: mark.time || currentTime,
      type: mark.type || 'custom',
      label: mark.label,
      customName: mark.customName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...mark
    };
    setMarks([...marks, newMark]);
  };
  
  return (
    <div className="transcription-container">
      <WaveformCanvas
        audioRef={audioRef}
        marks={marks}
        onMarkCreate={handleMarkCreate}
        // ... other props
      />
      
      <TextEditor
        currentTime={currentTime}
        duration={audioRef.current?.duration || 0}
        isPlaying={isPlaying}
        marks={marks}
        content={content}
        onChange={setContent}
        onSeek={handleSeek}
        onMarkCreate={handleMarkCreate}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        // ... other props
      />
    </div>
  );
}
```

## Synchronization Features

### 1. Auto-Scroll
Automatically scrolls editor to keep active content visible during playback.

```typescript
// Enable/disable auto-scroll
editor.setAutoScroll(true);
```

### 2. Timestamp Insertion
Insert formatted timestamps at cursor position:

```typescript
// Inserts [MM:SS.MS] at cursor
editor.insertTimestamp();
```

### 3. Mark Highlighting
Highlights text segments associated with marks:

```typescript
// Marks appear in sidebar and inline
editor.highlightMark(markId);
```

### 4. Segment Timing
Assign time ranges to text segments:

```typescript
// Create timed segment
editor.createTimedSegment({
  startTime: 10.5,
  endTime: 15.3,
  text: "Segment content"
});
```

## Keyboard Shortcuts

Default shortcuts (customizable via `shortcuts` prop):

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Space` | Play/Pause | Toggle media playback |
| `Ctrl+T` | Insert Timestamp | Insert current time |
| `Ctrl+M` | Create Mark | Create mark at cursor |
| `Ctrl+S` | Save | Save content |
| `Ctrl+/` | Toggle Sync | Enable/disable synchronization |
| `Alt+←` | Previous Mark | Navigate to previous mark |
| `Alt+→` | Next Mark | Navigate to next mark |
| `Ctrl+Shift+T` | Insert Range | Create time range from selection |

## Data Flow

```
Media Player                    Text Editor
    │                               │
    ├──currentTime──────────────────>
    │                               │
    ├──marks────────────────────────>
    │                               │
    <──────────onSeek───────────────┤
    │                               │
    <──────────onMarkCreate─────────┤
    │                               │
    <──────────onMarkUpdate─────────┤
    │                               │
    └───────────────────────────────┘
```

## State Management

### Local State
- Cursor position
- Selection range
- Undo/redo history
- Formatting state

### Shared State
- Current playback time
- Marks and annotations
- Content (if managed externally)
- Session data

## Performance Considerations

1. **Debounced Updates**: Time updates are debounced to prevent excessive re-renders
2. **Virtual Scrolling**: Large documents use virtualization for performance
3. **Lazy Mark Loading**: Marks are loaded on-demand for large datasets
4. **Optimistic Updates**: UI updates immediately, syncs in background

## Testing Integration

```typescript
// Test synchronization
describe('TextEditor Integration', () => {
  it('should sync to media time', () => {
    const { getByTestId } = render(
      <TextEditor 
        currentTime={10.5}
        duration={60}
        // ...
      />
    );
    
    expect(getByTestId('time-display')).toHaveTextContent('00:10.50');
  });
  
  it('should create mark on shortcut', () => {
    const onMarkCreate = jest.fn();
    const { container } = render(
      <TextEditor 
        onMarkCreate={onMarkCreate}
        // ...
      />
    );
    
    fireEvent.keyDown(container, { 
      key: 'm', 
      ctrlKey: true 
    });
    
    expect(onMarkCreate).toHaveBeenCalled();
  });
});
```

## Migration from Legacy Editor

### Key Differences
1. **React-based**: Modern React architecture vs jQuery
2. **TypeScript**: Full type safety
3. **Hook-based**: Uses React hooks for state management
4. **Integrated Marks**: Direct mark management integration
5. **Real-time Sync**: Automatic synchronization with media

### Migration Steps
1. Export existing content and marks
2. Initialize new TextEditor component
3. Import content and marks
4. Configure shortcuts and preferences
5. Test synchronization features

## Troubleshooting

### Common Issues

1. **Sync Lag**: Increase `highlightDelay` in `useMediaSync`
2. **Performance**: Enable virtual scrolling for large documents
3. **Mark Conflicts**: Check mark IDs are unique
4. **Shortcuts Not Working**: Verify no conflicts with browser shortcuts

### Debug Mode

Enable debug logging:

```typescript
<TextEditor
  config={{
    debug: true,
    logLevel: 'verbose'
  }}
/>
```

## Future Enhancements

- [ ] Collaborative editing
- [ ] AI-powered transcription assistance
- [ ] Voice command integration
- [ ] Multi-language support
- [ ] Custom mark types
- [ ] Export to various formats (SRT, VTT, etc.)
- [ ] Waveform preview in editor
- [ ] Speaker diarization