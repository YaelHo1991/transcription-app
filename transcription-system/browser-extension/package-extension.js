const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Ensure archiver is installed
try {
  require.resolve('archiver');
} catch(e) {
  console.error('archiver module not found. Please run: npm install archiver');
  process.exit(1);
}

const extensionDir = __dirname;
const outputPath = path.join(extensionDir, 'cookie-helper-extension.zip');

// Remove old zip if exists
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

// Create output stream
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for archive events
output.on('close', () => {
  console.log('✅ Extension packaged successfully!');
  console.log(`📦 Output: ${outputPath}`);
  console.log(`📏 Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
});

archive.on('error', (err) => {
  console.error('❌ Error packaging extension:', err);
  process.exit(1);
});

// Pipe archive to output
archive.pipe(output);

// Add files to archive
const filesToInclude = [
  'manifest.json',
  'background/background.js',
  'content/content.js',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

// Add each file
filesToInclude.forEach(file => {
  const filePath = path.join(extensionDir, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
    console.log(`📄 Added: ${file}`);
  } else {
    console.warn(`⚠️  File not found: ${file}`);
  }
});

// Finalize the archive
archive.finalize();