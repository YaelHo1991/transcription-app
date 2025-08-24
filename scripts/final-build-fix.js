const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const FRONTEND_PATH = path.join(PROJECT_ROOT, 'transcription-system/frontend/main-app/src');

// Files with specific issues
const filesToFix = [
  {
    path: 'app/transcription/transcription/components/Remarks/RemarkItem.tsx',
    issue: 'multi-line CSS string'
  },
  {
    path: 'app/transcription/transcription/components/TextEditor/components/HTMLPreviewModal.tsx',
    issue: 'multi-line HTML string'
  },
  {
    path: 'app/transcription/transcription/components/TextEditor/utils/HtmlDocumentGenerator.ts',
    issue: 'multi-line HTML string'
  },
  {
    path: 'app/crm/employees/page.tsx',
    issue: 'style jsx'
  },
  {
    path: 'app/crm/page.tsx',
    issue: 'style jsx'
  },
  {
    path: 'app/crm/projects/page.tsx',
    issue: 'style jsx'
  },
  {
    path: 'app/crm/reports/page.tsx',
    issue: 'style jsx'
  }
];

console.log('Final build fixes...\n');

filesToFix.forEach(file => {
  const filePath = path.join(FRONTEND_PATH, file.path);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file.path}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  if (file.issue === 'style jsx') {
    // Fix style jsx blocks
    content = content.replace(/<style jsx>\{'/g, '<style jsx>{`');
    content = content.replace(/'\}<\/style>/g, '`}</style>');
    modified = true;
  } else if (file.issue === 'multi-line CSS string') {
    // Fix RemarkItem.tsx
    const cssMatch = content.match(/export const remarkItemStyles = '/);
    if (cssMatch) {
      content = content.replace(/export const remarkItemStyles = '/, 'export const remarkItemStyles = `');
      // Find the end of the string (should be ';)
      const endMatch = content.match(/'\s*;/);
      if (endMatch) {
        content = content.replace(/'\s*;/, '`;');
      }
      modified = true;
    }
  } else if (file.issue === 'multi-line HTML string' && file.path.includes('HTMLPreviewModal')) {
    // Fix HTMLPreviewModal.tsx - look for multi-line return statements with HTML
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("return '") && lines[i+1] && lines[i+1].includes('<div')) {
        // Found the pattern, replace with backticks
        lines[i] = lines[i].replace("return '", 'return `');
        // Find the closing
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes("';")) {
            lines[j] = lines[j].replace("';", '`;');
            break;
          }
        }
        modified = true;
      }
    }
    if (modified) {
      content = lines.join('\n');
    }
  } else if (file.issue === 'multi-line HTML string' && file.path.includes('HtmlDocumentGenerator')) {
    // Fix HtmlDocumentGenerator.ts
    const htmlMatch = content.match(/let html = '/);
    if (htmlMatch) {
      content = content.replace(/let html = '/, 'let html = `');
      // Find the end
      const endMatch = content.match(/'\s*;[\s\S]*?html \+= '/g);
      if (endMatch) {
        // Replace all subsequent concatenations
        content = content.replace(/'\s*;\s*html \+= '/g, '`;\n    html += `');
      }
      // Final closing
      content = content.replace(/'\s*;\s*return html;/, '`;\n    return html;');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${file.issue} in: ${path.basename(file.path)}`);
  } else {
    console.log(`⚠️  No changes needed for: ${path.basename(file.path)}`);
  }
});

console.log('\n✅ Final fixes complete!');