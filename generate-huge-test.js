// Generate a HUGE test file (5000 blocks = ~300 pages)
const fs = require('fs');

const NUM_BLOCKS = 5000; // Simulates ~300 pages
const SPEAKERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

const sampleTexts = [
  "זהו תמלול ארוך מאוד שמדמה פגישה של מספר שעות עם הרבה דוברים",
  "הטקסט כאן מייצג דיון מעמיק בנושאים מורכבים",
  "כל בלוק מכיל תוכן ייחודי כדי לדמות מסמך אמיתי",
  "המערכת צריכה להציג אלפי בלוקים בצורה חלקה",
  "גלילה וירטואלית תאפשר ביצועים מעולים גם עם מסמכים ענקיים"
];

const blocks = [];
let time = 0;

for (let i = 0; i < NUM_BLOCKS; i++) {
  blocks.push({
    speaker: SPEAKERS[i % SPEAKERS.length],
    text: `${sampleTexts[i % sampleTexts.length]} - חלק ${Math.floor(i/50) + 1}, בלוק ${i + 1}`,
    timestamp: time
  });
  time += Math.random() * 5 + 2;
}

const exportData = {
  blocks: blocks,
  speakers: SPEAKERS.map((code, i) => ({
    code: code,
    name: `משתתף ${i + 1}`
  })),
  metadata: {
    blockCount: NUM_BLOCKS,
    pages: Math.ceil(NUM_BLOCKS / 17), // ~17 blocks per page
    description: "Huge test file for stress testing"
  }
};

fs.writeFileSync(`test-huge-${NUM_BLOCKS}-blocks.json`, JSON.stringify(exportData, null, 2));
console.log(`✅ Created test-huge-${NUM_BLOCKS}-blocks.json (${(JSON.stringify(exportData).length / 1024).toFixed(0)} KB)`);