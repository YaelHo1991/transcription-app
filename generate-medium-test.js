// Generate a medium test file (600 blocks) to trigger virtualization
const fs = require('fs');

const NUM_BLOCKS = 600; // Just above the 500 threshold
const SPEAKERS = ['א', 'ב', 'ג'];

const blocks = [];
for (let i = 0; i < NUM_BLOCKS; i++) {
  blocks.push({
    speaker: SPEAKERS[i % 3],
    text: `משפט ${i + 1}: זהו תמלול בינוני לבדיקת המערכת. הטקסט מכיל מספיק בלוקים כדי להפעיל את מצב הגלילה הוירטואלית`,
    timestamp: i * 3
  });
}

const exportData = {
  blocks: blocks,
  speakers: [
    { code: 'א', name: 'דובר ראשון' },
    { code: 'ב', name: 'דובר שני' },
    { code: 'ג', name: 'דובר שלישי' }
  ],
  metadata: {
    blockCount: NUM_BLOCKS,
    description: "Medium test file to trigger virtualization"
  }
};

fs.writeFileSync('test-medium-600-blocks.json', JSON.stringify(exportData, null, 2));
console.log(`✅ Created test-medium-600-blocks.json with ${NUM_BLOCKS} blocks`);
console.log('This should trigger the virtualization notice (threshold is 500).');