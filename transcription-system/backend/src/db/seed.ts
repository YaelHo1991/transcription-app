import { db, initializeDatabase, testConnection } from './connection';
import { UserModel } from '../models/user.model';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ 
  path: path.resolve(__dirname, '..', '..', '.env.development')
});

// Initial users to seed
const initialUsers = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
    permissions: 'ABCDEF' // Full access
  },
  {
    username: 'user1',
    password: 'pass123',
    email: 'user1@example.com',
    permissions: 'ABD' // CRM clients, jobs + transcription work
  },
  {
    username: 'demo',
    password: 'demo123',
    email: 'demo@example.com',
    permissions: 'D' // Only transcription work
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Cannot seed database - connection failed');
      process.exit(1);
    }

    // Initialize tables
    console.log('📋 Initializing database tables...');
    await initializeDatabase();

    // Check if users already exist
    const existingUsers = await UserModel.getAllUsers();
    if (existingUsers.length > 0) {
      console.log('ℹ️  Database already has users. Skipping seed.');
      // Don't close the pool when called from server.ts
      if (require.main === module) {
        await db.end();
      }
      return;
    }

    // Create users
    console.log('\n👥 Creating initial users...');
    for (const userData of initialUsers) {
      try {
        const user = await UserModel.create(userData);
        console.log(`✅ Created user: ${user.username} (${user.permissions})`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${userData.password}`); // Show password for development
        console.log('');
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  User ${userData.username} already exists`);
        } else {
          console.error(`❌ Failed to create user ${userData.username}:`, error.message);
        }
      }
    }

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📝 Login credentials for testing:');
    console.log('================================');
    initialUsers.forEach(user => {
      console.log(`${user.username}: ${user.password} (${user.permissions})`);
    });
    console.log('================================\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    // Only exit if running directly, not when imported
    if (require.main === module) {
      process.exit(1);
    }
  } finally {
    // Only close the pool if running directly, not when imported
    if (require.main === module) {
      await db.end();
    }
    // Don't close the pool when called from server.ts
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };