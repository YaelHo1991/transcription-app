#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('======================================');
console.log('🔧 FIXING ALL HARDCODED LOCALHOST URLS');
console.log('======================================');
console.log('');

// Define the API base URL helper function to add to files
const apiUrlHelper = `
// Get API base URL from environment or use default
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  }
  // Server-side
  return process.env.API_BASE_URL || 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();
`;

// Files to fix and their specific patterns
const filesToFix = [
  {
    path: 'transcription-system/frontend/main-app/src/config/environment.ts',
    replacements: [
      {
        from: /API_BASE_URL:\s*['"`]https?:\/\/localhost:5000['"`]/g,
        to: "API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/services/uploadService.ts',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/login/page.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000\/api/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/page.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/components/MediaPlayer/index.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/TextEditor.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/utils/templateProcessor.ts',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/components/DocumentExportModal.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  },
  {
    path: 'transcription-system/frontend/main-app/src/app/transcription/transcription/contexts/TranscriptionContext.tsx',
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  }
];

// Process dev-portal and API route files
const apiRouteFiles = [
  'transcription-system/frontend/main-app/src/app/api/dev/users/[id]/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/test-connection/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/clear-sessions/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/stats/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/users/route.ts',
  'transcription-system/frontend/main-app/src/app/api/auth/verify/route.ts',
  'transcription-system/frontend/main-app/src/app/api/auth/login/route.ts',
  'transcription-system/frontend/main-app/src/app/dev-portal/shortcuts-admin/page.tsx',
  'transcription-system/frontend/main-app/src/app/test-shortcuts/page.tsx',
  'transcription-system/frontend/main-app/src/app/dev-portal/page.tsx'
];

apiRouteFiles.forEach(file => {
  filesToFix.push({
    path: file,
    replacements: [
      {
        from: /['"`]https?:\/\/localhost:5000/g,
        to: "`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}"
      }
    ]
  });
});

let totalFixed = 0;
let totalErrors = 0;

// Process each file
filesToFix.forEach(fileConfig => {
  const fullPath = path.join(process.cwd(), fileConfig.path);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Skipping ${fileConfig.path} (file not found)`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Apply all replacements
    fileConfig.replacements.forEach(replacement => {
      const matches = content.match(replacement.from);
      if (matches) {
        content = content.replace(replacement.from, replacement.to);
      }
    });
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${fileConfig.path}`);
      totalFixed++;
    } else {
      console.log(`⏭️  No changes needed in ${fileConfig.path}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileConfig.path}: ${error.message}`);
    totalErrors++;
  }
});

console.log('');
console.log('======================================');
console.log('📊 SUMMARY');
console.log('======================================');
console.log(`Files fixed: ${totalFixed}`);
console.log(`Errors: ${totalErrors}`);
console.log('');

if (totalFixed > 0) {
  console.log('✅ All hardcoded URLs have been replaced with environment variables!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Commit these changes to Git');
  console.log('2. Push to your repository');
  console.log('3. Pull changes on your DigitalOcean droplet');
  console.log('4. Restart the frontend service');
} else {
  console.log('ℹ️  No files needed updating');
}