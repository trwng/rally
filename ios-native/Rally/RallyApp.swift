import SwiftUI

@main
struct RallyApp: App {
    @StateObject private var store = Store()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Theme.primary)
                .task { await store.start() }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: Store

    var body: some View {
        switch store.phase {
        case .loading:
            ZStack {
                Theme.background.ignoresSafeArea()
                ProgressView().tint(Theme.primary)
            }
        case .signedOut:
            AuthView()
        case .needsProfile:
            NeedsProfileView()
        case .ready:
            MainTabView()
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var store: Store

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }
            FindView()
                .tabItem { Label("Find", systemImage: "magnifyingglass") }
            GroupsView()
                .tabItem { Label("Groups", systemImage: "person.2") }
            ChatsView()
                .tabItem { Label("Chats", systemImage: "bubble.left") }
                .badge(store.unreadTotal)
            ProfileView()
                .tabItem { Label("You", systemImage: "person") }
        }
        .sheet(item: $store.shownPlayer) { ref in
            PlayerProfileView(id: ref.id)
        }
        .task {
            // Keep chats, requests and groups fresh while the app is open.
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                await store.reloadSocial()
            }
        }
    }
}

/// Shown when someone has an account but hasn't finished setting up their profile.
struct NeedsProfileView: View {
    @EnvironmentObject var store: Store

    var body: some View {
        VStack(spacing: 16) {
            Text("One more step")
                .font(.system(size: 28, weight: .black))
            Text("Finish setting up your profile on letsrallys.app, then come back and pull to refresh. Setup inside the app is coming next.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
            Button("I've finished — check again") { Task { await store.loadAll() } }
                .buttonStyle(PrimaryButtonStyle())
            Button("Sign out") { store.signOut() }
                .buttonStyle(PrimaryButtonStyle(filled: false))
        }
        .padding(24)
        .frame(maxHeight: .infinity)
        .background(Theme.background.ignoresSafeArea())
    }
}
