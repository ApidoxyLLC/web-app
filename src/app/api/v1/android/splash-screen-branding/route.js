// app/api/v1/android-splash-screen-branding/route.js
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

const boxWidth = 800;
const boxHeight = 320;

function createBlankCanvasBuffer() {
    const canvas = createCanvas(boxWidth, boxHeight);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, boxWidth, boxHeight);
    return canvas.toBuffer();
}

async function loadImageFromUrl(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ApidoxyBot/1.0)'
            }
        });
        const buffer = Buffer.from(response.data);
        console.log(buffer)
        return await loadImage(buffer);
    } catch (err) {
        throw err;
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');
        console.log(imageUrl)
        if (!imageUrl || !imageUrl.startsWith('https')) {
            const blankBuffer = createBlankCanvasBuffer();
            return new Response(blankBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png'
                }
            });
        }

        const canvas = createCanvas(boxWidth, boxHeight);
        const ctx = canvas.getContext('2d');

        try {
            const img = await loadImageFromUrl(imageUrl);

            // Calculate scale to fit image inside 5:2 box (exact same logic as original)
            const scale = Math.min(boxWidth / img.width, boxHeight / img.height);
            const targetWidth = img.width * scale;
            const targetHeight = img.height * scale;

            // Center the image in the canvas (exact same logic as original)
            const x = (boxWidth - targetWidth) / 2;
            const y = (boxHeight - targetHeight) / 2;

            ctx.clearRect(0, 0, boxWidth, boxHeight);
            ctx.drawImage(img, x, y, targetWidth, targetHeight);

            const buffer = canvas.toBuffer();
            return new Response(buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png'
                }
            });
        } catch (err) {
            const blankBuffer = createBlankCanvasBuffer();
            return new Response(blankBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png'
                }
            });
        }
    } catch (error) {
        const blankBuffer = createBlankCanvasBuffer();
        return new Response(blankBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png'
            }
        });
    }
}