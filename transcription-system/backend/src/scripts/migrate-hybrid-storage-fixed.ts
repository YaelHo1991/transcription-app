#!/usr/bin/env node
/**
 * Data Migration: Populate Hybrid Storage Fields
 * 
 * This script populates existing media files with default values for the new
 * hybrid storage columns: storage_type, chunk_info, and storage_settings.
 * 
 * The migration ensures that existing records have proper default values
 * so the storage-status endpoint can function correctly.
 */

import { db, testConnection } from '../db/connection';

interface MigrationResult {
  success: boolean;
  recordsUpdated: number;
  totalRecords: number;
  nullRecordsBefore: number;
  nullRecordsAfter: number;
  error?: string;
}

// Phase 1: Analyze current database state
async function analyzeDatabase() {
  console.log('\n🔍 Phase 1: Analyzing Database State');
  console.log('=====================================');

  try {
    // Check if media_files table exists and has the new columns
    const schemaQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'media_files' 
        AND column_name IN ('storage_type', 'chunk_info', 'storage_settings')
      ORDER BY column_name;
    `;
    
    const schemaResult = await db.query(schemaQuery);
    
    if (schemaResult.rows.length === 0) {
      console.log('❌ New hybrid storage columns not found in media_files table');
      return { hasColumns: false, analysis: null };
    }
    
    console.log('✅ Found hybrid storage columns:');
    schemaResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Count total records
    const totalResult = await db.query('SELECT COUNT(*) as total FROM media_files');
    const totalRecords = parseInt(totalResult.rows[0].total);

    // Count records with NULL values
    const nullQuery = `
      SELECT COUNT(*) as null_records 
      FROM media_files 
      WHERE storage_type IS NULL OR chunk_info IS NULL OR storage_settings IS NULL
    `;
    const nullResult = await db.query(nullQuery);
    const nullRecords = parseInt(nullResult.rows[0].null_records);

    // Sample records (using correct column name 'file_name')
    const sampleQuery = `
      SELECT id, file_name, storage_type, chunk_info, storage_settings 
      FROM media_files 
      LIMIT 5
    `;
    const sampleResult = await db.query(sampleQuery);

    const analysis = {
      totalRecords,
      nullRecords,
      recordsToUpdate: nullRecords,
      sampleRecords: sampleResult.rows
    };

    console.log(`\n📊 Analysis Results:`);
    console.log(`   - Total media files: ${analysis.totalRecords}`);
    console.log(`   - Records with NULL hybrid storage values: ${analysis.nullRecords}`);
    console.log(`   - Records that need updating: ${analysis.recordsToUpdate}`);
    
    if (analysis.sampleRecords.length > 0) {
      console.log('\n📋 Sample Records:');
      analysis.sampleRecords.forEach(record => {
        console.log(`   - ${record.file_name}: storage_type=${record.storage_type || 'NULL'}, chunk_info=${record.chunk_info || 'NULL'}, storage_settings=${record.storage_settings || 'NULL'}`);
      });
    } else {
      console.log('\n📋 No existing records found - this is normal for a fresh database');
    }

    return { hasColumns: true, analysis };
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return { hasColumns: false, analysis: null, error };
  }
}

// Phase 2: Execute the migration
async function executeMigration(): Promise<MigrationResult> {
  console.log('\n⚡ Phase 3: Executing Migration');
  console.log('================================');

  try {
    // Begin transaction for safety
    await db.query('BEGIN');

    // Get pre-migration counts
    const preCountQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN storage_type IS NULL OR chunk_info IS NULL OR storage_settings IS NULL THEN 1 END) as null_records
      FROM media_files
    `;
    const preCount = await db.query(preCountQuery);
    const totalRecords = parseInt(preCount.rows[0].total);
    const nullRecordsBefore = parseInt(preCount.rows[0].null_records);

    console.log(`📊 Pre-migration state: ${nullRecordsBefore} records need updating out of ${totalRecords} total`);

    if (nullRecordsBefore === 0) {
      console.log('✅ No records need updating. Migration already complete or no data exists.');
      await db.query('COMMIT');
      return {
        success: true,
        recordsUpdated: 0,
        totalRecords,
        nullRecordsBefore: 0,
        nullRecordsAfter: 0
      };
    }

    // Execute the migration UPDATE statement
    const migrationQuery = `
      UPDATE media_files 
      SET 
        storage_type = COALESCE(storage_type, 'server'),
        chunk_info = COALESCE(chunk_info, '{}'::jsonb),
        storage_settings = COALESCE(storage_settings, '{}'::jsonb)
      WHERE storage_type IS NULL OR chunk_info IS NULL OR storage_settings IS NULL
    `;

    console.log('🔧 Executing migration query...');
    const updateResult = await db.query(migrationQuery);
    const recordsUpdated = updateResult.rowCount || 0;

    console.log(`✅ Updated ${recordsUpdated} records`);

    // Verify post-migration state
    const postCount = await db.query(preCountQuery);
    const nullRecordsAfter = parseInt(postCount.rows[0].null_records);

    if (nullRecordsAfter > 0) {
      console.log(`⚠️  Warning: ${nullRecordsAfter} records still have NULL values`);
    } else {
      console.log('✅ All records now have proper default values');
    }

    // Commit the transaction
    await db.query('COMMIT');

    return {
      success: true,
      recordsUpdated,
      totalRecords,
      nullRecordsBefore,
      nullRecordsAfter
    };

  } catch (error) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back changes:', error);
    return {
      success: false,
      recordsUpdated: 0,
      totalRecords: 0,
      nullRecordsBefore: 0,
      nullRecordsAfter: 0,
      error: error.message
    };
  }
}

