const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const FRONTEND_PATH = path.join(PROJECT_ROOT, 'transcription-system/frontend/main-app/src');

const fixes = [
  // RemarkItem.tsx - close the template literal
  {
    file: 'app/transcription/transcription/components/Remarks/RemarkItem.tsx',
    find: "  ';\n",
    replace: "  `;\n"
  },
  // shortcuts-admin/page.tsx - fix template literals in fetch URLs
  {
    file: 'app/dev-portal/shortcuts-admin/page.tsx',
    find: "await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/dev/admin/shortcuts/${editingShortcut.id}'",
    replace: "await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/dev/admin/shortcuts/${editingShortcut.id}`"
  },
  {
    file: 'app/dev-portal/shortcuts-admin/page.tsx',
    find: "await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/dev/admin/shortcuts'",
    replace: "await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/dev/admin/shortcuts`"
  },
  // test-shortcuts/page.tsx
  {
    file: 'app/test-shortcuts/page.tsx',
    find: "await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/transcription/shortcuts/public')",
    replace: "await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/transcription/shortcuts/public`)"
  },
  // Fix style jsx blocks
  {
    file: 'app/transcription/export/page.tsx',
    find: "<style jsx>{'",
    replace: "<style jsx>{`"
  },
  {
    file: 'app/transcription/export/page.tsx',
    find: "'}</style>",
    replace: "`}</style>"
  },
  {
    file: 'app/transcription/proofreading/page.tsx',
    find: "<style jsx>{'",
    replace: "<style jsx>{`"
  },
  {
    file: 'app/transcription/proofreading/page.tsx',
    find: "'}</style>",
    replace: "`}</style>"
  },
  {
    file: 'app/crm/projects/page.tsx',
    find: "<style jsx>{'",
    replace: "<style jsx>{`"
  },
  {
    file: 'app/crm/projects/page.tsx',
    find: "'}</style>",
    replace: "`}</style>"
  },
  {
    file: 'app/crm/reports/page.tsx',
    find: "<style jsx>{'",
    replace: "<style jsx>{`"
  },
  {
    file: 'app/crm/reports/page.tsx',
    find: "'}</style>",
    replace: "`}</style>"
  }
];

console.log('Applying final comprehensive fixes...\n');

fixes.forEach(fix => {
  const filePath = path.join(FRONTEND_PATH, fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(fix.find)) {
    content = content.replace(fix.find, fix.replace);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed: ${path.basename(fix.file)}`);
  } else {
    console.log(`⚠️  Pattern not found in: ${path.basename(fix.file)}`);
  }
});

console.log('\n✅ All fixes applied!');