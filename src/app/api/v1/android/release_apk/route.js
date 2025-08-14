// app/api/v1/android/release-apk/route.js
import { exec } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
// import androidDockerYaml from '../../../../../lib/docker-yaml';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import axios from 'axios';
import {androidModel} from '@/models/android/Android';

export async function POST(req) {
    const vendor_db = await vendorDbConnect();
    const Android = androidModel(vendor_db);


    try {
        const {
            themeName,
            launcherIcon,
            splashScreenLogo,
            splashScreenBranding,
            appName = 'My App',
            packageName = 'com.example.app',
            versionCode = '1.0.0',
            color = '#ffffff'
        } = await req.json();

        // Initial validation
        if (!themeName) {
            return Response.json({
                success: false,
                error: true,
                message: 'Theme name is required'
            }, { status: 400 });
        }

        // Create initial build record
        const androidBuild = await Android.create({
            themeName,
            appName,
            packageName,
            versionCode,
            color,
            assets: {
                icon: launcherIcon ? 'assets/icon.png' : null,
                splashLogo: splashScreenLogo ? 'assets/splash_logo.png' : null,
                branding: splashScreenBranding ? 'assets/branding.png' : null
            }
        });

        // Step 1: Generate and save images
        try {
            const themeDir = path.resolve(process.cwd(), 'templates', `theme_${themeName}`);
            const assetsDir = path.join(themeDir, 'assets');

            await fs.mkdir(assetsDir, { recursive: true });

            const apiBaseUrl = 'http://localhost:3000/api/v1';

            // Generate and save launcher icon
            if (launcherIcon) {
                try {
                    const response = await axios.get(`${apiBaseUrl}/android/launcher_icon`, {
                        params: { url: launcherIcon },
                        responseType: 'arraybuffer'
                    });

                    if (!response.data || response.data.length === 0) {
                        throw new Error('Generated icon buffer is empty');
                    }

                    await fs.writeFile(path.join(assetsDir, 'icon.png'), Buffer.from(response.data));
                    console.log('Icon saved successfully');
                } catch (iconError) {
                    console.error('Error generating launcher icon:', iconError);
                    throw new Error(`Failed to generate launcher icon: ${iconError.message}`);
                }
            }

            // Generate and save splash screen logo
            if (splashScreenLogo) {
                try {
                    const response = await axios.get(`${apiBaseUrl}/android/splash-screen-logo`, {
                        params: { url: splashScreenLogo },
                        responseType: 'arraybuffer'
                    });

                    if (!response.data || response.data.length === 0) {
                        throw new Error('Generated splash logo buffer is empty');
                    }

                    await fs.writeFile(path.join(assetsDir, 'splash_logo.png'), Buffer.from(response.data));
                    console.log('Splash logo saved successfully');
                } catch (logoError) {
                    console.error('Error generating splash logo:', logoError);
                    throw new Error(`Failed to generate splash logo: ${logoError.message}`);
                }
            }

            // Generate and save splash screen branding
            if (splashScreenBranding) {
                try {
                    const response = await axios.get(`${apiBaseUrl}/android/splash-screen-branding`, {
                        params: { url: splashScreenBranding },
                        responseType: 'arraybuffer'
                    });

                    if (!response.data || response.data.length === 0) {
                        throw new Error('Generated branding buffer is empty');
                    }

                    await fs.writeFile(path.join(assetsDir, 'branding.png'), Buffer.from(response.data));
                    console.log('Branding saved successfully');
                } catch (brandingError) {
                    console.error('Error generating branding:', brandingError);
                    throw new Error(`Failed to generate branding: ${brandingError.message}`);
                }
            }

            androidBuild.buildMessage = 'Assets generated successfully';
            await androidBuild.save();

            console.log('step 1 completed');
        } catch (imageError) {
            androidBuild.buildStatus = -1;
            androidBuild.buildMessageType = 'error';
            androidBuild.buildMessage = imageError.message;
            await androidBuild.save();

            return Response.json({
                success: false,
                error: true,
                message: imageError.message
            }, { status: 500 });
        }

        // // Step 2: Generate YAML files with UUID
        // const yamlResult = await androidDockerYaml({
        //     appName,
        //     packageName,
        //     versionCode,
        //     color,
        //     themeName,
        //     builderId: androidBuild._id.toString()
        // });
        const response = await fetch(`${process.env.BASE_URL}/api/v1/android/docker-yaml`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any auth headers if needed
            },
            body: JSON.stringify({
                appName,
                packageName,
                versionCode,
                color,
                themeName,
                builderId: androidBuild._id.toString()
            })
        });

        const yamlResult = await response.json();
        // YAML generation error
        if (!yamlResult.success) {
            androidBuild.buildStatus = -1;
            androidBuild.buildMessageType = 'error';
            androidBuild.buildMessage = yamlResult.error;
            await androidBuild.save();

            return Response.json({
                success: false,
                error: true,
                message: yamlResult.error
            }, { status: 500 });
        }

        console.log('step 2 completed');

        // Step 3: Copy YAML files to template directory
        try {
            const themeDir = path.resolve(process.cwd(), 'templates', `theme_${themeName}`);
            const circleciDir = path.join(themeDir, '.circleci');

            await fs.mkdir(circleciDir, { recursive: true });

            // Copy CircleCI config
            const targetPath = path.join(circleciDir, 'config.yml');
            await fs.copyFile(yamlResult.circleci.path, targetPath);

            const splashYamlPath = path.join(themeDir, 'native_splash.yaml');
            await fs.copyFile(yamlResult.splash.path, splashYamlPath);

            // Check file exists
            try {
                await fs.access(splashYamlPath);
                console.log('native_splash.yaml exists and ready to add.');
            } catch (e) {
                throw new Error('native_splash.yaml was not created in theme directory');
            }

            // Delete only if temp file is not the same as destination
            if (yamlResult.circleci.path !== targetPath) {
                await fs.unlink(yamlResult.circleci.path);
            }
            if (yamlResult.splash.path !== splashYamlPath) {
                await fs.unlink(yamlResult.splash.path);
            }

            // Git operations with direct commit and push
            try {
                const gitCommands = [
                    'git add .circleci/config.yml',
                    'git add native_splash.yaml',
                    'git add assets/*',
                    `git commit -m "Build #${androidBuild._id}: Update CircleCI configuration, splash config and assets\n\n## $(date '+%Y-%m-%d %H:%M:%S')"`
                ];

                console.log('Executing commit commands:', gitCommands.join(' && '));

                // Execute commit
                await new Promise((resolve, reject) => {
                    exec(gitCommands.join(' && '), { cwd: themeDir }, function (error, stdout, stderr) {
                        if (error && !error.message.includes('nothing to commit')) {
                            reject({ error, stderr });
                        } else {
                            resolve({ stdout, stderr });
                        }
                    });
                });

                // Then execute push command separately
                console.log('Executing git push');

                await new Promise((resolve, reject) => {
                    exec('git push origin main', { cwd: themeDir }, function (error, stdout, stderr) {
                        if (error) {
                            reject({ error, stderr });
                        } else {
                            resolve({ stdout, stderr });
                        }
                    });
                });

                // Update success status
                androidBuild.buildStatus = 1;
                androidBuild.buildMessageType = 'success';
                androidBuild.buildMessage = 'Build completed successfully';
                await androidBuild.save();

            } catch (gitError) {
                console.error('Git operation failed:', gitError);
                androidBuild.buildStatus = -1;
                androidBuild.buildMessageType = 'error';
                androidBuild.buildMessage = 'Git operation failed: ' + (gitError.stderr || gitError.error?.message || 'Unknown error');
                await androidBuild.save();

                return Response.json({
                    success: false,
                    error: true,
                    message: 'Git operation failed'
                }, { status: 500 });
            }

            console.log('step 3 completed');
        } catch (fileError) {
            androidBuild.buildStatus = -1;
            androidBuild.buildMessageType = 'error';
            androidBuild.buildMessage = fileError.message;
            await androidBuild.save();

            return Response.json({
                success: false,
                error: true,
                message: fileError.message
            }, { status: 500 });
        }

        return Response.json({
            success: true,
            error: false,
            message: 'Build process initiated successfully',
            data: {
                buildId: androidBuild._id
            }
        }, { status: 200 });
    } catch (err) {
        console.error('Unexpected error in androidReleaseApk:', err);

        return Response.json({
            success: false,
            error: true,
            message: 'Internal server error'
        }, { status: 500 });
    }
}