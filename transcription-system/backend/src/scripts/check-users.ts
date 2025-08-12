import { db } from '../db/connection';

async function checkAndFixUsers() {
  try {
    // First, let's see what we have
    const result = await db.query('SELECT id, email, full_name, transcriber_code, permissions FROM users ORDER BY created_at DESC');
    
    console.log('Current users in database:');
    console.log('=========================');
    result.rows.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`  Full Name: ${user.full_name || 'Not set'}`);
      console.log(`  Transcriber Code: ${user.transcriber_code || 'None'}`);
      console.log(`  Permissions: ${user.permissions || 'None'}`);
      console.log('---');
    });
    
    // Fix Yael's full name
    await db.query(
      "UPDATE users SET full_name = $1 WHERE email = $2",
      ['יעל הורי', 'ayelho@gmail.com']
    );
    console.log('\n✅ Updated ayelho@gmail.com full name to: יעל הורי');
    
    // Ensure all users with D, E, or F permissions have transcriber codes
    const transUsers = await db.query(`
      SELECT u.id, u.email, u.transcriber_code, l.permissions 
      FROM users u 
      JOIN licenses l ON u.id = l.user_id 
      WHERE (l.permissions LIKE '%D%' OR l.permissions LIKE '%E%' OR l.permissions LIKE '%F%')
      AND u.transcriber_code IS NULL
    `);
    
    for (const user of transUsers.rows) {
      const code = 'TRN-' + Math.floor(1000 + Math.random() * 9000);
      await db.query(
        "UPDATE users SET transcriber_code = $1 WHERE id = $2",
        [code, user.id]
      );
      console.log(`✅ Generated transcriber code ${code} for ${user.email}`);
    }
    
    // Show final state
    console.log('\n\nFinal user state:');
    console.log('================');
    const finalResult = await db.query('SELECT email, full_name, transcriber_code, personal_company FROM users ORDER BY created_at DESC');
    finalResult.rows.forEach(user => {
      console.log(`${user.email}: ${user.full_name || 'No name'} | Code: ${user.transcriber_code || 'N/A'} | Company: ${user.personal_company || 'N/A'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixUsers();