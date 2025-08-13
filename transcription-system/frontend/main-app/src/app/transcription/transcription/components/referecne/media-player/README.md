# Media Player Component

## Clean Structure

```
media-player/
├── modular/          # The modular ES6 version (IN PRODUCTION)
│   ├── index.html    # Entry point
│   ├── main.js       # Main coordinator
│   ├── css/          # All styles extracted
│   │   ├── main.css  # Core player styles
│   │   └── app.css   # App-level styles
│   └── modules/      # JavaScript ES6 modules
│       ├── player.js
│       ├── controls.js
│       ├── progress-bar.js
│       ├── sliders.js
│       ├── settings.js
│       ├── shortcuts.js
│       ├── pedal.js
│       ├── auto-detect.js
│       ├── video-cube.js
│       └── utils.js
│
├── monolithic/       # Reference single-file version
│   └── media-player.html
│
└── docs/            # Documentation
    ├── MODULE_STRUCTURE.md
    ├── IMPLEMENTATION_PLAN.md
    └── ...
```

## What to Use

### For Production (index.php)
The modular version is now integrated:
```php
<?php include 'components/media-player/modular/index.html'; ?>
```

### For Quick Fixes
Use the monolithic version in `monolithic/media-player.html` to test changes quickly, then port to modules.

### For New Features
Add new modules in `modular/modules/` and import in `main.js`.

## Key Features
- ✅ Full media player with all controls
- ✅ Settings modal (3 tabs)
- ✅ Keyboard shortcuts
- ✅ Foot pedal support
- ✅ Auto-detect media files
- ✅ Video display in floating cube
- ✅ RTL support
- ✅ Responsive design
- ✅ Clean modular architecture

## Global API
Access the player from anywhere:
```javascript
window.mediaPlayer.play();
window.mediaPlayer.loadMedia(url, filename);
window.mediaPlayer.openSettings();
// etc...
```

## Development
1. Edit modules in `modular/modules/`
2. CSS in `modular/css/`
3. Test changes
4. Commit to git