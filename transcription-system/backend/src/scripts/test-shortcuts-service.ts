import { shortcutService } from '../services/shortcutService';
import { db } from '../db/connection';

async function testShortcutService() {
  try {
    console.log('Testing shortcut service...\n');
    
    // Test 1: Get system shortcuts
    console.log('1. Getting system shortcuts...');
    const systemShortcuts = await shortcutService.getSystemShortcuts();
    console.log(`   Found ${systemShortcuts.length} system shortcuts`);
    if (systemShortcuts.length > 0) {
      console.log('   Sample:', systemShortcuts[0]);
    }
    
    // Test 2: Get categories
    console.log('\n2. Getting categories...');
    const categories = await shortcutService.getCategories();
    console.log(`   Found ${categories.length} categories`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.description}`);
    });
    
    // Test 3: Check raw database
    console.log('\n3. Checking raw database...');
    const dbResult = await db.query('SELECT COUNT(*) as count FROM system_shortcuts');
    console.log(`   Database has ${dbResult.rows[0].count} system shortcuts`);
    
    const activeResult = await db.query('SELECT COUNT(*) as count FROM system_shortcuts WHERE is_active = true');
    console.log(`   Active shortcuts: ${activeResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

testShortcutService();