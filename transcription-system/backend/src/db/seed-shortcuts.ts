import { db } from './connection';

interface SystemShortcut {
  category: string;
  shortcut: string;
  expansion: string;
  description?: string;
  priority?: number;
}

const systemShortcuts: SystemShortcut[] = [
  // Punctuation shortcuts - avoid shift key
  { category: 'punctuation', shortcut: '..', expansion: '?', description: 'סימן שאלה', priority: 10 },
  { category: 'punctuation', shortcut: ',,', expansion: '"', description: 'מרכאות', priority: 10 },
  { category: 'punctuation', shortcut: ';;', expansion: ':', description: 'נקודתיים', priority: 10 },
  { category: 'punctuation', shortcut: '...', expansion: '…', description: 'שלוש נקודות', priority: 10 },
  { category: 'punctuation', shortcut: '--', expansion: '–', description: 'מקף ארוך', priority: 10 },
  { category: 'punctuation', shortcut: '((', expansion: '(', description: 'סוגריים פתיחה', priority: 10 },
  { category: 'punctuation', shortcut: '))', expansion: ')', description: 'סוגריים סגירה', priority: 10 },
  
  // Legal terms
  { category: 'legal', shortcut: "ע'ד", expansion: 'עורך דין', description: 'עורך דין' },
  { category: 'legal', shortcut: "עו'ד", expansion: 'עורך דין', description: 'עורך דין' },
  { category: 'legal', shortcut: "רו'ח", expansion: 'רואה חשבון', description: 'רואה חשבון' },
  { category: 'legal', shortcut: "ביהמ'ש", expansion: 'בית המשפט', description: 'בית המשפט' },
  { category: 'legal', shortcut: "כב'", expansion: 'כבוד', description: 'כבוד' },
  { category: 'legal', shortcut: "עו'ס", expansion: 'עובד סוציאלי', description: 'עובד סוציאלי' },
  { category: 'legal', shortcut: "פס'ד", expansion: 'פסק דין', description: 'פסק דין' },
  { category: 'legal', shortcut: "ת'ז", expansion: 'תעודת זהות', description: 'תעודת זהות' },
  { category: 'legal', shortcut: "ח'פ", expansion: 'חברה פרטית', description: 'חברה פרטית' },
  { category: 'legal', shortcut: "ע'מ", expansion: 'עמותה', description: 'עמותה' },
  
  // Medical terms
  { category: 'medical', shortcut: "ד'ר", expansion: 'דוקטור', description: 'דוקטור' },
  { category: 'medical', shortcut: "פרופ'", expansion: 'פרופסור', description: 'פרופסור' },
  { category: 'medical', shortcut: "ביה'ח", expansion: 'בית חולים', description: 'בית חולים' },
  { category: 'medical', shortcut: "מד'א", expansion: 'מגן דוד אדום', description: 'מגן דוד אדום' },
  { category: 'medical', shortcut: "ק'ח", expansion: 'קופת חולים', description: 'קופת חולים' },
  
  // Common phrases
  { category: 'common', shortcut: "וכו'", expansion: 'וכולי', description: 'וכולי' },
  { category: 'common', shortcut: "כנ'ל", expansion: 'כנזכר לעיל', description: 'כנזכר לעיל' },
  { category: 'common', shortcut: "בס'ד", expansion: 'בסיעתא דשמיא', description: 'בסיעתא דשמיא' },
  { category: 'common', shortcut: "בע'ה", expansion: 'בעזרת השם', description: 'בעזרת השם' },
  { category: 'common', shortcut: "ע'ה", expansion: 'עליו השלום', description: 'עליו השלום' },
  { category: 'common', shortcut: "זצ'ל", expansion: 'זכר צדיק לברכה', description: 'זכר צדיק לברכה' },
  { category: 'common', shortcut: "שליט'א", expansion: 'שיחיה לימים טובים ארוכים', description: 'שיחיה לימים טובים ארוכים' },
  { category: 'common', shortcut: "אי'ה", expansion: 'אם ירצה השם', description: 'אם ירצה השם' },
  { category: 'common', shortcut: "בל'נ", expansion: 'בלי נדר', description: 'בלי נדר' },
  
  // Business terms
  { category: 'business', shortcut: "מנכ'ל", expansion: 'מנהל כללי', description: 'מנהל כללי' },
  { category: 'business', shortcut: "סמנכ'ל", expansion: 'סגן מנהל כללי', description: 'סגן מנהל כללי' },
  { category: 'business', shortcut: "יו'ר", expansion: 'יושב ראש', description: 'יושב ראש' },
  { category: 'business', shortcut: "בע'מ", expansion: 'בערבון מוגבל', description: 'בערבון מוגבל' },
  { category: 'business', shortcut: "מע'מ", expansion: 'מס ערך מוסף', description: 'מס ערך מוסף' },
  { category: 'business', shortcut: "ח'ן", expansion: 'חשבון', description: 'חשבון' },
  { category: 'business', shortcut: "מס'", expansion: 'מספר', description: 'מספר' },
  
  // Academic terms
  { category: 'academic', shortcut: "אונ'", expansion: 'אוניברסיטה', description: 'אוניברסיטה' },
  { category: 'academic', shortcut: "מכ'", expansion: 'מכללה', description: 'מכללה' },
  { category: 'academic', shortcut: "ביה'ס", expansion: 'בית ספר', description: 'בית ספר' },
  { category: 'academic', shortcut: "תלמ'", expansion: 'תלמיד', description: 'תלמיד' },
  
  // Technical terms
  { category: 'technical', shortcut: "מ'ב", expansion: 'מגה בייט', description: 'מגה בייט' },
  { category: 'technical', shortcut: "ג'ב", expansion: "ג'יגה בייט", description: "ג'יגה בייט" },
  { category: 'technical', shortcut: "ק'ב", expansion: 'קילו בייט', description: 'קילו בייט' },
];

