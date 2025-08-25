-- Seed all system shortcuts
-- First ensure categories exist
INSERT INTO shortcut_categories (name, description, display_order) VALUES
  ('legal', 'קיצורים משפטיים', 1),
  ('medical', 'קיצורים רפואיים', 2),
  ('common', 'ביטויים נפוצים', 3),
  ('academic', 'קיצורים אקדמיים', 4),
  ('business', 'קיצורים עסקיים', 5),
  ('technical', 'קיצורים טכניים', 6),
  ('english', 'מילים באנגלית', 7),
  ('punctuation', 'סימני פיסוק', 8),
  ('custom', 'קיצורים מותאמים אישית', 99)
ON CONFLICT (name) DO NOTHING;

-- Legal shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description) 
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('ביהמ''ש', 'בית המשפט', 'בית המשפט'),
  ('ח''ד', 'חוות דעת', ''),
  ('ח''פ', 'חברה פרטית', 'חברה פרטית'),
  ('כב''', 'כבוד', 'כבוד השופט'),
  ('ע''ד', 'עורך דין', 'עורך דין'),
  ('ע''מ', 'עמותה', 'עמותה'),
  ('עו''ד', 'עורך דין', 'עורך דין'),
  ('עו''ס', 'עובד סוציאלי', 'עובד סוציאלי'),
  ('פס''ד', 'פסק דין', 'פסק דין'),
  ('רו''ח', 'רואה חשבון', 'רואה חשבון'),
  ('ת''ז', 'תעודת זהות', 'תעודת זהות')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'legal'
ON CONFLICT (shortcut) DO NOTHING;

-- Medical shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('ביה''ח', 'בית החולים', 'בית החולים'),
  ('ד''ר', 'דוקטור', 'דוקטור'),
  ('מד''א', 'מגן דוד אדום', 'מגן דוד אדום'),
  ('מח''', 'מחלקה', 'מחלקה'),
  ('פרופ''', 'פרופסור', 'פרופסור'),
  ('ק''ח', 'קופת חולים', 'קופת חולים')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'medical'
ON CONFLICT (shortcut) DO NOTHING;

-- Common shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('אי''ה', 'אם ירצה השם', 'אם ירצה השם'),
  ('ב''כ', 'בא כוח', 'בא כוח'),
  ('ב''ס', 'בית ספר', 'בית ספר'),
  ('בל''נ', 'בלי נדר', 'בלי נדר'),
  ('בס''ד', 'בסיעתא דשמיא', 'בסיעתא דשמיא'),
  ('בע''ה', 'בעזרת השם', 'בעזרת השם'),
  ('בע''מ', 'בערבון מוגבל', 'חברה בע"מ'),
  ('וכו''', 'וכולי', 'וכולי'),
  ('זצ''ל', 'זכר צדיק לברכה', 'זכר צדיק לברכה'),
  ('כנ''ל', 'כנזכר לעיל', 'כנזכר לעיל'),
  ('ע''ה', 'עליו השלום', 'עליו השלום'),
  ('ע''י', 'על ידי', 'על ידי'),
  ('ע''פ', 'על פי', 'על פי'),
  ('שליט''א', 'שיחיה לימים טובים ארוכים', 'שיחיה לימים טובים ארוכים')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'common'
ON CONFLICT (shortcut) DO NOTHING;

-- Academic shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('אונ''', 'אוניברסיטה', 'אוניברסיטה'),
  ('ביה''ס', 'בית ספר', 'בית ספר'),
  ('מכ''', 'מכללה', 'מכללה'),
  ('ת''א', 'תואר אקדמי', 'תואר אקדמי'),
  ('תלמ''', 'תלמיד', 'תלמיד')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'academic'
ON CONFLICT (shortcut) DO NOTHING;

-- Business shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('ח''ן', 'חשבון', 'חשבון'),
  ('יו''ר', 'יושב ראש', 'יושב ראש'),
  ('מנכ''ל', 'מנהל כללי', 'מנהל כללי'),
  ('מס''', 'מספר', 'מספר'),
  ('מע''מ', 'מס ערך מוסף', 'מס ערך מוסף'),
  ('סמנכ''ל', 'סגן מנהל כללי', 'סגן מנהל כללי')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'business'
ON CONFLICT (shortcut) DO NOTHING;

-- Technical shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('ג''ב', 'ג''יגה בייט', 'ג''יגה בייט'),
  ('מ''ב', 'מגה בייט', 'מגה בייט'),
  ('ק''ב', 'קילו בייט', 'קילו בייט')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'technical'
ON CONFLICT (shortcut) DO NOTHING;

-- English words shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('גוגל', 'Google', 'Google search engine'),
  ('וואטסאפ', 'WhatsApp', 'WhatsApp application'),
  ('יוטיוב', 'YouTube', 'YouTube video platform'),
  ('פייסבוק', 'Facebook', 'Facebook social network')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'english'
ON CONFLICT (shortcut) DO NOTHING;

-- Punctuation shortcuts
INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
SELECT shortcut, expansion, c.id, description FROM (VALUES
  ('--', '–', 'מקף ארוך'),
  ('((', '(', 'סוגריים פתיחה'),
  ('))', ')', 'סוגריים סגירה'),
  (',,', '"', 'מרכאות'),
  ('..', '?', 'סימן שאלה'),
  ('...', '…', 'שלוש נקודות'),
  (';;', ':', 'נקודתיים')
) AS t(shortcut, expansion, description)
CROSS JOIN shortcut_categories c WHERE c.name = 'punctuation'
ON CONFLICT (shortcut) DO NOTHING;

-- Show final count
SELECT COUNT(*) as total_shortcuts FROM system_shortcuts;