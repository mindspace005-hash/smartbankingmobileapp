# Build and Deployment Rules

**DO NOT USE EXPO OR DEBUG METRO SERVERS FOR TESTING ON THIS PROJECT.**

The development environment has memory issues when using the Metro server via `npx react-native start`. This leads to silent OOM crashes and the physical device hanging on a white screen.

Instead, when the user requests to test or deploy changes on their phone:
1. ALWAYS build a native Release APK directly using Gradle: `$env:JAVA_HOME="C:\Users\HP Laptop\jdk17\jdk-17.0.12+7"; cd android; .\gradlew.bat assembleRelease`
2. Install the APK via ADB: `$env:PATH+=";C:\Users\HP Laptop\AppData\Local\Android\Sdk\platform-tools"; adb install -r android\app\build\outputs\apk\release\app-release.apk; adb shell monkey -p com.pat.financialapp -c android.intent.category.LAUNCHER 1`

This ensures a stable, robust build and entirely avoids the Metro server crashes.
