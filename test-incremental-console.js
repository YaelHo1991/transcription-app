// Test Script for Incremental Saves
// Copy and paste this entire script into browser console

console.log('=== INCREMENTAL SAVE TEST SUITE ===');

// Test 1: Check if service is loaded
console.log('\n1. Checking if incremental backup service is loaded...');
if (typeof window.incrementalBackupService === 'undefined') {
  // Try to access it through the global scope
  const testElem = document.querySelector('.text-editor-container');
  if (testElem) {
    console.log('✅ TextEditor is loaded');
    console.log('⚠️ Note: incrementalBackupService might not be exposed to global scope');
    console.log('   Check console for [IncrementalBackup] messages when editing');
  } else {
    console.log('❌ TextEditor not found - make sure you have a project open');
  }
} else {
  console.log('✅ Incremental backup service is accessible');
  
  // Test 2: Check current status
  console.log('\n2. Current tracking status:');
  const metrics = window.incrementalBackupService.getMetrics();
  console.table({
    'Has unsaved changes': window.incrementalBackupService.hasChanges(),
    'Total blocks': metrics.totalBlocks,
    'Modified blocks': metrics.modifiedBlocks,
    'Added blocks': metrics.addedBlocks,
    'Deleted blocks': metrics.deletedBlocks,
    'Change summary': window.incrementalBackupService.getChangeSummary()
  });
}

// Test 3: Check virtual scrolling
console.log('\n3. Checking virtual scrolling...');
const blocks = document.querySelectorAll('.text-block');
const slidingWindow = document.querySelector('.text-editor-content.sliding-window');
if (slidingWindow) {
  console.log('✅ Virtual scrolling is ACTIVE (sliding window mode)');
  console.log(`   Rendering ${blocks.length} blocks in viewport`);
  console.log('   (Should be ~40 blocks max regardless of document size)');
} else if (blocks.length > 0) {
  console.log(`ℹ️ Regular scrolling mode (${blocks.length} blocks)`);
  console.log('   Virtual scrolling activates at 30+ blocks');
} else {
  console.log('❌ No blocks found');
}

// Test 4: Instructions for manual testing
console.log('\n4. MANUAL TEST INSTRUCTIONS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('A. Test Change Tracking:');
console.log('   1. Type text in any block');
console.log('   2. Watch console for: [IncrementalBackup] Block updated');
console.log('   3. Press Enter to create new block');
console.log('   4. Watch for: [IncrementalBackup] Block created');
console.log('');
console.log('B. Test Save Metrics:');
console.log('   1. Make a few changes');
console.log('   2. Press Ctrl+S or wait 1 minute');
console.log('   3. Watch for: [Project] Save metrics');
console.log('   4. Should show "Incremental" for small changes');
console.log('');
console.log('C. Test Hebrew RTL:');
console.log('   1. Type: שלום עולם');
console.log('   2. Should appear right-to-left');
console.log('   3. Works in both regular and virtual scrolling');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test 5: Performance check
console.log('\n5. Performance Check:');
if (blocks.length > 200) {
  console.log('✅ Large document detected - virtual scrolling should be active');
  console.log('   Check smooth scrolling and typing performance');
} else {
  console.log(`ℹ️ Document has ${blocks.length} blocks`);
  console.log('   Import a 600+ block file to test virtual scrolling performance');
}

// Test 6: Save type prediction
console.log('\n6. Next Save Prediction:');
console.log('Your next save will be:');
const willBeFullBackup = () => {
  // This is a guess based on typical triggers
  if (!window.incrementalBackupService) return 'Unknown - service not accessible';
  const metrics = window.incrementalBackupService.getMetrics();
  if (metrics.modifiedBlocks > 100) return 'FULL (>100 changes)';
  if (metrics.totalBlocks === 0) return 'FULL (initial save)';
  if (!metrics.lastFullBackup) return 'FULL (no previous full backup)';
  const hoursSinceLastFull = (Date.now() - metrics.lastFullBackup.getTime()) / 3600000;
  if (hoursSinceLastFull > 1) return 'FULL (>1 hour since last full)';
  return 'INCREMENTAL (only changes)';
};

const prediction = typeof window.incrementalBackupService !== 'undefined' 
  ? willBeFullBackup() 
  : 'Check [Project] Save metrics in console when saving';
  
console.log(`   ${prediction}`);

console.log('\n=== END OF TEST SUITE ===');
console.log('Watch console for [IncrementalBackup] and [Project] messages while editing');