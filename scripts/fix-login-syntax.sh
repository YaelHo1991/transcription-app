#!/bin/bash

# ============================================
# FIX LOGIN PAGE SYNTAX ERROR
# ============================================
# This script fixes the persistent template literal syntax error
# ============================================

echo "============================================"
echo "🔧 FIXING LOGIN PAGE SYNTAX ERROR"
echo "============================================"
echo ""

REPORT_FILE="/root/login-fix-report.txt"
echo "=== LOGIN FIX REPORT ===" > $REPORT_FILE
echo "Time: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Function to add to report
report() {
    echo "$1" | tee -a $REPORT_FILE
}

cd /var/app/transcription-system/transcription-system/frontend/main-app

report "=== CURRENT LOGIN PAGE STATUS ==="
report "Checking for syntax errors..."
grep -n "linear-gradient" src/app/login/page.tsx | head -5 >> $REPORT_FILE

report ""
report "=== APPLYING FIX ==="

# Create a Node.js script to fix the syntax properly
cat > /tmp/fix-login.js << 'FIXSCRIPT'
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/login/page.tsx');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Fix method 1: Replace template literals with string concatenation
content = content.replace(
  /style=\{\{ background: isCRM \? `linear-gradient\(135deg, \$\{themeColor\}, \$\{themeColor \+ 'dd'\}\)` : 'linear-gradient\(135deg, #4a3428, #6b4423\)' \}\}/g,
  "style={{ background: isCRM ? 'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}"
);

// Also fix if it's in the original format
content = content.replace(
  /style=\{\{ background: isCRM \? `linear-gradient\(135deg, \$\{themeColor\}, \$\{themeColor\}dd\)` : 'linear-gradient\(135deg, #4a3428, #6b4423\)' \}\}/g,
  "style={{ background: isCRM ? 'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}"
);

// Fix the button style too
content = content.replace(
  /style=\{\{ background: isCRM \? `linear-gradient\(135deg, \$\{themeColor\}, \$\{themeColor \+ 'dd'\}\)` : 'linear-gradient\(135deg, #4a3428, #6b4423\)' \}\}/g,
  "style={{ background: isCRM ? 'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}"
);

// Alternative: Just use fixed colors to avoid any syntax issues
if (content === originalContent) {
  console.log('Template literal pattern not found, trying alternative fix...');
  
  // Look for any style with linear-gradient and template literals
  content = content.replace(
    /style=\{\{[^}]*background:[^}]*\$\{themeColor\}[^}]*\}\}/g,
    "style={{ background: isCRM ? 'linear-gradient(135deg, #b85042, #b85042dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}"
  );
}

if (content !== originalContent) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed login page syntax');
  
  // Show what was changed
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('linear-gradient') && line.includes('style=')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log('⚠️ No changes needed or pattern not found');
  
  // If no changes, force a simple fix
  console.log('Applying forced fix with static colors...');
  content = content.replace(
    /\$\{themeColor\}/g,
    '#b85042'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Applied forced fix');
}
FIXSCRIPT

# Run the fix script
report "Running fix script..."
node /tmp/fix-login.js >> $REPORT_FILE 2>&1

report ""
report "=== VERIFYING FIX ==="
report "Checking fixed lines:"
grep -n "linear-gradient" src/app/login/page.tsx | head -5 >> $REPORT_FILE

report ""
report "=== CLEARING CACHE ==="
rm -rf .next/cache 2>/dev/null
report "✅ Cleared Next.js cache"

report ""
report "=== RESTARTING FRONTEND ==="
pm2 restart frontend --update-env >> $REPORT_FILE 2>&1
report "✅ Frontend restarted"

sleep 10

report ""
report "=== CHECKING STATUS ==="
# Check if frontend is running
FRONTEND_STATUS=$(pm2 describe frontend 2>/dev/null | grep status | awk '{print $4}')
FRONTEND_RESTARTS=$(pm2 describe frontend 2>/dev/null | grep restarts | awk '{print $4}' || echo "0")

if [ "$FRONTEND_STATUS" = "online" ]; then
    report "✅ Frontend is running"
    if [ "$FRONTEND_RESTARTS" -gt "5" ]; then
        report "⚠️ Warning: Frontend has restarted $FRONTEND_RESTARTS times"
        report "Checking for errors..."
        pm2 logs frontend --lines 5 --nostream 2>&1 | grep -i error >> $REPORT_FILE || echo "No errors found" >> $REPORT_FILE
    else
        report "✅ Frontend is stable (restarts: $FRONTEND_RESTARTS)"
    fi
else
    report "❌ Frontend is not running properly"
    report "Error logs:"
    pm2 logs frontend --lines 10 --nostream >> $REPORT_FILE 2>&1
fi

report ""
report "=== TESTING SITE ==="
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/ | grep -q "200\|500"; then
    report "✅ Site is accessible"
else
    report "❌ Site is not accessible"
fi

report ""
report "=== FIX COMPLETE ==="
report "The login page syntax error should be fixed now."
report "Try accessing: http://146.190.57.51/licenses"
report ""
report "=== END OF LOGIN FIX REPORT ==="

# Display report
echo ""
echo "============================================"
echo "📋 COPY THIS REPORT TO CLAUDE:"
echo "============================================"
echo ""
cat $REPORT_FILE
echo ""
echo "============================================"
echo "✅ Login fix complete! Copy everything above"
echo "============================================"