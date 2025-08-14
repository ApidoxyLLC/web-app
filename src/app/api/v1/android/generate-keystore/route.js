// app/api/v1/android/generate-keystore/route.js
import _ from 'lodash';
import { exec } from 'child_process';
import { v6 as uuidv6 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

export async function POST(request) {
    try {
        const params = await request.json();
        const id = uuidv6();
        const commonName = params.commonName || 'Admin';
        const organizationalUnit = params.organizationalUnit || 'Dev';
        const organization = params.organization || 'Apidoxy';
        const locality = params.locality || 'Chattogram';
        const state = params.state || 'Bangladesh Region';
        const country = params.country || 'BD';

        const alias = id;
        const storePassword = 'android';
        const keyPassword = 'android';
        const keySize = '2048';
        const validity = '3650';
        const dname = `CN=${commonName}, OU=${organizationalUnit}, O=${organization}, L=${locality}, S=${state}, C=${country}`;

        // Ensure keystores directory exists
        const keystoreDir = path.resolve(process.cwd(), 'keystores');
        if (!fs.existsSync(keystoreDir)) {
            fs.mkdirSync(keystoreDir, { recursive: true });
        }
        const keystorePath = path.join(keystoreDir, `${alias}.jks`);
        const command = [
            'keytool',
            '-genkeypair',
            '-v',
            '-keystore', `"${keystorePath}"`,
            '-alias', alias,
            '-keyalg', 'RSA',
            '-keysize', keySize,
            '-validity', validity,
            '-storepass', storePassword,
            '-keypass', keyPassword,
            '-dname', `"${dname}"`
        ].join(' ');

        // Helper to extract SHA1 and SHA256 from keytool output
        function extractFingerprints(output) {
            let sha1 = null, sha256 = null;
            const sha1Match = output.match(/SHA1:\s*([A-F0-9:]+)/i);
            const sha256Match = output.match(/SHA256:\s*([A-F0-9:]+)/i);
            if (sha1Match) sha1 = sha1Match[1];
            if (sha256Match) sha256 = sha256Match[1];
            return { sha1, sha256 };
        }

        const result = await new Promise((resolve) => {
            exec(command, { shell: true }, async (error, stdout, stderr) => {
                if (error) {
                    return resolve({
                        success: false,
                        message: 'Failed to generate keystore',
                        error: stderr || error.message
                    });
                }

                // Get fingerprints using existing listCmd
                const listCmd = [
                    'keytool',
                    '-list',
                    '-v',
                    '-keystore', `"${keystorePath}"`,
                    '-alias', alias,
                    '-storepass', storePassword,
                    '-keypass', keyPassword
                ].join(' ');

                exec(listCmd, { shell: true }, async (listErr, listStdout, listStderr) => {
                    let sha1 = null, sha256 = null;
                    if (!listErr) {
                        const fp = extractFingerprints(listStdout);
                        sha1 = fp.sha1;
                        sha256 = fp.sha256;
                    }

                    // Upload file to cloud storage
                    try {
                        const formData = new FormData();
                        formData.append('file', fs.createReadStream(keystorePath));
                        formData.append('bucketName', 'keystores');

                        const uploadResponse = await axios.post('https://cloud.apidoxy.com/file/upload',
                            formData,
                            {
                                headers: {
                                    ...formData.getHeaders(),
                                    'Authorization': `Bearer ${process.env.APIDOXY_CLOUD_ACCESS_KEY}`
                                }
                            }
                        );

                        // Log the upload response
                        console.log('Upload Response:', uploadResponse.data);

                        // If upload successful, delete the local file
                        if (uploadResponse.status === 200) {
                            fs.unlink(keystorePath, (err) => {
                                if (err) console.error('Error deleting keystore file:', err);
                                else console.log('Keystore file deleted successfully');
                            });
                        }

                        resolve({
                            success: true,
                            message: "Keystore generated and uploaded successfully",
                            keystorePath,
                            downloadUrl: uploadResponse.data.downloadableUrl,
                            alias,
                            sha1,
                            sha256
                        });

                    } catch (uploadError) {
                        resolve({
                            success: true,
                            message: "Keystore generated but upload failed",
                            keystorePath,
                            error: uploadError.message,
                            alias,
                            sha1,
                            sha256
                        });
                    }
                });
            });
        });

        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Internal server error',
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}