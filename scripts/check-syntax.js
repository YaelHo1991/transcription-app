const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../transcription-system/frontend/main-app/src/app/transcription/transcription/components/TextEditor/utils/templateProcessor.ts');

console.log('Checking file:', filePath);
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Check for unclosed strings
let inSingleQuote = false;
let inDoubleQuote = false;
let inBacktick = false;
let inComment = false;
let inMultilineComment = false;

lines.forEach((line, i) => {
  let escaped = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];
    
    // Handle comments
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === '/' && nextChar === '/') {
        // Rest of line is comment
        break;
      }
      if (char === '/' && nextChar === '*') {
        inMultilineComment = true;
        j++;
        continue;
      }
    }
    
    if (inMultilineComment) {
      if (char === '*' && nextChar === '/') {
        inMultilineComment = false;
        j++;
      }
      continue;
    }
    
    // Handle escape sequences
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // Track quotes
    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    }
    if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    }
    if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }
  }
  
  // Check if quotes are still open at end of line
  if (inSingleQuote || inDoubleQuote) {
    console.log(`Line ${i + 1}: Unclosed quote at end of line`);
    console.log('  ', line);
    inSingleQuote = false;
    inDoubleQuote = false;
  }
});

if (inBacktick) {
  console.log('ERROR: Unclosed backtick in file!');
}

if (inMultilineComment) {
  console.log('ERROR: Unclosed multiline comment in file!');
}

// Check bracket balance
let brackets = { '(': 0, '{': 0, '[': 0 };
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  
  // Handle strings
  if ((char === '"' || char === "'" || char === '`') && (i === 0 || content[i-1] !== '\\')) {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
      stringChar = '';
    }
  }
  
  if (!inString) {
    if (char === '(') brackets['(']++;
    if (char === ')') brackets['(']--;
    if (char === '{') brackets['{']++;
    if (char === '}') brackets['{']--;
    if (char === '[') brackets['[']++;
    if (char === ']') brackets['[']--;
  }
}

console.log('\nBracket balance:');
console.log('Parentheses ():', brackets['('], brackets['('] === 0 ? '✅' : '❌');
console.log('Curly braces {}:', brackets['{'], brackets['{'] === 0 ? '✅' : '❌');
console.log('Square brackets []:', brackets['['], brackets['['] === 0 ? '✅' : '❌');

if (brackets['('] !== 0 || brackets['{'] !== 0 || brackets['['] !== 0) {
  console.log('\n❌ BRACKET MISMATCH DETECTED!');
}