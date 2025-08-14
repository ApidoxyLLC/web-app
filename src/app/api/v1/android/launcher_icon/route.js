// app/api/v1/android_launcher_icon/route.js
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

const boxWidth = 512;
const boxHeight = 512;

function createBlankCanvasBuffer() {
    const canvas = createCanvas(boxWidth, boxHeight);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, boxWidth, boxHeight);
    return canvas.toBuffer();
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        console.log('Fetching image from URL:', imageUrl);

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('Image download response status:', response.status);

        if (!response.data || response.data.length === 0) {
            throw new Error('Downloaded image data is empty');
        }

        const img = await loadImage(Buffer.from(response.data));
        console.log('Image loaded, dimensions:', img.width, 'x', img.height);

        const canvas = createCanvas(boxWidth, boxHeight);
        const ctx = canvas.getContext('2d');

        const scale = Math.min(boxWidth / img.width, boxHeight / img.height);
        const targetWidth = img.width * scale;
        const targetHeight = img.height * scale;

        const x = (boxWidth - targetWidth) / 2;
        const y = (boxHeight - targetHeight) / 2;

        ctx.clearRect(0, 0, boxWidth, boxHeight);
        ctx.drawImage(img, x, y, targetWidth, targetHeight);

        const buffer = canvas.toBuffer('image/png');
        console.log('Generated buffer size:', buffer.length);

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png'
            }
        });
    } catch (error) {
        console.error('Error in generateAndroidLauncherIcon:', error);
        const blankBuffer = createBlankCanvasBuffer();
        return new Response(blankBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png'
            }
        });
    }
}