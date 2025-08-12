const { pool } = require('./src/db/connection');
const bcrypt = require('bcryptjs');

async function updatePasswords() {
  try {
    // First check if user exists
    const checkUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['ayelho@gmail.com']
    );
    
    if (checkUser.rows.length > 0) {
      console.log('User found:', checkUser.rows[0].email);
      
      // Update password
      const hashedPassword = bcrypt.hashSync('ayelho123', 10);
      
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, 'ayelho@gmail.com']
      );
      
      console.log('Password updated successfully for ayelho@gmail.com');
    } else {
      console.log('User not found with email ayelho@gmail.com');
    }
    
    // Check for other test users and update their passwords too
    const testUsers = [
      { email: 'working@test.com', password: 'test123' },
      { email: 'demo@example.com', password: 'demo123' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'user1@example.com', password: 'user123' }
    ];
    
    for (const user of testUsers) {
      const exists = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (exists.rows.length > 0) {
        const hashedPwd = bcrypt.hashSync(user.password, 10);
        await pool.query(
          'UPDATE users SET password = $1 WHERE email = $2',
          [hashedPwd, user.email]
        );
        console.log(`Password updated for ${user.email}`);
      }
    }
    
    console.log('All passwords updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePasswords();