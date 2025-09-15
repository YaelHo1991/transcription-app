# Extension Icons

This directory should contain the following PNG icon files for the browser extension:

## Required Files:
- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon32.png` - 32x32 pixels (Windows taskbar)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Design Guidelines:

### Visual Design:
- **Primary Colors**: Use the transcription system's pink theme (#e91e63)
- **Symbol**: Cookie (🍪) or download arrow with cookie
- **Style**: Modern, flat design with subtle gradients
- **Background**: Transparent or subtle gradient

### Icon Specifications:

#### 16x16 (Toolbar Icon):
- Simple cookie symbol
- High contrast for visibility
- Minimal detail due to small size

#### 32x32 (Taskbar Icon):
- Cookie with small download arrow
- Clear edges and good contrast
- Recognizable at small sizes

#### 48x48 (Management Page):
- Detailed cookie icon with export arrow
- Add subtle shadow/gradient
- Include transcription branding colors

#### 128x128 (Store Icon):
- Full detailed design
- Cookie with download/export symbol
- Text could say "Cookie Export" in Hebrew/English
- Professional gradient background
- Clear branding connection to transcription system

## Quick Creation Options:

### Option 1: Online Icon Generators
1. Use Canva, Figma, or similar tools
2. Create 128x128 design first
3. Export smaller sizes with automatic resizing

### Option 2: AI Generation
1. Use AI image generators (DALL-E, Midjourney, etc.)
2. Prompt: "Simple cookie icon with download arrow, pink gradient, browser extension style, transparent background"
3. Generate at 128x128 and resize

### Option 3: Professional Design
1. Hire a designer for consistent branding
2. Ensure icons match the transcription system's visual identity
3. Create full icon set with hover states

## Current Status:
🔄 **Icons need to be created** - The extension will work without icons but won't look professional

## Installation:
1. Create the four PNG files following the specifications above
2. Place them in this directory with the exact filenames listed
3. The manifest.json file is already configured to use these icons