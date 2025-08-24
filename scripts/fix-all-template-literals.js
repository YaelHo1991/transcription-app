const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  console.log(`Fixing ${path.basename(filePath)}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // Find all template literals and convert them
  const regex = /`([^`]*)\$\{([^}]+)\}([^`]*)`/g;
  
  while (regex.test(content)) {
    content = content.replace(regex, function(match, before, expr, after) {
      fixed = true;
      const parts = [];
      
      // Handle before part
      if (before) {
        // Check if before has special characters that need escaping
        if (before.includes("'")) {
          parts.push(`"${before}"`);
        } else {
          parts.push(`'${before}'`);
        }
      }
      
      // Add expression
      parts.push(`(${expr})`);
      
      // Handle after part
      if (after) {
        // Check if after has special characters that need escaping
        if (after.includes("'")) {
          parts.push(`"${after}"`);
        } else {
          parts.push(`'${after}'`);
        }
      }
      
      return parts.filter(p => p).join(' + ');
    });
  }
  
  // Also fix simple backticks without template literals that might be broken
  // Fix patterns like `,${RLM} ` which should be ',' + RLM + ' '
  content = content.replace(/`([^`$]*)`/g, function(match, inner) {
    if (inner.includes('${')) return match; // Skip if it has template literal syntax
    fixed = true;
    // Escape single quotes if present
    if (inner.includes("'")) {
      return `"${inner}"`;
    }
    return `'${inner}'`;
  });
  
  if (fixed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${path.basename(filePath)}`);
  } else {
    console.log(`⏭️  No changes needed in ${path.basename(filePath)}`);
  }
}

// Fix all the problematic files
const files = [
  'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/utils/templateProcessor.ts',
  'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/TextEditor.tsx',
  'transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/components/DocumentExportModal.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log('\n✅ All template literals fixed!');