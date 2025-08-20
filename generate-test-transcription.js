// Script to generate a large test transcription file
const fs = require('fs');

// Configuration
const NUM_BLOCKS = 1500; // Number of blocks to generate
const SPEAKERS = ['א', 'ב', 'ג', 'ד']; // Hebrew speaker codes

// Sample Hebrew texts for variety
const sampleTexts = [
  "זהו טקסט לדוגמה שמציג תמלול ארוך עם הרבה מילים כדי לבדוק את הביצועים של המערכת",
  "הדובר ממשיך לדבר על נושאים שונים ומגוונים במהלך הפגישה",
  "כאן יש לנו עוד משפט ארוך שמכיל מידע חשוב לתמלול",
  "המערכת צריכה להתמודד עם טקסטים ארוכים ומורכבים",
  "בדיקת ביצועים עבור מסמכים גדולים היא קריטית להצלחת המערכת",
  "עוד טקסט לדוגמה שמדמה שיחה אמיתית בין משתתפים",
  "חשוב לוודא שהמערכת עובדת בצורה חלקה גם עם אלפי בלוקים",
  "הטקסט הזה נועד לבדוק את יכולות הגלילה הוירטואלית",
  "כל בלוק מכיל טקסט שונה כדי לדמות תמלול אמיתי",
  "המטרה היא ליצור קובץ גדול מספיק לבדיקה מקיפה"
];

// Generate blocks
const blocks = [];
let currentTime = 0;

for (let i = 0; i < NUM_BLOCKS; i++) {
  // Randomly select speaker
  const speaker = SPEAKERS[Math.floor(Math.random() * SPEAKERS.length)];
  
  // Randomly select text and maybe add block number
  const baseText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
  const text = `${baseText} - בלוק מספר ${i + 1}`;
  
  // Add block
  blocks.push({
    speaker: speaker,
    text: text,
    timestamp: currentTime
  });
  
  // Increment time (simulate 3-10 seconds per block)
  currentTime += Math.floor(Math.random() * 7) + 3;
}

// Create speaker definitions
const speakers = SPEAKERS.map((code, index) => ({
  code: code,
  name: `דובר ${index + 1}`,
  color: ['#667eea', '#f97316', '#22c55e', '#ef4444'][index] || '#666'
}));

// Create the full export data
const exportData = {
  blocks: blocks,
  speakers: speakers,
  metadata: {
    exportDate: new Date().toISOString(),
    blockCount: blocks.length,
    mediaFile: "test-large-transcription.mp3",
    duration: currentTime,
    testFile: true,
    description: `Test transcription with ${NUM_BLOCKS} blocks for virtual scrolling testing`
  }
};

// Write to file
const filename = `test-transcription-${NUM_BLOCKS}-blocks.json`;
fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));

console.log(`✅ Created ${filename}`);
console.log(`📊 Statistics:`);
console.log(`   - Total blocks: ${blocks.length}`);
console.log(`   - Total speakers: ${speakers.length}`);
console.log(`   - Duration: ${Math.floor(currentTime / 60)} minutes`);
console.log(`   - File size: ${(JSON.stringify(exportData).length / 1024).toFixed(2)} KB`);
console.log(`\n📤 You can now import this file using the import button in the transcription editor!`);