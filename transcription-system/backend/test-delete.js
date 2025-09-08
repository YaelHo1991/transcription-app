const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test folder path
const testPath = path.join(__dirname, 'test-delete-folder');

async function testDeletion() {
  console.log('=== Testing Folder Deletion Methods ===\n');
  
  // Create test folder with some files
  console.log('1. Creating test folder with files...');
  await fs.mkdir(testPath, { recursive: true });
  await fs.writeFile(path.join(testPath, 'test1.txt'), 'Test content 1');
  await fs.writeFile(path.join(testPath, 'test2.txt'), 'Test content 2');
  
  // Create nested folder
  const nestedPath = path.join(testPath, 'nested');
  await fs.mkdir(nestedPath, { recursive: true });
  await fs.writeFile(path.join(nestedPath, 'nested.txt'), 'Nested content');
  
  console.log('   Test folder created at:', testPath);
  
  // Verify folder exists
  try {
    await fs.access(testPath);
    console.log('   ✓ Folder exists\n');
  } catch {
    console.log('   ✗ Failed to create folder\n');
    return;
  }
  
  // Test Method 1: fs.rm
  console.log('2. Testing fs.rm deletion...');
  try {
    await fs.rm(testPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    console.log('   fs.rm completed');
    
    // Check if deleted
    try {
      await fs.access(testPath);
      console.log('   ✗ fs.rm failed - folder still exists\n');
      
      // Try Method 2: Windows rmdir
      console.log('3. Testing Windows rmdir command...');
      try {
        await execAsync(`rmdir /S /Q "${testPath}"`, { 
          windowsHide: true,
          timeout: 10000 
        });
        console.log('   rmdir completed');
        
        // Check if deleted
        try {
          await fs.access(testPath);
          console.log('   ✗ rmdir failed - folder still exists\n');
          
          // Try Method 3: PowerShell
          console.log('4. Testing PowerShell Remove-Item...');
          try {
            await execAsync(`powershell -Command "Remove-Item -Path '${testPath}' -Recurse -Force -ErrorAction SilentlyContinue"`, {
              windowsHide: true,
              timeout: 10000
            });
            console.log('   PowerShell completed');
            
            // Final check
            try {
              await fs.access(testPath);
              console.log('   ✗ PowerShell failed - folder still exists');
              console.log('\n=== ALL METHODS FAILED ===');
              
              // List contents
              const contents = await fs.readdir(testPath, { withFileTypes: true });
              console.log('Remaining contents:', contents.map(c => c.name).join(', '));
            } catch {
              console.log('   ✓ PowerShell succeeded - folder deleted!');
              console.log('\n=== SUCCESS: PowerShell method worked ===');
            }
          } catch (error) {
            console.log('   PowerShell error:', error.message);
          }
        } catch {
          console.log('   ✓ rmdir succeeded - folder deleted!');
          console.log('\n=== SUCCESS: rmdir method worked ===');
        }
      } catch (error) {
        console.log('   rmdir error:', error.message);
      }
    } catch {
      console.log('   ✓ fs.rm succeeded - folder deleted!');
      console.log('\n=== SUCCESS: fs.rm method worked ===');
    }
  } catch (error) {
    console.log('   fs.rm error:', error.message);
  }
  
  // Final cleanup check
  try {
    await fs.access(testPath);
    console.log('\n⚠️  Test folder still exists, manual cleanup may be needed');
  } catch {
    console.log('\n✅ Test completed successfully - folder was deleted');
  }
}

testDeletion().catch(console.error);