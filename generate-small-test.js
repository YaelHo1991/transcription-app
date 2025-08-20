// Generate a small test file (100 blocks) to test without freezing
const fs = require('fs');

const NUM_BLOCKS = 100; // Small enough to not freeze
const SPEAKERS = ['א', 'ב'];

const blocks = [];
for (let i = 0; i < NUM_BLOCKS; i++) {
  blocks.push({
    speaker: SPEAKERS[i % 2],
    text: `טקסט לדוגמה מספר ${i + 1} - זהו תמלול קצר לבדיקה`,
    timestamp: i * 3
  });
}

const exportData = {
  blocks: blocks,
  speakers: [
    { code: 'א', name: 'דובר ראשון' },
    { code: 'ב', name: 'דובר שני' }
  ],
  metadata: {
    blockCount: NUM_BLOCKS,
    description: "Small test file that won't freeze"
  }
};

fs.writeFileSync('test-small-100-blocks.json', JSON.stringify(exportData, null, 2));
console.log(`✅ Created test-small-100-blocks.json with ${NUM_BLOCKS} blocks`);
console.log('This file is small enough to test without freezing.');