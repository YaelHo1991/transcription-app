const fs = require('fs');
const path = require('path');

function fixTemplateLiterals(content) {
  // Fix process.env template literals
  content = content.replace(
    /`\$\{process\.env\.([A-Z_]+)\s*\|\|\s*'([^']+)'\}`/g,
    "(process.env.$1 || '$2')"
  );
  
  // Fix BACKEND_URL template literals
  content = content.replace(
    /`\$\{BACKEND_URL\}([^`]+)`/g,
    "BACKEND_URL + '$1'"
  );
  
  // Fix other simple template literals
  content = content.replace(
    /`\$\{([^}]+)\}`/g,
    function(match, p1) {
      // If it contains || for defaults, handle specially
      if (p1.includes('||')) {
        return '(' + p1 + ')';
      }
      return p1;
    }
  );
  
  return content;
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = fixTemplateLiterals(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', filePath);
    return true;
  }
  
  return false;
}

// Fix specific files mentioned in the error
const filesToFix = [
  'transcription-system/frontend/main-app/src/app/api/auth/login/route.ts',
  'transcription-system/frontend/main-app/src/app/api/auth/verify/route.ts',
  'transcription-system/frontend/main-app/src/app/dev-portal/shortcuts-admin/page.tsx',
  'transcription-system/frontend/main-app/src/app/test-shortcuts/page.tsx'
];

let fixedCount = 0;
filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (processFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} files with template literal issues.`);