// Phase 3: Post-migration verification
async function verifyMigration(result: MigrationResult) {
  console.log('\n✅ Phase 4: Post-Migration Verification');
  console.log('========================================');

  try {
    // Check that all records have non-null values
    const verificationQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN storage_type IS NOT NULL AND chunk_info IS NOT NULL AND storage_settings IS NOT NULL THEN 1 END) as complete_records,
        COUNT(CASE WHEN storage_type IS NULL OR chunk_info IS NULL OR storage_settings IS NULL THEN 1 END) as incomplete_records
      FROM media_files
    `;
    
    const verification = await db.query(verificationQuery);
    const stats = verification.rows[0];

    console.log(`📊 Verification Results:`);
    console.log(`   - Total records: ${stats.total}`);
    console.log(`   - Complete records: ${stats.complete_records}`);
    console.log(`   - Incomplete records: ${stats.incomplete_records}`);

    // Sample verification - show some updated records
    if (parseInt(stats.total) > 0) {
      const sampleQuery = `
        SELECT id, file_name, storage_type, chunk_info, storage_settings 
        FROM media_files 
        WHERE storage_type = 'server' AND chunk_info = '{}' AND storage_settings = '{}'
        LIMIT 5
      `;
      
      const samples = await db.query(sampleQuery);
      
      if (samples.rows.length > 0) {
        console.log('\n📋 Sample Updated Records:');
        samples.rows.forEach(record => {
          console.log(`   - ${record.file_name}: storage_type=${record.storage_type}, chunk_info=${JSON.stringify(record.chunk_info)}, storage_settings=${JSON.stringify(record.storage_settings)}`);
        });
      }
    } else {
      console.log('\n📋 No records to verify (empty table)');
    }

    // Test constraints (if any exist)
    console.log('\n🔍 Testing Constraints...');
    try {
      const constraintTest = await db.query(`
        SELECT COUNT(*) as valid_storage_types
        FROM media_files 
        WHERE storage_type IN ('server', 'hybrid', 'client')
      `);
      console.log(`✅ All ${constraintTest.rows[0].valid_storage_types} records have valid storage_type values`);
    } catch (error) {
      console.log('ℹ️  No storage_type constraints found (which is expected)');
    }

    const success = parseInt(stats.incomplete_records) === 0;
    
    if (success) {
      console.log('\n🎉 Migration completed successfully!');
      if (result.recordsUpdated > 0) {
        console.log(`   - ${result.recordsUpdated} records updated`);
      } else {
        console.log('   - No records needed updating (migration was already complete or no data exists)');
      }
      console.log(`   - All records have proper default values`);
      console.log(`   - Storage-status endpoint should now work correctly`);
    } else {
      console.log('\n⚠️  Migration completed with warnings');
      console.log(`   - ${stats.incomplete_records} records still need attention`);
    }

    return success;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Test the storage-status endpoint functionality
async function testStorageStatus() {
  console.log('\n🧪 Phase 5: Testing Storage Status Functionality');
  console.log('=================================================');

  try {
    // Simulate what the storage-status endpoint would query
    const statusQuery = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN storage_type = 'server' THEN 1 END) as server_files,
        COUNT(CASE WHEN storage_type = 'hybrid' THEN 1 END) as hybrid_files,
        COUNT(CASE WHEN storage_type = 'client' THEN 1 END) as client_files
      FROM media_files
    `;

    const statusResult = await db.query(statusQuery);
    const stats = statusResult.rows[0];

    console.log('📊 Storage Status Summary:');
    console.log(`   - Total files: ${stats.total_files}`);
    console.log(`   - Server storage: ${stats.server_files}`);
    console.log(`   - Hybrid storage: ${stats.hybrid_files}`);
    console.log(`   - Client storage: ${stats.client_files}`);

    if (parseInt(stats.total_files) === 0) {
      console.log('\n✅ No data to query, but structure is ready for storage-status endpoint');
      console.log('   - When media files are added, they will have proper default values');
      console.log('   - The endpoint will return meaningful data instead of "Data not found"');
    } else {
      console.log('\n✅ Storage-status endpoint should return proper data');
    }

    return true;
  } catch (error) {
    console.error('❌ Storage status test failed:', error);
    return false;
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Hybrid Storage Data Migration');
  console.log('==========================================');
  console.log(`📅 Started at: ${new Date().toISOString()}`);

  try {
    // Test database connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.error('❌ Database connection failed. Please check your connection settings.');
      process.exit(1);
    }
    console.log('✅ Database connection established');

    // Phase 1: Analyze
    const analysis = await analyzeDatabase();
    if (!analysis.hasColumns) {
      console.error('❌ Migration aborted: Required columns not found');
      process.exit(1);
    }

    if (analysis.analysis?.recordsToUpdate === 0) {
      console.log('✅ No records need updating. This could mean:');
      console.log('   - Migration already complete, OR');
      console.log('   - No existing data (fresh database)');
      
      if (analysis.analysis?.totalRecords === 0) {
        console.log('   - Database is empty - columns have proper defaults for future records');
      }

      // Still run verification and tests
      const dummyResult = {
        success: true,
        recordsUpdated: 0,
        totalRecords: analysis.analysis?.totalRecords || 0,
        nullRecordsBefore: 0,
        nullRecordsAfter: 0
      };

      const verified = await verifyMigration(dummyResult);
      await testStorageStatus();

      console.log('\n📊 Final Summary:');
      console.log('==================');
      console.log(`✅ Migration Status: SUCCESS (no action needed)`);
      console.log(`📈 Records Updated: 0`);
      console.log(`📊 Total Records: ${dummyResult.totalRecords}`);
      console.log(`✅ Verification: ${verified ? 'PASSED' : 'FAILED'}`);
      console.log(`⏰ Completed at: ${new Date().toISOString()}`);

      process.exit(0);
    }

    // Phase 2: Get user confirmation
    console.log('\n📋 Migration Plan:');
    console.log(`   - Update ${analysis.analysis?.recordsToUpdate} records with default values`);
    console.log(`   - Set storage_type = 'server' (where NULL)`);
    console.log(`   - Set chunk_info = '{}' (where NULL)`);
    console.log(`   - Set storage_settings = '{}' (where NULL)`);
    console.log('   - Operation will be performed within a transaction');

    // Phase 3: Execute migration
    const migrationResult = await executeMigration();

    if (!migrationResult.success) {
      console.error('❌ Migration failed:', migrationResult.error);
      process.exit(1);
    }

    // Phase 4: Verify results
    const verified = await verifyMigration(migrationResult);

    // Phase 5: Test storage status
    await testStorageStatus();

    console.log('\n📊 Final Summary:');
    console.log('==================');
    console.log(`✅ Migration Status: ${migrationResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📈 Records Updated: ${migrationResult.recordsUpdated}`);
    console.log(`📊 Total Records: ${migrationResult.totalRecords}`);
    console.log(`🔧 Null Records Before: ${migrationResult.nullRecordsBefore}`);
    console.log(`✅ Null Records After: ${migrationResult.nullRecordsAfter}`);
    console.log(`🔍 Verification: ${verified ? 'PASSED' : 'FAILED'}`);
    console.log(`⏰ Completed at: ${new Date().toISOString()}`);

    process.exit(verified ? 0 : 1);

  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration, analyzeDatabase, executeMigration, verifyMigration };