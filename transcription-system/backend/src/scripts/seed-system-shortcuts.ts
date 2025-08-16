import { db } from '../db/connection';

const systemShortcuts = [
  // Legal shortcuts
  { shortcut: "ע'ד", expansion: 'עורך דין', category: 'legal', description: 'עורך דין' },
  { shortcut: "ביהמ'ש", expansion: 'בית המשפט', category: 'legal', description: 'בית המשפט' },
  { shortcut: "כב'", expansion: 'כבוד', category: 'legal', description: 'כבוד השופט' },
  { shortcut: "ת'ז", expansion: 'תעודת זהות', category: 'legal', description: 'תעודת זהות' },
  { shortcut: "חו'ד", expansion: 'חוות דעת', category: 'legal', description: 'חוות דעת' },
  
  // Medical shortcuts
  { shortcut: "ד'ר", expansion: 'דוקטור', category: 'medical', description: 'דוקטור' },
  { shortcut: "פרופ'", expansion: 'פרופסור', category: 'medical', description: 'פרופסור' },
  { shortcut: "ביה'ח", expansion: 'בית החולים', category: 'medical', description: 'בית החולים' },
  { shortcut: "ח'ד", expansion: 'חדר', category: 'medical', description: 'חדר' },
  { shortcut: "מח'", expansion: 'מחלקה', category: 'medical', description: 'מחלקה' },
  
  // Common shortcuts
  { shortcut: "וכו'", expansion: 'וכולי', category: 'common', description: 'וכולי' },
  { shortcut: "בע'מ", expansion: 'בערבון מוגבל', category: 'common', description: 'חברה בע"מ' },
  { shortcut: "ע'י", expansion: 'על ידי', category: 'common', description: 'על ידי' },
  { shortcut: "ע'פ", expansion: 'על פי', category: 'common', description: 'על פי' },
  { shortcut: "ב'ס", expansion: 'בית ספר', category: 'common', description: 'בית ספר' },
  { shortcut: "ב'כ", expansion: 'בא כוח', category: 'common', description: 'בא כוח' },
  
  // Academic shortcuts
  { shortcut: "אונ'", expansion: 'אוניברסיטה', category: 'academic', description: 'אוניברסיטה' },
  { shortcut: "מכ'", expansion: 'מכללה', category: 'academic', description: 'מכללה' },
  { shortcut: "ת'א", expansion: 'תואר אקדמי', category: 'academic', description: 'תואר אקדמי' },
  
  // Business shortcuts
  { shortcut: "מנכ'ל", expansion: 'מנהל כללי', category: 'business', description: 'מנהל כללי' },
  { shortcut: "סמנכ'ל", expansion: 'סגן מנהל כללי', category: 'business', description: 'סגן מנהל כללי' },
  { shortcut: "יו'ר", expansion: 'יושב ראש', category: 'business', description: 'יושב ראש' },
  
  // English words
  { shortcut: 'וואטסאפ', expansion: 'WhatsApp', category: 'english', description: 'WhatsApp application' },
  { shortcut: 'פייסבוק', expansion: 'Facebook', category: 'english', description: 'Facebook social network' },
  { shortcut: 'גוגל', expansion: 'Google', category: 'english', description: 'Google search engine' },
  { shortcut: 'יוטיוב', expansion: 'YouTube', category: 'english', description: 'YouTube video platform' },
  
  // Punctuation
  { shortcut: '--', expansion: '–', category: 'punctuation', description: 'מקף ארוך' },
  { shortcut: '((', expansion: '(', category: 'punctuation', description: 'סוגריים פתיחה' },
  { shortcut: '))', expansion: ')', category: 'punctuation', description: 'סוגריים סגירה' },
  { shortcut: ',,', expansion: '"', category: 'punctuation', description: 'מרכאות' },
  { shortcut: '..', expansion: '?', category: 'punctuation', description: 'סימן שאלה' }
];

const categories = [
  { name: 'legal', description: 'קיצורים משפטיים', display_order: 1 },
  { name: 'medical', description: 'קיצורים רפואיים', display_order: 2 },
  { name: 'common', description: 'ביטויים נפוצים', display_order: 3 },
  { name: 'academic', description: 'קיצורים אקדמיים', display_order: 4 },
  { name: 'business', description: 'קיצורים עסקיים', display_order: 5 },
  { name: 'technical', description: 'קיצורים טכניים', display_order: 6 },
  { name: 'english', description: 'מילים באנגלית', display_order: 7 },
  { name: 'punctuation', description: 'סימני פיסוק', display_order: 8 }
];

async function seedSystemShortcuts() {
  try {
    console.log('🌱 Seeding system shortcuts...');
    
    // First, create categories if they don't exist
    for (const category of categories) {
      await db.query(`
        INSERT INTO shortcut_categories (name, description, display_order, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (name) DO UPDATE
        SET description = EXCLUDED.description,
            display_order = EXCLUDED.display_order
      `, [category.name, category.description, category.display_order]);
    }
    console.log('✅ Categories created/updated');
    
    // Then add shortcuts
    for (const shortcut of systemShortcuts) {
      // Get category ID
      const categoryResult = await db.query(
        'SELECT id FROM shortcut_categories WHERE name = $1',
        [shortcut.category]
      );
      
      if (categoryResult.rows.length === 0) {
        console.warn(`Category ${shortcut.category} not found, skipping ${shortcut.shortcut}`);
        continue;
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      // Insert shortcut (skip if exists)
      await db.query(`
        INSERT INTO system_shortcuts (shortcut, expansion, category_id, description, is_active, language)
        VALUES ($1, $2, $3, $4, true, 'he')
        ON CONFLICT (shortcut, language) DO UPDATE
        SET expansion = EXCLUDED.expansion,
            category_id = EXCLUDED.category_id,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
      `, [shortcut.shortcut, shortcut.expansion, categoryId, shortcut.description]);
    }
    
    console.log(`✅ ${systemShortcuts.length} system shortcuts seeded`);
    
    // Show statistics
    const statsResult = await db.query(`
      SELECT 
        c.name as category,
        COUNT(s.id) as count
      FROM shortcut_categories c
      LEFT JOIN system_shortcuts s ON s.category_id = c.id
      GROUP BY c.name, c.display_order
      ORDER BY c.display_order
    `);
    
    console.log('\n📊 Shortcuts by category:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} shortcuts`);
    });
    
    const totalResult = await db.query('SELECT COUNT(*) as total FROM system_shortcuts');
    console.log(`\n✅ Total system shortcuts: ${totalResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error seeding shortcuts:', error);
  } finally {
    await db.end();
  }
}

// Run the seeder
seedSystemShortcuts();