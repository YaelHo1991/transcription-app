# MediaPlayer Structure Documentation

## Current Structure (Before Reorganization)
```
MediaPlayer/
├── MediaPlayer.tsx (duplicate - to be removed)
├── MediaPlayerOriginal.tsx (main index - to be renamed)
├── MediaPlayer.css
├── SettingsModal.tsx (root level)
├── SettingsModal.old.tsx (to be removed)
├── ShortcutsTab.tsx
├── PedalTab.tsx
├── AutoDetectTab.tsx
├── AutoDetectEnhanced.tsx
├── AutoDetectRegular.tsx
├── shortcuts-styles.css
├── pedal-styles.css
├── autodetect-styles.css
├── MediaControls.tsx
├── VideoDisplay.tsx
├── VideoCube.tsx
├── WaveformCanvas.tsx
├── KeyboardShortcuts.tsx
├── types.ts
├── components/
│   ├── MarksManager.tsx
│   ├── PlaybackOptions.tsx
│   ├── SettingsModal.tsx (duplicate)
│   └── StatusMessage.tsx
├── types/
│   └── marks.ts
├── utils/
│   ├── ChunkedWaveformProcessor.ts
│   ├── httpsDetection.ts
│   └── waveformStrategy.ts
├── workers/
│   ├── autoDetect.worker.ts
│   ├── autoDetectWorkerCode.ts
│   ├── mediaTimer.worker.ts
│   ├── timerWorkerCode.ts
│   ├── waveform.worker.ts
│   ├── waveformWorkerCode.ts
│   └── workerManager.ts
└── docs/
    ├── MEDIA_PLAYER_MIGRATION.md ✅
    └── WAVEFORM_ARCHITECTURE.md ✅
```

## Final Structure (COMPLETED)
```
MediaPlayer/
├── index.tsx (main component)
├── MediaPlayer.css (includes extracted styles)
├── components/
│   ├── KeyboardShortcuts.tsx
│   ├── MediaControls.tsx
│   ├── VideoDisplay.tsx
│   ├── VideoCube.tsx
│   ├── WaveformCanvas.tsx
│   ├── MarksManager.tsx
│   ├── PlaybackOptions.tsx
│   ├── StatusMessage.tsx
│   └── SettingsModal/
│       ├── ShortcutsTab.tsx
│       ├── PedalTab.tsx
│       ├── AutoDetectTab.tsx
│       ├── AutoDetectEnhanced.tsx
│       └── AutoDetectRegular.tsx
├── styles/
│   ├── shortcuts.css
│   ├── pedal.css
│   └── autodetect.css
├── types/
│   ├── index.ts
│   └── marks.ts
├── utils/
│   ├── ChunkedWaveformProcessor.ts
│   ├── httpsDetection.ts
│   └── waveformStrategy.ts
├── workers/
│   ├── autoDetect.worker.ts
│   ├── autoDetectWorkerCode.ts
│   ├── mediaTimer.worker.ts
│   ├── timerWorkerCode.ts
│   ├── waveform.worker.ts
│   ├── waveformWorkerCode.ts
│   └── workerManager.ts
└── docs/
    ├── MEDIA_PLAYER_MIGRATION.md
    ├── WAVEFORM_ARCHITECTURE.md
    ├── MEDIAPLAYER_STRUCTURE.md
    └── MEDIAPLAYER_REORGANIZATION_PLAN.md
```

## Component Responsibilities

### Core Components
- **index.tsx**: Main MediaPlayer component, orchestrates all sub-components
- **MediaPlayer.css**: Main styles and layout for the media player

### Control Components
- **MediaControls.tsx**: Playback controls (play, pause, speed, volume)
- **VideoDisplay.tsx**: Video rendering component
- **VideoCube.tsx**: 3D video cube visualization
- **WaveformCanvas.tsx**: Audio waveform visualization
- **KeyboardShortcuts.tsx**: Keyboard shortcut handling

### Feature Components
- **MarksManager.tsx**: Manages timestamps and markers
- **PlaybackOptions.tsx**: Additional playback settings
- **StatusMessage.tsx**: Status and error message display

### Settings Modal
- **SettingsModal/index.tsx**: Main settings modal container
- **ShortcutsTab.tsx**: Keyboard shortcuts configuration
- **PedalTab.tsx**: Pedal device configuration
- **AutoDetectTab.tsx**: Auto-detection settings
- **AutoDetectEnhanced.tsx**: Enhanced auto-detection mode
- **AutoDetectRegular.tsx**: Regular auto-detection mode

