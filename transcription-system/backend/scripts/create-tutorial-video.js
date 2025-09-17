const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../tutorial-assets/extension-install');
const OUTPUT_DIR = path.join(__dirname, '../../frontend/main-app/public/videos');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'extension-tutorial.mp4');

// Configuration
const SECONDS_PER_IMAGE = 3; // How long each screenshot is shown
const FPS = 30; // Frames per second
const VIDEO_WIDTH = 1920; // Output width
const VIDEO_HEIGHT = 1080; // Output height

async function createVideo() {
    try {
        console.log('🎬 Starting video creation process...');

        // Ensure output directory exists
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log('✅ Output directory ready:', OUTPUT_DIR);

        // Get all image files
        const files = await fs.readdir(SCREENSHOTS_DIR);
        const imageFiles = files
            .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
            .sort(); // Alphabetical order (001, 002, etc.)

        if (imageFiles.length === 0) {
            console.error('❌ No image files found in:', SCREENSHOTS_DIR);
            console.log('Please add screenshots with names like: 001-step-name.png');
            return;
        }

        console.log(`📸 Found ${imageFiles.length} screenshots:`);
        imageFiles.forEach(f => console.log(`  - ${f}`));

        // Create input file list for ffmpeg
        const listFile = path.join(SCREENSHOTS_DIR, 'input.txt');
        const listContent = imageFiles
            .map(file => `file '${path.join(SCREENSHOTS_DIR, file).replace(/\\/g, '/')}'
duration ${SECONDS_PER_IMAGE}`)
            .join('\n');

        // Add last image again for proper duration
        const lastImage = imageFiles[imageFiles.length - 1];
        const finalContent = listContent + `\nfile '${path.join(SCREENSHOTS_DIR, lastImage).replace(/\\/g, '/')}'`;

        await fs.writeFile(listFile, finalContent);
        console.log('✅ Created input file list');

        // Build ffmpeg command
        const ffmpegCmd = [
            'ffmpeg',
            '-y', // Overwrite output file
            '-f concat',
            '-safe 0',
            `-i "${listFile}"`,
            '-vf', `"scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2,format=yuv420p"`,
            '-c:v libx264', // H.264 codec for browser compatibility
            '-preset slow', // Better quality
            '-crf 23', // Quality (lower = better, 23 is good balance)
            '-r', FPS, // Frame rate
            '-movflags +faststart', // Optimize for web streaming
            `"${OUTPUT_FILE}"`
        ].join(' ');

        console.log('🎥 Running ffmpeg to create video...');
        console.log('Command:', ffmpegCmd);

        // Execute ffmpeg
        exec(ffmpegCmd, async (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error creating video:', error.message);
                console.error('stderr:', stderr);
                return;
            }

            // Clean up temp file
            try {
                await fs.unlink(listFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            // Check output file
            const stats = await fs.stat(OUTPUT_FILE);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log('✅ Video created successfully!');
            console.log(`📁 Output file: ${OUTPUT_FILE}`);
            console.log(`📊 File size: ${sizeMB} MB`);
            console.log(`⏱️ Duration: ~${imageFiles.length * SECONDS_PER_IMAGE} seconds`);
            console.log('\n🌐 Video will be available at: /videos/extension-tutorial.mp4');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Check if ffmpeg is available
exec('ffmpeg -version', (error) => {
    if (error) {
        console.error('❌ ffmpeg is not installed or not in PATH');
        console.log('Please install ffmpeg: https://ffmpeg.org/download.html');
        console.log('On Windows: You can use "winget install ffmpeg" or download from the website');
        process.exit(1);
    } else {
        console.log('✅ ffmpeg is available');
        createVideo();
    }
});