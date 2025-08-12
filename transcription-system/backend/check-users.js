const { db } = require('./src/db/connection');

async function checkUsers() {
  try {
    const result = await db.query('SELECT id, email, full_name, transcriber_code FROM users ORDER BY created_at DESC');
    console.log('Users in database:');
    result.rows.forEach(user => {
      console.log(`Email: ${user.email} | Full Name: ${user.full_name || 'Not set'} | Code: ${user.transcriber_code || 'None'}`);
    });
    
    // Update Yael's full name if it's corrupted
    await db.query(
      "UPDATE users SET full_name = $1 WHERE email = $2",
      ['יעל הורי', 'ayelho@gmail.com']
    );
    console.log('\nUpdated Yael full name to: יעל הורי');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();