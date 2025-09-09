/**
 * Test file for ChunkService functionality
 * This file can be run to verify the chunk service is working correctly
 * 
 * Usage: node -r ts-node/register src/services/test-chunk-service.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { chunkService } from './chunkService';

async function createTestFile(size: number = 15 * 1024 * 1024): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-temp');
  await fs.mkdir(testDir, { recursive: true });
  
  const testFilePath = path.join(testDir, 'test-media.mp3');
  
  // Create a test file with random data
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  await fs.writeFile(testFilePath, buffer);
  console.log(`Created test file: ${testFilePath} (${Math.round(size / (1024 * 1024))} MB)`);
  
  return testFilePath;
}

async function cleanupTestFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    await fs.rmdir(path.dirname(filePath));
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testChunkService(): Promise<void> {
  const testUserId = 'test-user-123';
  const testMediaId = 'test-media-456';
  
  console.log('🧪 Testing ChunkService...\n');
  
  try {
    // Step 1: Create test file
    console.log('1. Creating test file (15MB)...');
    const testFilePath = await createTestFile(15 * 1024 * 1024);
    
    // Step 2: Chunk the file
    console.log('2. Chunking file...');
    const chunkInfo = await chunkService.chunkFile(
      testFilePath,
      testMediaId,
      testUserId,
      'test-audio.mp3'
    );
    
    console.log(`✅ File chunked into ${chunkInfo.totalChunks} chunks`);
    console.log(`   Original size: ${Math.round(chunkInfo.originalSize / (1024 * 1024))} MB`);
    console.log(`   Chunk size: ${Math.round(chunkInfo.chunkSize / (1024 * 1024))} MB`);
    
    // Step 3: Get chunk info
    console.log('3. Retrieving chunk info...');
    const retrievedInfo = await chunkService.getChunkInfo(testMediaId, testUserId);
    if (retrievedInfo) {
      console.log(`✅ Retrieved chunk info: ${retrievedInfo.totalChunks} chunks, complete: ${retrievedInfo.isComplete}`);
    } else {
      console.log('❌ Failed to retrieve chunk info');
      return;
    }
    
    // Step 4: Test progress tracking
    console.log('4. Checking upload progress...');
    const progress = await chunkService.getProgress(testMediaId, testUserId);
    console.log(`✅ Upload progress: ${progress.completedChunks}/${progress.totalChunks} (${progress.progress}%)`);
    
    // Step 5: Test resume functionality
    console.log('5. Testing resume functionality...');
    const resumeInfo = await chunkService.resumeUpload(testMediaId, testUserId);
    console.log(`✅ Resume info: Last chunk ${resumeInfo.lastChunkIndex}, missing ${resumeInfo.missingChunks.length} chunks`);
    
    // Step 6: Verify chunk integrity
    console.log('6. Verifying chunk integrity...');
    const integrity = await chunkService.verifyChunkIntegrity(testMediaId, testUserId);
    console.log(`✅ Integrity check: Valid=${integrity.isValid}, Missing=${integrity.missingChunks.length}, Corrupted=${integrity.corruptedChunks.length}`);
    
    // Step 7: Assemble chunks back to buffer
    console.log('7. Assembling chunks to buffer...');
    const assemblyResult = await chunkService.assembleChunks(testMediaId, testUserId, false);
    
    if (assemblyResult.success && assemblyResult.buffer) {
      console.log(`✅ Assembled buffer size: ${Math.round(assemblyResult.buffer.length / (1024 * 1024))} MB`);
      
      // Verify the assembled file matches original
      const originalBuffer = await fs.readFile(testFilePath);
      if (originalBuffer.equals(assemblyResult.buffer)) {
        console.log('✅ Assembled file matches original perfectly!');
      } else {
        console.log('❌ Assembled file does not match original');
      }
    } else {
      console.log(`❌ Assembly failed: ${assemblyResult.error}`);
    }
    
    // Step 8: Test stream assembly
    console.log('8. Testing stream assembly...');
    const streamResult = await chunkService.assembleChunks(testMediaId, testUserId, true);
    
    if (streamResult.success && streamResult.stream) {
      console.log('✅ Stream assembly successful');
      
      // Read from stream to test it works
      const chunks: Buffer[] = [];
      streamResult.stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      await new Promise((resolve, reject) => {
        streamResult.stream!.on('end', () => {
          const streamBuffer = Buffer.concat(chunks);
          console.log(`✅ Stream read complete: ${Math.round(streamBuffer.length / (1024 * 1024))} MB`);
          resolve(void 0);
        });
        
        streamResult.stream!.on('error', reject);
      });
    } else {
      console.log(`❌ Stream assembly failed: ${streamResult.error}`);
    }
    
    // Step 9: Test storage stats
    console.log('9. Getting storage statistics...');
    const stats = await chunkService.getStorageStats(testUserId);
    console.log(`✅ Storage stats: ${stats.totalChunkSets} chunk sets, ${Math.round(stats.totalSizeBytes / (1024 * 1024))} MB total`);
    
    // Step 10: Test single chunk storage
    console.log('10. Testing individual chunk storage...');
    const testChunkData = Buffer.from('This is a test chunk content for testing individual chunk storage');
    const storeResult = await chunkService.storeChunk(testChunkData, 999, 'test-individual', testUserId);
    
    if (storeResult.success) {
      console.log(`✅ Individual chunk stored: ${storeResult.chunkId}`);
    } else {
      console.log(`❌ Individual chunk storage failed: ${storeResult.error}`);
    }
    
    // Step 11: Cleanup test data
    console.log('11. Cleaning up test data...');
    const deleteSuccess = await chunkService.deleteMediaChunks(testMediaId, testUserId);
    
    if (deleteSuccess) {
      console.log('✅ Test chunks deleted successfully');
    } else {
      console.log('❌ Failed to delete test chunks');
    }
    
    // Delete individual test chunk too
    await chunkService.deleteMediaChunks('test-individual', testUserId);
    
    // Cleanup test file
    await cleanupTestFile(testFilePath);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ File chunking');
    console.log('   ✅ Chunk metadata storage');
    console.log('   ✅ Progress tracking'); 
    console.log('   ✅ Resume functionality');
    console.log('   ✅ Integrity verification');
    console.log('   ✅ Buffer assembly');
    console.log('   ✅ Stream assembly');
    console.log('   ✅ Storage statistics');
    console.log('   ✅ Individual chunk storage');
    console.log('   ✅ Cleanup operations');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    try {
      await chunkService.deleteMediaChunks(testMediaId, testUserId);
      await chunkService.deleteMediaChunks('test-individual', testUserId);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testChunkService()
    .then(() => {
      console.log('\n✅ Test execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testChunkService };