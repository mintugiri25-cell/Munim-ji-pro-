# MunimJi Pro — Android & iOS Native Build and Distribution Guide

This codebase is architected with a shared React 19 + TypeScript + Capacitor core that builds seamlessly to:
1. **Android**: Installable Debug APK, Production Signed Release APK (`.apk`), and Google Play Store Android App Bundle (`.aab`).
2. **iOS**: Apple iPhone & iPad native Xcode project, TestFlight beta distribution, and App Store IPA.
3. **PWA**: Instant web app installation on Android (Chrome/Firefox) and iOS (Safari "Add to Home Screen") with offline storage.

---

## 1. Prerequisites
- **Node.js**: v18+ or v20+ with npm
- **Android Studio** (for Android APK/AAB): JDK 17, Android SDK Platform 34+
- **macOS with Xcode 15+** (for iPhone/iOS): Requires an active Apple Developer Program membership ($99/year) to sign IPAs and submit to TestFlight.

---

## 2. One-Time Setup for Mobile Platforms

Run in your terminal inside the project directory:

```bash
# 1. Install Capacitor Native CLI & Plugins
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/camera @capacitor/filesystem @capacitor/share

# 2. Build the production web bundle
npm run build

# 3. Add Android and iOS native platforms
npx cap add android
npx cap add ios
```

---

## 3. Android Build: Signed Release APK & Google Play AAB

### Step 3.1: Generate a Secure Keystore (One-Time)
Run this command to generate your production release signing key:
```bash
keytool -genkey -v -keystore munimji-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias munimji-key
```
Store this keystore file safely and remember your alias password.

### Step 3.2: Configure Gradle Signing Credentials
Edit `android/app/build.gradle` inside the `android { ... }` block:
```groovy
signingConfigs {
    release {
        storeFile file('../../munimji-release-key.jks')
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "yourStorePass"
        keyAlias "munimji-key"
        keyPassword System.getenv("KEY_PASSWORD") ?: "yourKeyPass"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Step 3.3: Sync Web Assets to Android
```bash
npm run build
npx cap sync android
```

### Step 3.4: Build Signed Release APK (For Direct Installation on Android phones)
```bash
cd android
./gradlew assembleRelease
```
The output APK is located at:
`android/app/build/outputs/apk/release/app-release.apk`
You can transfer this directly to any Android smartphone via WhatsApp, Google Drive, or USB and install it (enable "Install from unknown sources").

### Step 3.5: Build Google Play Store Bundle (.AAB)
```bash
cd android
./gradlew bundleRelease
```
The output bundle is located at:
`android/app/build/outputs/bundle/release/app-release.aab`
Upload this file directly to **Google Play Console** under Production or Internal Testing.

---

## 4. iOS Build: Apple iPhone / iPad & TestFlight

> **Important**: Apple does not allow installing Android `.apk` files on iPhones. iOS requires a distinct `.ipa` signed with an Apple Developer Certificate and Provisioning Profile.

### Step 4.1: Sync Web Assets to iOS
```bash
npm run build
npx cap sync ios
```

### Step 4.2: Open in Xcode (on macOS)
```bash
npx cap open ios
```

### Step 4.3: Configure Signing & Capabilities in Xcode
1. In Xcode, click on the root project `App`.
2. Under the **Signing & Capabilities** tab:
   - Check **Automatically manage signing**.
   - Select your **Team** (associated with your Apple Developer Account).
   - Enter your unique Bundle Identifier (e.g., `com.munimji.businessaccounting`).

### Step 4.4: Archive and Upload to TestFlight / App Store
1. In Xcode menu bar, select `Product` > `Destination` > `Any iOS Device (arm64)`.
2. Click `Product` > `Archive`.
3. When the Organizer window appears:
   - Click **Distribute App**.
   - Select **App Store Connect** (or TestFlight Internal Testing).
   - Click **Upload**.
4. Within 10–15 minutes, the build appears in **App Store Connect > TestFlight**.
5. Add internal/external testers via their email; testers install the **TestFlight app** from the App Store to test on physical iPhones.

---

## 5. Instant PWA Mode (No App Store / Developer Account Needed)
For instant multi-device usage without paying for Google Play ($25) or Apple Developer ($99):
1. Open the application URL in Google Chrome (Android) or Safari (iOS).
2. On Android: Tap the 3 dots menu -> **Install app** or **Add to Home screen**.
3. On iPhone: Tap the Share button -> **Add to Home Screen**.
4. The app runs in full-screen standalone mode with offline IndexedDB database support.
