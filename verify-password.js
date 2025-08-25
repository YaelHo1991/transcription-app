const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// For DO
const poolDO = new Pool({
  host: 'localhost',
  database: 'transcription_system',
  user: 'transcription_user',
  password: 'transcription_pass',
  port: 5432
});

// For localhost
const poolLocal = new Pool({
  host: 'localhost',
  database: 'transcription_dev',
  user: 'postgres',
  password: 'postgres',
  port: 5432
});

async function verifyAndFixPasswords() {
  console.log('=== CHECKING DIGITAL OCEAN ===');
  try {
    const result = await poolDO.query('SELECT password FROM users WHERE email = $1', ['ayelho@gmail.com']);
    
    if (result.rows.length > 0) {
      const hashedPassword = result.rows[0].password;
      const isValid123456 = await bcrypt.compare('123456', hashedPassword);
      
      console.log('Password hash in DO DB:', hashedPassword.substring(0, 30) + '...');
      console.log('Matches "123456":', isValid123456);
      
      if (!isValid123456) {
        console.log('Updating password on DO to "123456"...');
        const newHash = await bcrypt.hash('123456', 10);
        await poolDO.query('UPDATE users SET password = $1 WHERE email = $2', [newHash, 'ayelho@gmail.com']);
        console.log('DO Password updated!');
      }
    } else {
      console.log('User not found on DO');
    }
  } catch (error) {
    console.error('DO Error:', error.message);
  }
  
  console.log('\n=== CHECKING LOCALHOST ===');
  try {
    const result = await poolLocal.query('SELECT password FROM users WHERE email = $1', ['ayelho@gmail.com']);
    
    if (result.rows.length > 0) {
      const hashedPassword = result.rows[0].password;
      const isValid123456 = await bcrypt.compare('123456', hashedPassword);
      
      console.log('Password hash in Local DB:', hashedPassword.substring(0, 30) + '...');
      console.log('Matches "123456":', isValid123456);
      
      if (!isValid123456) {
        console.log('Updating password on localhost to "123456"...');
        const newHash = await bcrypt.hash('123456', 10);
        await poolLocal.query('UPDATE users SET password = $1 WHERE email = $2', [newHash, 'ayelho@gmail.com']);
        console.log('Localhost Password updated!');
      }
    } else {
      console.log('User not found on localhost');
    }
  } catch (error) {
    console.error('Localhost Error:', error.message);
  }
  
  await poolDO.end();
  await poolLocal.end();
  console.log('\nDone! You should now be able to login with password: 123456');
}

verifyAndFixPasswords();