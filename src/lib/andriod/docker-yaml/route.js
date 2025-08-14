// app/api/v1/android/docker-yaml/route.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function POST(request) {
    try {
        const params = await request.json();
        const {
            builderId,
            appName = 'My App Name',
            packageName = 'com.example.app',
            versionCode = '1.0.0',
            color = '#ffffff',
            themeName = 'desiree'
        } = params;

        // Define webhook URL directly
        const WEBHOOK_URL = 'https://sdk.apidoxy.com/api/android-build-status-hook';

        const splash_yaml_json = {
            "flutter_native_splash": {
                "android": true,
                "ios": true,
                "web": true,
                "color": color,
                "image": "assets/splash_logo.png",
                "branding": "assets/branding.png",
                "icon_background_color": color,
                "android_12": {
                    "color": color,
                    "image": "assets/splash_logo.png",
                    "branding": "assets/branding.png",
                    "icon_background_color": color
                }
            }
        };
        const apk_yaml_json = {
            "version": 2.1,
            "parameters": {
                "builderId": {
                    "type": "string",
                    "default": "default-builder-id"
                }
            },
            "jobs": {
                "build_apk": {
                    "docker": [
                        {
                            "image": "ghcr.io/cirruslabs/flutter:3.29.3"
                        }
                    ],
                    "resource_class": "large",
                    "steps": [
                        "checkout",
                        {
                            "run": {
                                "name": "Timestamp",
                                "command": `echo '${Date.now()}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Check Flutter Version",
                                "command": `flutter --version && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "Flutter version checked"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Install dependencies",
                                "command": `flutter pub get && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "Dependencies installed"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Rename Package Name",
                                "command": `dart run change_app_package_name:main ${packageName} && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "Package name updated"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Rename App Nickname",
                                "command": `dart run rename_app:main all='${appName}' && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "App name updated"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Generate Splash Screen",
                                "command": `dart run flutter_native_splash:create --path=native_splash.yaml && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "Splash screen generated"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Generate App Icon",
                                "command": `dart run flutter_launcher_icons:generate && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "App icon generated"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Generate Version Code",
                                "command": `dart run cider version ${versionCode} && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 0, "buildMessageType": "pending", "buildMessage": "Version code updated"}'`
                            }
                        },
                        {
                            "run": {
                                "name": "Build APK",
                                "command": `flutter build apk --release && curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 1, "buildMessageType": "success", "buildMessage": "APK built successfully"}'`
                            }
                        },
                        {
                            "store_artifacts": {
                                "path": "build/app/outputs/flutter-apk/app-release.apk",
                                "destination": "app-release.apk"
                            }
                        },
                        {
                            "run": {
                                "name": "Upload APK to Cloud",
                                "command": `
                  APK_PATH="build/app/outputs/flutter-apk/app-release.apk" &&
                  if [ -f "$APK_PATH" ]; then
                    FORM_DATA="$(echo -n 'file=@'$APK_PATH'&bucketName=releaseble-apks')" &&
                    RESPONSE=$(curl -X POST https://cloud.apidoxy.com/file/upload \
                      -H "Authorization: Bearer ${process.env.APIDOXY_CLOUD_ACCESS_KEY}" \
                      -F "file=@$APK_PATH" \
                      -F "bucketName=releaseble-apks") &&
                    if [ $? -eq 0 ]; then
                      DOWNLOAD_URL=$(echo $RESPONSE | jq -r '.downloadableUrl') &&
                      curl -X POST "${WEBHOOK_URL}" \
                        -H 'Content-Type: application/json' \
                        -d "{
                          \\"builderId\\": \\"${builderId}\\",
                          \\"buildStatus\\": 1,
                          \\"buildMessageType\\": \\"success\\",
                          \\"buildMessage\\": \\"APK uploaded successfully\\",
                          \\"downloadUrl\\": \\"$DOWNLOAD_URL\\"
                        }"
                    else
                      curl -X POST "${WEBHOOK_URL}" \
                        -H 'Content-Type: application/json' \
                        -d '{
                          "builderId": "${builderId}",
                          "buildStatus": -1,
                          "buildMessageType": "error",
                          "buildMessage": "Failed to upload APK"
                        }'
                    fi
                  else
                    curl -X POST "${WEBHOOK_URL}" \
                      -H 'Content-Type: application/json' \
                      -d '{
                        "builderId": "${builderId}",
                        "buildStatus": -1,
                        "buildMessageType": "error",
                        "buildMessage": "APK file not found"
                      }'
                  fi
                `
                            }
                        },
                        {
                            "run": {
                                "name": "Final Status Update",
                                "command": `curl -X POST "${WEBHOOK_URL}" -H 'Content-Type: application/json' -d '{"builderId": "${builderId}", "buildStatus": 1, "buildMessageType": "success", "buildMessage": "Build completed successfully"}'`
                            }
                        }
                    ]
                }
            },
            "workflows": {
                "build": {
                    "jobs": [
                        "build_apk"  // Changed this to just reference the job name
                    ]
                }
            }
        }

        const yamlDir = path.join(process.cwd(), 'yaml');
        const themeDir = path.resolve(process.cwd(), 'templates', `theme_${themeName}`);

        // Create directories if they don't exist
        fs.mkdirSync(yamlDir, { recursive: true });
        fs.mkdirSync(themeDir, { recursive: true });

        // Generate UUID for CircleCI config
        const circleciFileId = uuidv4();

        // Define file paths
        const circleciJsonPath = path.join(yamlDir, `${circleciFileId}.json`);
        const circleciYamlPath = path.join(yamlDir, `${circleciFileId}.yml`);
        const splashJsonPath = path.join(yamlDir, `splash_${circleciFileId}.json`);
        const splashYamlPath = path.join(themeDir, 'native_splash.yaml');

        // Write JSON files
        fs.writeFileSync(circleciJsonPath, JSON.stringify(apk_yaml_json, null, 2));
        fs.writeFileSync(splashJsonPath, JSON.stringify(splash_yaml_json, null, 2));

        // Convert to YAML using json2yaml
        await execAsync(`json2yaml ${circleciJsonPath} > ${circleciYamlPath}`);
        await execAsync(`json2yaml ${splashJsonPath} > ${splashYamlPath}`);

        // Clean up temporary JSON files
        fs.unlinkSync(circleciJsonPath);
        fs.unlinkSync(splashJsonPath);

        return new Response(JSON.stringify({
            success: true,
            circleci: {
                path: circleciYamlPath,
                filename: `${circleciFileId}.yml`
            },
            splash: {
                path: splashYamlPath,
                filename: 'native_splash.yaml',
                theme: themeName
            },
            message: 'YAML files created successfully'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}