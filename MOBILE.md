# Rally as an iPhone / Android app

The app is a Capacitor shell that loads Rally from its live web address, so the
web app keeps working as it does today (including the Supabase backend and the
`/api/geocode` server route). Updating the website updates the app too.

App ID: `com.trwng.rally` (change it in `capacitor.config.ts` before you add the
platforms if you want a different one; it can't be changed later once the app
is in the store).

## One-time setup (on your Mac)

1. Install Node.js and Xcode (from the Mac App Store). For Android also install
   Android Studio.
2. Clone the repo and install:
   ```sh
   git clone https://github.com/trwng/rally
   cd rally
   bun install        # or: npm install
   ```
3. The live web address is already set to `https://letsrallys.app` in
   `capacitor.config.ts` (it must be `https://`).
4. Add the platforms:
   ```sh
   npx cap add ios
   npx cap add android
   ```

## Build and run on iPhone

```sh
npx cap sync ios
npx cap open ios
```

In Xcode: select the **App** target, open **Signing & Capabilities**, choose
your Apple Developer **Team**, then press Run to test on a simulator or your
phone. To ship: **Product → Archive → Distribute App → App Store Connect**,
then finish the listing in App Store Connect and submit for review.

## Build for Android

```sh
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Generate Signed Bundle / APK**, then upload the
`.aab` to the Google Play Console.

## Before you submit to the App Store

- Apple can reject apps that are only a website in a frame (guideline 4.2).
  Add real phone features before submitting, such as push notifications, using
  the device location for nearby games, and "add to calendar".
- Add an app icon (1024x1024) and screenshots. `npx @capacitor/assets generate`
  can make all icon and splash sizes from one image.
- If people can create accounts, Apple requires an in-app way to delete the
  account, and a privacy policy link.
- Rally lets strangers meet, so include reporting and blocking of users.
