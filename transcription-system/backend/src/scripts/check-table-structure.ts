#!/usr/bin/env ts-node
import { db } from '../db/connection';

async function checkTableStructure() {
  try {
    console.log('🔍 Checking user_storage_quotas table structure...');
    
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_storage_quotas'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    console.log('\n📈 Sample data:');
    const sampleData = await db.query('SELECT * FROM user_storage_quotas LIMIT 3');
    console.log('Sample records:', sampleData.rows);
    
  } catch (error) {
    console.error('❌ Error checking table:', error);
  } finally {
    await db.end();
  }
}

checkTableStructure();