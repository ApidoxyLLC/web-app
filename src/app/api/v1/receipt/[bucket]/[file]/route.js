import { NextResponse } from 'next/server';
import { downloadReceipt } from '@/services/reciptPdf/backblazePdf';

export async function GET(req, { params }) {
    const { bucket, file } =await params; 

    try {
        const { data, headers } = await downloadReceipt({
            bucketName: bucket,
            fileName: file 
        });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', headers['content-type'] || 'application/pdf');
        if (headers['content-length']) {
            responseHeaders.set('Content-Length', headers['content-length']);
        }
        if (headers['last-modified']) {
            responseHeaders.set('Last-Modified', headers['last-modified']);
        }

        return new NextResponse(data, {
            status: 200,
            headers: responseHeaders
        });

    } catch (err) {
        console.error('Receipt Download Error:', err.message);

        const statusCode = err.message.includes('not found') ? 404 : 500;
        return new NextResponse(
            JSON.stringify({
                error: statusCode === 404 ? 'Receipt not found' : 'Internal server error',
                details: err.message
            }),
            {
                status: statusCode,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}
