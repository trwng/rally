import SwiftUI

@main
struct RallyApp: App {
    @StateObject private var store = Store()
    @AppStorage("appearance") private var appearance = AppearanceMode.system.rawValue

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Theme.primary)
                .preferredColorScheme(AppearanceMode(rawValue: appearance)?.scheme)
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
            OnboardingView()
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