export async function seedShortcuts() {
  try {
    // console.log removed for production
    
    // Get category IDs
    const categories = await db.query('SELECT id, name FROM shortcut_categories');
    const categoryMap = new Map(categories.rows.map(row => [row.name, row.id]));
    
    // Insert system shortcuts
    for (const shortcut of systemShortcuts) {
      const categoryId = categoryMap.get(shortcut.category);
      if (!categoryId) {
        console.warn(`Category not found: ${shortcut.category}`);
        continue;
      }
      
      await db.query(`
        INSERT INTO system_shortcuts (
          category_id, shortcut, expansion, description, priority, language
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (shortcut, language) 
        DO UPDATE SET 
          expansion = EXCLUDED.expansion,
          description = EXCLUDED.description,
          priority = EXCLUDED.priority,
          updated_at = NOW()
      `, [
        categoryId,
        shortcut.shortcut,
        shortcut.expansion,
        shortcut.description || null,
        shortcut.priority || 0,
        'he'
      ]);
    }
    
    // console.log removed for production
    
    // Initialize quotas for existing users
    await db.query(`
      INSERT INTO user_shortcut_quotas (user_id, max_shortcuts, used_shortcuts)
      SELECT id, 100, 0
      FROM users
      ON CONFLICT (user_id) DO NOTHING
    `);
    
    // console.log removed for production
    
  } catch (error) {
    console.error('❌ Error seeding shortcuts:', error);
    throw error;
  }
}

// Function to run the migration
export async function runShortcutsMigration() {
  try {
    // console.log removed for production
    
    // Read and execute the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '..', '..', 'migrations', '007_create_shortcuts_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await db.query(migrationSQL);
    // console.log removed for production
    
    // Seed initial data
    await seedShortcuts();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in server initialization
export default {
  seedShortcuts,
  runShortcutsMigration
};