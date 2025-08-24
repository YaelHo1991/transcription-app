const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const FRONTEND_PATH = path.join(PROJECT_ROOT, 'transcription-system', 'frontend', 'main-app');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups', `template-fix-${Date.now()}`);

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Counter for statistics
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;
let errors = [];

// Function to fix template literals in content
function fixTemplateLiterals(content, filePath) {
  let modified = false;
  let replacements = 0;
  let newContent = content;
  
  // Track all changes for debugging
  const changes = [];
  
  // Pattern 1: ${process.env.VARIABLE || 'default'} with path
  newContent = newContent.replace(
    /`\$\{(process\.env\.[A-Z_]+\s*\|\|\s*'[^']+')}\s*([^`]+)`/g,
    (match, envExpr, suffix) => {
      changes.push({pattern: 'env-with-path', match});
      replacements++;
      modified = true;
      return `(${envExpr}) + '${suffix}'`;
    }
  );
  
  // Pattern 2: Simple ${process.env.VARIABLE || 'default'}
  newContent = newContent.replace(
    /`\$\{(process\.env\.[A-Z_]+\s*\|\|\s*'[^']+')\}`/g,
    (match, envExpr) => {
      changes.push({pattern: 'env-simple', match});
      replacements++;
      modified = true;
      return `(${envExpr})`;
    }
  );
  
  // Pattern 3: ${variable}/path or ${variable}text
  newContent = newContent.replace(
    /`\$\{([^}]+)\}([^`]+)`/g,
    (match, variable, suffix) => {
      // Skip if already processed
      if (match.includes('process.env') && modified) return match;
      
      changes.push({pattern: 'var-with-suffix', match});
      replacements++;
      modified = true;
      
      // Clean up the suffix - escape single quotes
      const cleanSuffix = suffix.replace(/'/g, "\\'");
      
      // Handle complex expressions
      if (variable.includes('||') || variable.includes('&&') || variable.includes('?') || variable.includes('(')) {
        return `(${variable}) + '${cleanSuffix}'`;
      }
      return `${variable} + '${cleanSuffix}'`;
    }
  );
  
  // Pattern 4: Simple ${variable}
  newContent = newContent.replace(
    /`\$\{([^}]+)\}`/g,
    (match, variable) => {
      changes.push({pattern: 'var-simple', match});
      replacements++;
      modified = true;
      
      // Handle complex expressions
      if (variable.includes('||') || variable.includes('&&') || variable.includes('?')) {
        return `(${variable})`;
      }
      return variable;
    }
  );
  
  // Pattern 5: Multiple expressions in one template literal
  // This is for complex cases like `text ${var1} more ${var2} end`
  const complexPattern = /`([^`]*\$\{[^}]+\}[^`]*)+`/g;
  let complexMatches = newContent.match(complexPattern);
  
  if (complexMatches) {
    complexMatches.forEach(match => {
      // Skip if no ${} left (already processed)
      if (!match.includes('${')) return;
      
      changes.push({pattern: 'complex-multi', match});
      
      // Parse the template literal
      let result = '';
      let parts = [];
      let current = '';
      let inExpr = false;
      let depth = 0;
      
      // Remove backticks
      let inner = match.slice(1, -1);
      
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === '$' && inner[i + 1] === '{') {
          // Save any text before expression
          if (current) {
            parts.push(`'${current.replace(/'/g, "\\'")}'`);
            current = '';
          }
          inExpr = true;
          depth = 1;
          i++; // Skip {
        } else if (inExpr) {
          if (inner[i] === '{') depth++;
          else if (inner[i] === '}') {
            depth--;
            if (depth === 0) {
              // Expression complete
              if (current) {
                // Handle complex expressions
                if (current.includes('||') || current.includes('&&') || current.includes('?')) {
                  parts.push(`(${current})`);
                } else {
                  parts.push(current);
                }
                current = '';
              }
              inExpr = false;
              continue;
            }
          }
          current += inner[i];
        } else {
          current += inner[i];
        }
      }
      
      // Add any remaining text
      if (current) {
        if (inExpr) {
          parts.push(current);
        } else {
          parts.push(`'${current.replace(/'/g, "\\'")}'`);
        }
      }
      
      if (parts.length > 0) {
        result = parts.join(' + ');
        newContent = newContent.replace(match, result);
        replacements++;
        modified = true;
      }
    });
  }
  
  // Pattern 6: Clean up any remaining simple backticks without expressions
  newContent = newContent.replace(/`([^`\$]+)`/g, (match, text) => {
    // Only replace if it's a simple string with no $
    if (!text.includes('$')) {
      changes.push({pattern: 'simple-backtick', match});
      replacements++;
      modified = true;
      return `'${text.replace(/'/g, "\\'")}'`;
    }
    return match;
  });
  
  if (modified) {
    totalReplacements += replacements;
  }
  
  return { content: newContent, modified, replacements, changes };
}

// Function to process a single file
function processFile(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const { content: fixedContent, modified, replacements, changes } = fixTemplateLiterals(originalContent, filePath);
    
    if (modified) {
      // Create backup
      const backupPath = path.join(BACKUP_DIR, relativePath);
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(backupPath, originalContent);
      
      // Write fixed content
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✓ Fixed ${replacements} template literals in: ${relativePath}`);
      
      // Log detailed changes for debugging
      if (process.env.DEBUG) {
        changes.forEach(change => {
          console.log(`  - ${change.pattern}: ${change.match.substring(0, 50)}...`);
        });
      }
      
      modifiedFiles++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${relativePath}:`, error.message);
    errors.push({file: relativePath, error: error.message});
  }
  
  totalFiles++;
}

// Main execution
console.log('=====================================');
console.log('Comprehensive Template Literal Fixer');
console.log('=====================================');
console.log('');
console.log(`Project root: ${PROJECT_ROOT}`);
console.log(`Frontend path: ${FRONTEND_PATH}`);
console.log(`Creating backups in: ${BACKUP_DIR}`);
console.log('');

// Check if glob is installed
try {
  require.resolve('glob');
} catch(e) {
  console.error('ERROR: glob package not found!');
  console.log('Please run: npm install glob');
  process.exit(1);
}

// Find all TypeScript and TypeScript React files
const patterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  '*.ts',
  '*.js'
];

console.log('Searching for files...');
const files = [];
patterns.forEach(pattern => {
  const found = glob.sync(pattern, { 
    cwd: FRONTEND_PATH,
    nodir: true,
    absolute: true
  });
  files.push(...found);
});

// Remove duplicates
const uniqueFiles = [...new Set(files)];

console.log(`Found ${uniqueFiles.length} files to process`);
console.log('');
console.log('Processing files...');
console.log('-'.repeat(50));

// Process each file
uniqueFiles.forEach(processFile);

// Summary
console.log('');
console.log('='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`Errors encountered: ${errors.length}`);

if (errors.length > 0) {
  console.log('');
  console.log('ERRORS:');
  errors.forEach(err => {
    console.log(`  - ${err.file}: ${err.error}`);
  });
}

console.log('');
console.log(`Backups saved to: ${BACKUP_DIR}`);

if (modifiedFiles > 0) {
  console.log('');
  console.log('✓ Template literals fixed successfully!');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Test the application locally: npm run dev');
  console.log('2. Run production build: npm run build');
  console.log('3. If everything works, commit the changes');
  console.log('4. Deploy to production');
} else {
  console.log('');
  console.log('No template literals found that need fixing.');
}

console.log('');
console.log('To restore from backup if needed:');
console.log(`  cp -r "${BACKUP_DIR}/*" "${PROJECT_ROOT}/"`);