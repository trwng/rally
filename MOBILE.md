# Rally as an iPhone / Android app

The app packages a copy of Rally's screens inside it (so it looks exactly like the
website) and talks to the same Supabase database. Only address search calls the
live site (`https://letsrallys.app/api/geocode`). The normal website build is
untouched.

App ID: `com.trwng.rally` (set in `capacitor.config.ts`; can't change once the app
is in the store).

The public Supabase address and key are in `.env.production`, so no extra setup is needed.

## Build and run on iPhone (Mac with Xcode)

```sh
npm install
npx cap add ios        # first time only
npm run cap:sync       # builds the web code and copies it into the iOS project
npx cap open ios
```

In Xcode: choose the **App** target → **Signing & Capabilities** → pick your Team,
then press Run. After any web-code change, run `npm run cap:sync` again.
To ship: **Product → Archive → Distribute App → App Store Connect**.

## Android

```sh
npx cap add android    # first time only
npm run cap:sync
npx cap open android
```

## Notes

- Google sign-in is hidden inside the app (its redirect can't return to the app), so
  the app uses email sign-in. That also means "Sign in with Apple" isn't required.
- Apple requires an in-app way to delete an account, a privacy-policy link, and
  reporting/blocking for apps with user-generated content (Rally already has
  reporting and blocking). Add real phone features (push notifications, location)
  to avoid a "just a website" rejection.
