import { db, testConnection } from '../db/connection';
import { runShortcutsMigration } from '../db/seed-shortcuts';

async function main() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database');
      process.exit(1);
    }
    
    // Run the migration
    await runShortcutsMigration();
    
    // Verify the tables were created
    console.log('\n📊 Verifying tables...');
    
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'shortcut_categories',
        'system_shortcuts',
        'user_shortcuts',
        'user_shortcut_quotas',
        'shortcut_usage_stats'
      )
      ORDER BY table_name;
    `);
    
    console.log('✅ Created tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check sample data
    const sampleShortcuts = await db.query(`
      SELECT s.shortcut, s.expansion, c.name as category
      FROM system_shortcuts s
      JOIN shortcut_categories c ON s.category_id = c.id
      LIMIT 5;
    `);
    
    console.log('\n📝 Sample shortcuts:');
    sampleShortcuts.rows.forEach(row => {
      console.log(`  ${row.shortcut} → ${row.expansion} (${row.category})`);
    });
    
    // Check user quotas
    const userQuotas = await db.query(`
      SELECT COUNT(*) as count FROM user_shortcut_quotas;
    `);
    
    console.log(`\n👥 User quotas initialized: ${userQuotas.rows[0].count} users`);
    
    console.log('\n✅ Shortcuts system setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run the script
main();