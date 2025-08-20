// Test IndexedDB in browser console
// Copy and paste this into the browser console to test IndexedDB

console.log('=== Testing IndexedDB for Transcription System ===');

// First, let's see what databases exist
if ('indexedDB' in window) {
  console.log('✅ IndexedDB is supported');
  
  // Try to open our TranscriptionDB
  const request = indexedDB.open('TranscriptionDB', 1);
  
  request.onerror = function(event) {
    console.error('❌ Failed to open TranscriptionDB:', event);
  };
  
  request.onsuccess = function(event) {
    const db = event.target.result;
    console.log('✅ TranscriptionDB opened successfully');
    console.log('Object stores:', Array.from(db.objectStoreNames));
    
    // Check if our stores exist
    if (db.objectStoreNames.contains('transcriptions')) {
      console.log('✅ transcriptions store exists');
      
      // Try to read data
      const transaction = db.transaction(['transcriptions'], 'readonly');
      const store = transaction.objectStore('transcriptions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const data = getAllRequest.result;
        console.log(`📊 Found ${data.length} transcriptions in IndexedDB`);
        if (data.length > 0) {
          console.log('First transcription:', data[0]);
        }
      };
    } else {
      console.log('⚠️ transcriptions store does not exist - IndexedDB not initialized');
      console.log('This means the service hasn\'t been called yet');
    }
    
    db.close();
  };
  
  request.onupgradeneeded = function(event) {
    console.log('📦 Creating TranscriptionDB schema...');
    const db = event.target.result;
    
    // Create our stores
    if (!db.objectStoreNames.contains('transcriptions')) {
      const transcriptionStore = db.createObjectStore('transcriptions', { 
        keyPath: 'id' 
      });
      transcriptionStore.createIndex('projectId', 'projectId', { unique: false });
      console.log('✅ Created transcriptions store');
    }
    
    if (!db.objectStoreNames.contains('metadata')) {
      const metadataStore = db.createObjectStore('metadata', { 
        keyPath: 'id' 
      });
      metadataStore.createIndex('projectId', 'projectId', { unique: true });
      console.log('✅ Created metadata store');
    }
    
    if (!db.objectStoreNames.contains('backups')) {
      const backupStore = db.createObjectStore('backups', { 
        keyPath: 'id' 
      });
      backupStore.createIndex('projectId', 'projectId', { unique: false });
      console.log('✅ Created backups store');
    }
  };
} else {
  console.error('❌ IndexedDB is not supported in this browser');
}

// Also check what databases exist
if ('databases' in indexedDB) {
  indexedDB.databases().then(databases => {
    console.log('\n📚 All IndexedDB databases on this domain:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (version ${db.version})`);
    });
  });
}

console.log('\n💡 If TranscriptionDB doesn\'t exist:');
console.log('1. Make an edit in the TextEditor');
console.log('2. Save with Ctrl+S');
console.log('3. Check console for [IndexedDB] messages');
console.log('4. Run this test again');