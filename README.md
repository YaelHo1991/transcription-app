# Transcription System

A professional transcription system with CRM integration, built with Next.js and Node.js.

## Features

- 🎙️ Audio/Video transcription with waveform visualization
- 👥 Multi-user support with permission levels
- 📝 Advanced text editor with RTL support
- 🎮 USB pedal support for playback control
- 📊 CRM integration
- 🔒 Secure authentication with JWT
- 📤 Export to Word/HTML formats
- 💾 Auto-save and backup system

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Process Manager**: PM2
- **Deployment**: DigitalOcean

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- FFmpeg (for audio processing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YaelHo1991/transcription-app.git
cd transcription-app
```

2. Install dependencies:
```bash
# Backend
cd transcription-system/backend
npm install

# Frontend
cd ../frontend/main-app
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env` in both backend and frontend directories
- Update with your configuration

4. Run the application:
```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend/main-app directory)
npm run dev
```

## Deployment

See `SIMPLE-INSTRUCTIONS.md` for detailed deployment instructions to DigitalOcean.

## License

Private - All rights reserved