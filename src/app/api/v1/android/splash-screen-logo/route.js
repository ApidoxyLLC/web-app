// app/api/v1/android-splash-screen-logo/route.js
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

const fullCanvasSize = 960;
const logoBoxSize = 640;

function createBlankCanvasBuffer() {
    const canvas = createCanvas(fullCanvasSize, fullCanvasSize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, fullCanvasSize, fullCanvasSize);
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
        return await loadImage(buffer);
    } catch (err) {
        throw err;
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl || !imageUrl.startsWith('http')) {
            const blankBuffer = createBlankCanvasBuffer();
            return new Response(blankBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png'
                }
            });
        }

        const canvas = createCanvas(fullCanvasSize, fullCanvasSize);
        const ctx = canvas.getContext('2d');

        try {
            const img = await loadImageFromUrl(imageUrl);

            let targetWidth = logoBoxSize;
            let targetHeight = logoBoxSize;

            if (img.width > img.height) {
                targetHeight = (img.height / img.width) * logoBoxSize;
            } else if (img.height > img.width) {
                targetWidth = (img.width / img.height) * logoBoxSize;
            }

            const x = (fullCanvasSize - targetWidth) / 2;
            const y = (fullCanvasSize - targetHeight) / 2;

            ctx.clearRect(0, 0, fullCanvasSize, fullCanvasSize);
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