### Support Files
- **types/**: TypeScript type definitions
- **utils/**: Helper functions and utilities
- **workers/**: Web Workers for background processing
- **styles/**: Component-specific CSS files
- **docs/**: Documentation and architecture notes

## Progress Tracking

### Completed ✅
- [x] Create docs folder
- [x] Move MEDIA_PLAYER_MIGRATION.md to docs
- [x] Move WAVEFORM_ARCHITECTURE.md to docs
- [x] Create documentation files
- [x] Remove duplicate files (MediaPlayer.tsx, SettingsModal.old.tsx)
- [x] Rename MediaPlayerOriginal.tsx to index.tsx
- [x] Update import in page.tsx
- [x] Create folder structure (styles/, components/SettingsModal/)
- [x] Move CSS files to styles folder (shortcuts.css, pedal.css, autodetect.css)
- [x] Update CSS imports in index.tsx
- [x] Organize SettingsModal components (moved tabs to SettingsModal folder)
- [x] Update imports for moved tab components
- [x] Move AutoDetect components to SettingsModal folder
- [x] Update AutoDetectTab imports
- [x] Clean up types (moved types.ts to types/index.ts)
- [x] Fix TypeScript errors in page.tsx
- [x] Create mediaHelpers.ts utility file
- [x] Extract MediaPlayer CSS from page.css to MediaPlayer.css
- [x] Fix shortcuts duplication issue
- [x] Final verification completed

- [x] Move remaining TSX components to components folder

### ✅ REORGANIZATION PHASE 1 COMPLETE!

## Phase 2 Target Structure (Code Extraction)
```
MediaPlayer/
├── index.tsx (main component - target: ~800 lines, current: 1466 lines)
├── MediaPlayer.css (main styles - target: ~500 lines, current: 2428 lines)
├── components/
│   ├── KeyboardShortcuts.tsx
│   ├── MediaControls.tsx
│   ├── VideoDisplay.tsx
│   ├── VideoCube.tsx
│   ├── WaveformCanvas.tsx
│   ├── MarksManager.tsx
│   ├── PlaybackOptions.tsx
│   ├── StatusMessage.tsx
│   └── SettingsModal/
│       ├── ShortcutsTab.tsx
│       ├── PedalTab.tsx
│       ├── AutoDetectTab.tsx
│       ├── AutoDetectEnhanced.tsx
│       └── AutoDetectRegular.tsx
├── styles/
│   ├── shortcuts.css (existing)
│   ├── pedal.css (existing)
│   ├── autodetect.css (existing)
│   ├── controls.css (COMPLETED - control buttons & sliders)
│   ├── layout.css (COMPLETED - container & responsive)
│   ├── modal.css (COMPLETED - settings modal)
│   ├── video.css (NEW - video display)
│   └── waveform.css (NEW - waveform visualization)
├── utils/
│   ├── ChunkedWaveformProcessor.ts (existing)
│   ├── httpsDetection.ts (existing)
│   ├── waveformStrategy.ts (existing)
│   ├── mediaHelpers.ts (existing)
│   ├── mediaControls.ts (COMPLETED - playback functions)
│   ├── volumeControls.ts (COMPLETED - volume functions)
│   ├── speedControls.ts (COMPLETED - speed functions)
│   ├── settingsManager.ts (COMPLETED - settings persistence)
│   └── statusManager.ts (COMPLETED - status display)
├── types/
│   ├── index.ts
│   └── marks.ts
├── workers/
│   ├── autoDetect.worker.ts
│   ├── autoDetectWorkerCode.ts
│   ├── mediaTimer.worker.ts
│   ├── timerWorkerCode.ts
│   ├── waveform.worker.ts
│   ├── waveformWorkerCode.ts
│   └── workerManager.ts
└── docs/
    ├── MEDIA_PLAYER_MIGRATION.md
    ├── WAVEFORM_ARCHITECTURE.md
    ├── MEDIAPLAYER_STRUCTURE.md
    └── MEDIAPLAYER_REORGANIZATION_PLAN.md
```

## Phase 2 Extraction Details

### New Utility Files
- **mediaControls.ts**: Core playback control functions (play, pause, seek)
- **volumeControls.ts**: Volume management and mute toggle
- **speedControls.ts**: Playback speed control and presets
- **settingsManager.ts**: localStorage persistence and settings merge
- **statusManager.ts**: Global status message display

### New Style Files
- **controls.css**: Button styles, progress bar, control layouts
- **layout.css**: Container structure, responsive design
- **modal.css**: Settings modal overlay and content
- **video.css**: Video display and cube styles
- **waveform.css**: Waveform visualization styles

## Phase 2 Success Metrics
- [ ] index.tsx reduced by ~45% (1466 → ~800 lines)
- [ ] MediaPlayer.css reduced by ~80% (2428 → ~500 lines)
- [ ] All utilities properly typed with TypeScript
- [ ] No circular dependencies
- [ ] All functionality preserved
- [ ] Improved code organization
- [ ] Better separation of concerns

## Notes
- ProjectNavigator handles media/project imports (not part of MediaPlayer)
- All media loading and project management stays in page.tsx
- MediaPlayer is purely a player component with its own controls and settings
- Settings modal is created inline in index.tsx (no separate SettingsModal component needed)
- The SettingsModal folder contains only the tab components used by the inline modal
- Phase 2 focuses on extracting reusable code without changing functionality