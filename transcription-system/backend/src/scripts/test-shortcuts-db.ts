import { db, testConnection } from '../db/connection';

async function testShortcutsDatabase() {
  try {
    await testConnection();
    
    console.log('=== SHORTCUTS DATABASE TEST ===\n');
    
    // 1. Test categories
    console.log('📁 Categories:');
    const categories = await db.query(`
      SELECT name, description, display_order 
      FROM shortcut_categories 
      ORDER BY display_order
    `);
    categories.rows.forEach(cat => {
      console.log(`  ${cat.display_order}. ${cat.name}: ${cat.description}`);
    });
    
    // 2. Count shortcuts by category
    console.log('\n📊 Shortcuts by Category:');
    const counts = await db.query(`
      SELECT c.name, COUNT(s.id) as count
      FROM shortcut_categories c
      LEFT JOIN system_shortcuts s ON c.id = s.category_id
      GROUP BY c.name, c.display_order
      ORDER BY c.display_order
    `);
    counts.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.count} shortcuts`);
    });
    
    // 3. Test some Hebrew shortcuts
    console.log('\n🔤 Hebrew Shortcuts Test:');
    const hebrewShortcuts = await db.query(`
      SELECT shortcut, expansion 
      FROM system_shortcuts 
      WHERE shortcut LIKE '%''%' 
      LIMIT 5
    `);
    hebrewShortcuts.rows.forEach(s => {
      console.log(`  "${s.shortcut}" → "${s.expansion}"`);
    });
    
    // 4. Test punctuation shortcuts
    console.log('\n⌨️ Punctuation Shortcuts:');
    const punctuation = await db.query(`
      SELECT s.shortcut, s.expansion, s.description 
      FROM system_shortcuts s
      JOIN shortcut_categories c ON s.category_id = c.id
      WHERE c.name = 'punctuation'
      ORDER BY s.priority DESC, s.shortcut
    `);
    punctuation.rows.forEach(p => {
      console.log(`  ${p.shortcut} → ${p.expansion} (${p.description})`);
    });
    
    // 5. Check user quotas
    console.log('\n👥 User Quotas:');
    const quotas = await db.query(`
      SELECT u.username, q.max_shortcuts, q.used_shortcuts
      FROM user_shortcut_quotas q
      JOIN users u ON q.user_id = u.id
      LIMIT 3
    `);
    quotas.rows.forEach(q => {
      console.log(`  ${q.username}: ${q.used_shortcuts}/${q.max_shortcuts} used`);
    });
    
    // 6. Test indexes
    console.log('\n🔍 Indexes Created:');
    const indexes = await db.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%shortcut%'
      ORDER BY tablename, indexname
    `);
    console.log(`  Total indexes: ${indexes.rows.length}`);
    
    console.log('\n✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

testShortcutsDatabase();