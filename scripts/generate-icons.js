const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [16, 48, 128];
const sourceLogo = path.join(__dirname, '../Prototype/style/CanvasPAL_logo.webp');
const outputDir = path.join(__dirname, '../icons');

async function generateIcons() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const size of sizes) {
        await sharp(sourceLogo)
            .resize(size, size)
            .toFormat('png')
            .toFile(path.join(outputDir, `CanvasPAL_logo_${size}.png`));
    }

    console.log('Icon generation complete!');
}

generateIcons().catch(console.error);