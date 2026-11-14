# Rally — native iPhone app (SwiftUI)

This is a from-scratch Swift version of Rally. It talks to the same Supabase backend as the website, so accounts, games and players are shared.
The previous web-wrapper version is saved as the git tag `web-capacitor-v1`.

## What works
Sign up / sign in (Keychain), profile onboarding, Home, Find (list + map) with place search, post / join / leave / end / cancel games, group & direct chats with photos and contact sharing, friend requests, player profiles, kudos, groups (create, invite codes, join requests, admin tools), past games, activity calendar, nearby courts & parks, profile editing (photo, bio, sports, contact, privacy, appearance), block / report.

## Updating after a `git pull`
Xcode's `Rally` folder is synced with the folder on disk, so just copy the files over:
`cp ~/Documents/rally-swift/ios-native/Rally/*.swift <your Xcode project>/Rally/`

## Set up in Xcode (one time)
1. Xcode → File → New → Project → iOS → **App**. Product Name `Rally`, Interface **SwiftUI**, Language **Swift**, Bundle ID `com.trwng.rally`. Save it somewhere outside this repo (e.g. Documents).
2. In the project navigator delete the two template files `RallyApp.swift` and `ContentView.swift` (Move to Trash).
3. Drag every file from this `ios-native/Rally` folder into the project navigator. Tick **Copy items if needed** and the **Rally** target.
4. Click the project → target **Rally** → General: set **Minimum Deployments** to iOS 17.0.
5. Build Settings → search "Default Actor Isolation" → set to **nonisolated** (if the setting exists). Search "Swift Language Version" → **Swift 5**.
6. Signing & Capabilities → pick your Team, choose your iPhone, press Run (⌘R).
