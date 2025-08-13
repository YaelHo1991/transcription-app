# HTML Modularization Plan

## Current State
- CSS: Extracted to `css/all-styles.css` (single file)
- JS: Extracted to `js/all-scripts.js` (single file)
- HTML: Monolithic structure in `index.html`

## Proposed HTML Component Structure

### 1. Main Container Structure
```html
<div id="media-player-wrapper">
    <!-- Header Component -->
    <!-- Controls Component -->
    <!-- Progress Component -->
    <!-- Sliders Component -->
    <!-- Settings Modal Component -->
    <!-- Video Cube Component -->
</div>
```

### 2. Component Breakdown

#### Header Component (`components/header.html`)
- Loading display
- Status indicator
- File info display

#### Controls Component (`components/controls.html`)
- Play/pause button
- Skip forward/backward buttons (2.5s, 5s)

#### Progress Component (`components/progress.html`)
- Progress bar container
- Current time display
- Total time display
- Progress fill indicator

#### Sliders Component (`components/sliders.html`)
- Volume slider group
  - Volume icon
  - Volume slider
  - Volume value display
- Speed slider group
  - Speed icon
  - Speed slider
  - Speed value display

#### Settings Modal Component (`components/settings-modal.html`)
- Modal overlay
- Modal content container
- Tab navigation
- Tab content sections:
  - Player settings
  - Keyboard shortcuts
  - About

#### Video Cube Component (`components/video-cube.html`)
- Floating video container
- Video element
- Drag handle
- Close button

### 3. Implementation Approach

#### Option A: Server-Side Include (PHP)
```php
<?php include 'components/header.html'; ?>
<?php include 'components/controls.html'; ?>
<?php include 'components/progress.html'; ?>
// etc...
```

#### Option B: JavaScript Template Loading
```javascript
async function loadComponent(name) {
    const response = await fetch(`components/${name}.html`);
    return response.text();
}

// Load all components
const components = await Promise.all([
    loadComponent('header'),
    loadComponent('controls'),
    loadComponent('progress'),
    // etc...
]);
```

#### Option C: Build-Time Concatenation
- Keep components separate during development
- Combine them into single HTML during build process

### 4. CSS/JS File Splitting Strategy

Once HTML is modularized, split CSS and JS based on components:

#### CSS Files:
- `css/base.css` - Global styles, variables, fonts
- `css/components/header.css`
- `css/components/controls.css`
- `css/components/progress.css`
- `css/components/sliders.css`
- `css/components/settings-modal.css`
- `css/components/video-cube.css`
- `css/responsive.css` - Media queries

#### JS Files:
- `js/core/init.js` - Initialization
- `js/core/state.js` - State management
- `js/components/player.js` - Audio player functions
- `js/components/controls.js` - Control buttons
- `js/components/progress.js` - Progress bar
- `js/components/sliders.js` - Volume/speed sliders
- `js/components/settings.js` - Settings modal
- `js/components/video-cube.js` - Video cube
- `js/utils/helpers.js` - Utility functions
- `js/main.js` - Entry point

### 5. Recommended Order of Implementation

1. **Phase 1: HTML Templates**
   - Create component HTML files
   - Implement loading mechanism
   - Test with existing CSS/JS

2. **Phase 2: CSS Splitting**
   - Split `all-styles.css` into component files
   - Maintain exact same styles
   - Test each component styling

3. **Phase 3: JS Modularization**
   - Split `all-scripts.js` into modules
   - Implement module loading (ES6 or concatenation)
   - Test all functionality

### 6. Testing Strategy

At each phase:
1. Ensure identical visual appearance
2. Verify all functionality works
3. Check responsive behavior
4. Test in both iframe and direct access
5. Validate no console errors

### 7. Benefits of This Approach

- **Maintainability**: Each component in its own file
- **Reusability**: Components can be used elsewhere
- **Clarity**: Clear separation of concerns
- **Scalability**: Easy to add new components
- **Debugging**: Easier to locate issues

### 8. Next Steps

1. Decide on implementation approach (A, B, or C)
2. Create component directory structure
3. Begin extracting HTML components
4. Test loading mechanism
5. Proceed with CSS/JS splitting