const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript and TSX files
const files = glob.sync('transcription-system/frontend/main-app/src/**/*.{ts,tsx}', {
  cwd: __dirname
});

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix all template literals with process.env
  const regex1 = /`\$\{process\.env\.([A-Z_]+)\s*\|\|\s*'([^']+)'\}([^`]*)`/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, "(process.env.$1 || '$2') + '$3'");
    modified = true;
  }
  
  // Fix template literals with variables
  const regex2 = /`\$\{([^}]+)\}([^`]*)`/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, (match, p1, p2) => {
      // Handle complex expressions
      if (p1.includes('||') || p1.includes('&&') || p1.includes('?')) {
        return '(' + p1 + ') + \'' + p2 + '\'';
      }
      return p1 + ' + \'' + p2 + '\'';
    });
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', file);
    totalFixed++;
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);