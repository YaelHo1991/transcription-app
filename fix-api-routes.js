const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  'transcription-system/frontend/main-app/src/app/api/dev/test-connection/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/stats/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/users/route.ts',
  'transcription-system/frontend/main-app/src/app/api/dev/users/[id]/route.ts',
  'transcription-system/frontend/main-app/src/app/api/auth/login/route.ts',
  'transcription-system/frontend/main-app/src/app/api/auth/verify/route.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix BACKEND_URL template literals
    content = content.replace(
      /const BACKEND_URL = process\.env\.NEXT_PUBLIC_BACKEND_URL \|\| `\$\{process\.env\.NEXT_PUBLIC_API_BASE_URL \|\| 'http:\/\/localhost:5000'\}';/g,
      "const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';"
    );
    
    // Fix fetch template literals
    content = content.replace(
      /fetch\(`\$\{BACKEND_URL\}([^`]+)`/g,
      "fetch(BACKEND_URL + '$1'"
    );
    
    // Fix auth routes template literals
    content = content.replace(
      /fetch\(`\$\{process\.env\.NEXT_PUBLIC_API_BASE_URL \|\| 'http:\/\/localhost:5000'\}([^`]+)`/g,
      "fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000') + '$1'"
    );
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', file);
  } else {
    console.log('File not found:', file);
  }
});

console.log('All API route files fixed!');