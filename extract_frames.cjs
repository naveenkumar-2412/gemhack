const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\NAVEEN\\.gemini\\antigravity\\brain\\f023ac19-22e1-4ac9-a00c-b995ff4805a4\\trisense_demo_recording_1773662348655.webp';
const framesDir = 'C:\\Users\\NAVEEN\\.gemini\\antigravity\\brain\\f023ac19-22e1-4ac9-a00c-b995ff4805a4\\frames';

async function extract() {
    try {
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }
        
        console.log(`Loading metadata for: ${inputPath}`);
        const metadata = await sharp(inputPath, { animated: true }).metadata();
        const pages = metadata.pages || 1;
        console.log(`Found ${pages} pages/frames.`);
        
        for (let i = 0; i < pages; i++) {
            const framePath = path.join(framesDir, `frame_${i.toString().padStart(5, '0')}.png`);
            await sharp(inputPath, { page: i }).toFile(framePath);
            if (i % 50 === 0) console.log(`Extracted frame ${i}`);
        }
        console.log('Extraction complete.');
    } catch (err) {
        console.error('Extraction failed:', err);
        process.exit(1);
    }
}

extract();
