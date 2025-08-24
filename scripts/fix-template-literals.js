const fs = require('fs');
const path = require('path');

// Fix template literals in TextEditor.tsx
const filePath = path.join(__dirname, '../transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/TextEditor.tsx');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Replace all template literals with string concatenation
const replacements = [
  // Simple replacements
  [/`0-0-\${mediaFileName}`/g, "'0-0-' + mediaFileName"],
  [/`\${selectedTranscriptions\.size} תמלולים נמחקו בהצלחה`/g, "selectedTranscriptions.size + ' תמלולים נמחקו בהצלחה'"],
  [/`\${b\.speaker}: \${selectedPortion}`/g, "b.speaker + ': ' + selectedPortion"],
  [/`\${b\.speaker}: \${b\.text}`/g, "b.speaker + ': ' + b.text"],
  [/`\${selectedBlocks\.length} בלוקים נבחרו`/g, "selectedBlocks.length + ' בלוקים נבחרו'"],
  [/`\${speaker}\${b\.text}`/g, "speaker + b.text"],
  [/`\${updatedCount} בלוקים עודכנו: \${fromSpeaker} → \${toSpeaker}`/g, "updatedCount + ' בלוקים עודכנו: ' + fromSpeaker + ' → ' + toSpeaker"],
  [/`speaker-\${s\.code}`/g, "'speaker-' + s.code"],
  [/`\\\\b\${escapedText}\\\\b`/g, "'\\\\b' + escapedText + '\\\\b'"],
  [/`block-\${result\.blockId}`/g, "'block-' + result.blockId"],
  [/`הוחלפו \${replacedCount} מופעים`/g, "'הוחלפו ' + replacedCount + ' מופעים'"],
  [/`הוחלפו \${swapCount} בלוקים`/g, "'הוחלפו ' + swapCount + ' בלוקים'"],
  [/`block-\${Date\.now\(\)}-\${index}`/g, "'block-' + Date.now() + '-' + index"],
  [/`יובאו \${importedBlocks\.length} בלוקים`/g, "'יובאו ' + importedBlocks.length + ' בלוקים'"],
  [/`mark-item \${activeMark\?.id === mark\.id \? 'active' : ''}`/g, "'mark-item ' + (activeMark?.id === mark.id ? 'active' : '')"],
  [/`\${currentTranscriptionIndex \+ 1} \/ \${transcriptions\.length}`/g, "(currentTranscriptionIndex + 1) + ' / ' + transcriptions.length"],
  // Generic pattern for any remaining template literals
  [/`([^`]*)\${([^}]+)}([^`]*)`/g, function(match, before, expr, after) {
    // Convert to string concatenation
    const parts = [];
    if (before) parts.push(`'${before}'`);
    parts.push(`(${expr})`);
    if (after) parts.push(`'${after}'`);
    return parts.join(' + ');
  }]
];

replacements.forEach(([pattern, replacement]) => {
  if (typeof replacement === 'string') {
    content = content.replace(pattern, replacement);
  } else {
    content = content.replace(pattern, replacement);
  }
});

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed all template literals in TextEditor.tsx');