const { db } = require('../src/db/connection');
const bcrypt = require('bcryptjs');

async function createLiat() {
  try {
    const hashedPassword = await bcrypt.hash('Liat123!', 10);
    
    // First check if user exists
    const existing = await db.query(
      "SELECT id, email FROM users WHERE email = 'liat@liatbenshai.com'"
    );
    
    if (existing.rows.length > 0) {
      // Update existing user to admin
      const result = await db.query(
        "UPDATE users SET is_admin = true, password = $1, permissions = 'ABCDEF' WHERE email = 'liat@liatbenshai.com' RETURNING id, email, full_name, is_admin",
        [hashedPassword]
      );
      console.log('Updated Liat to admin:', result.rows[0]);
    } else {
      // Create new admin user
      const result = await db.query(
        "INSERT INTO users (username, email, password, full_name, permissions, is_admin, is_active) VALUES ('liat', 'liat@liatbenshai.com', $1, 'ליאת בן שי', 'ABCDEF', true, true) RETURNING id, email, full_name, is_admin",
        [hashedPassword]
      );
      console.log('Created Liat as admin:', result.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createLiat();