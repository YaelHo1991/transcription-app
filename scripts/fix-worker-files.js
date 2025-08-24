const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const WORKER_DIR = path.join(PROJECT_ROOT, 'transcription-system/frontend/main-app/src/app/transcription/transcription/components/MediaPlayer/workers');

const workerFiles = [
  'autoDetectWorkerCode.ts',
  'timerWorkerCode.ts',
  'waveformWorkerCode.ts'
];

console.log('Fixing worker files...\n');

workerFiles.forEach(filename => {
  const filePath = path.join(WORKER_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already using backticks
  if (content.includes('export const') && content.includes('WorkerCode = `')) {
    console.log(`✓ Already using backticks: ${filename}`);
    
    // Just remove escaped quotes
    content = content.replace(/\\\'/g, "'");
    fs.writeFileSync(filePath, content);
    return;
  }
  
  // Find the export line
  const exportMatch = content.match(/export const (\w+) = '/);
  if (!exportMatch) {
    console.log(`⚠️  Could not find export pattern in: ${filename}`);
    return;
  }
  
  const varName = exportMatch[1];
  
  // Replace opening quote
  content = content.replace(`export const ${varName} = '`, `export const ${varName} = \``);
  
  // Find and replace closing quote
  // It should be at the end of file as ';
  if (content.endsWith("';\n")) {
    content = content.slice(0, -3) + '`;\n';
  } else if (content.endsWith("';")) {
    content = content.slice(0, -2) + '`;';
  }
  
  // Remove all escaped single quotes
  content = content.replace(/\\\'/g, "'");
  
  fs.writeFileSync(filePath, content);
  console.log(`✓ Fixed: ${filename}`);
});

console.log('\n✅ Worker files fixed!');