const fs = require('fs');
const path = require('path');

// Files with style jsx issues
const styleJsxFiles = [
  'transcription-system/frontend/main-app/src/app/dev-portal/hebrew-template-designer/components/BodySettings.tsx',
  'transcription-system/frontend/main-app/src/app/dev-portal/hebrew-template-designer/components/TemplateTestV2.tsx'
];

// Files with multi-line string issues
const multilineFiles = [
  'transcription-system/frontend/main-app/src/app/dev-portal/hebrew-template-designer/components/HybridTemplateTest.tsx',
  'transcription-system/frontend/main-app/src/app/dev-portal/hebrew-template-designer/utils/simpleHtmlGenerator.ts',
  'transcription-system/frontend/main-app/src/app/transcription/transcription/components/HelperFiles/HelperFiles.tsx'
];

const PROJECT_ROOT = path.join(__dirname, '..');

console.log('Fixing remaining template literal issues...\n');

// Fix style jsx blocks
styleJsxFiles.forEach(file => {
  const filePath = path.join(PROJECT_ROOT, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix style jsx blocks that were incorrectly converted
    content = content.replace(/<style jsx>\{'/g, '<style jsx>{`');
    content = content.replace(/'\}<\/style>/g, '`}</style>');
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed style jsx in: ${path.basename(file)}`);
  }
});

// Fix HybridTemplateTest.tsx
const hybridTestPath = path.join(PROJECT_ROOT, multilineFiles[0]);
if (fs.existsSync(hybridTestPath)) {
  let content = fs.readFileSync(hybridTestPath, 'utf8');
  
  // Fix the pre block with template format
  content = content.replace(
    /<pre dir="ltr">\{'\nקובץ: \{fileName\}\nדוברים: \{speakers\}\nתאריך: \{date\}\nמשך: \{duration\}/g,
    `<pre dir="ltr">{\`קובץ: \{fileName}
דוברים: \{speakers}
תאריך: \{date}
משך: \{duration}`
  );
  
  // Find and fix the closing
  content = content.replace(/'\}<\/pre>/g, '`}</pre>');
  
  fs.writeFileSync(hybridTestPath, content);
  console.log(`✓ Fixed multi-line template in: HybridTemplateTest.tsx`);
}

// Fix simpleHtmlGenerator.ts
const htmlGenPath = path.join(PROJECT_ROOT, multilineFiles[1]);
if (fs.existsSync(htmlGenPath)) {
  let content = fs.readFileSync(htmlGenPath, 'utf8');
  
  // Find the problematic HTML template starting at line 79
  const htmlTemplateStart = content.indexOf("const html = '");
  if (htmlTemplateStart !== -1) {
    // Find where this template ends (look for the closing ';)
    let endIndex = content.indexOf("';\n", htmlTemplateStart);
    if (endIndex === -1) {
      // Try to find it with different line ending
      endIndex = content.indexOf("';", htmlTemplateStart);
    }
    
    if (endIndex !== -1) {
      // Extract the problematic part
      const beforeTemplate = content.substring(0, htmlTemplateStart);
      const afterTemplate = content.substring(endIndex + 2);
      
      // Reconstruct with backticks
      const newContent = beforeTemplate + "const html = `" + 
        content.substring(htmlTemplateStart + 14, endIndex).replace(/'/g, "'") + 
        "`;" + afterTemplate;
      
      fs.writeFileSync(htmlGenPath, newContent);
      console.log(`✓ Fixed HTML template in: simpleHtmlGenerator.ts`);
    }
  }
}

// Fix HelperFiles.tsx transform style
const helperFilesPath = path.join(PROJECT_ROOT, multilineFiles[2]);
if (fs.existsSync(helperFilesPath)) {
  let content = fs.readFileSync(helperFilesPath, 'utf8');
  
  // Fix the multi-line transform style
  content = content.replace(
    /transform: '\s*translate\(' \+ editPanPosition\.x \+ 'px, ' \+ editPanPosition\.y \+ 'px\)\s*scale\(' \+ editZoom \/ 100 \+ '\)\s*rotate\(' \+ selectedEditFile\.rotation \+ 'deg\)\s*'/g,
    "transform: `translate(\${editPanPosition.x}px, \${editPanPosition.y}px) scale(\${editZoom / 100}) rotate(\${selectedEditFile.rotation}deg)`"
  );
  
  fs.writeFileSync(helperFilesPath, content);
  console.log(`✓ Fixed transform style in: HelperFiles.tsx`);
}

console.log('\n✅ All remaining issues fixed!');
console.log('\nNext steps:');
console.log('1. Run: npm run build');
console.log('2. If successful, commit changes');
console.log('3. Deploy to DigitalOcean');