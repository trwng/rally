import SwiftUI

struct HomeView: View {
    @EnvironmentObject var store: Store
    @State private var filter: String?
    @State private var showPlaces = false

    private var nearYou: [Game] {
        let list = filter == nil ? store.games : store.games.filter { $0.sport == filter }
        return Array(list.prefix(6))
    }

    private var mapGames: [Game] {
        filter == nil ? store.games : store.games.filter { $0.sport == filter }
    }

    /// Games I'm in that are happening right now (store.upcoming lists active ones first).
    private var activeGames: [Game] { store.upcoming.filter { $0.isActive } }

    private var todayLabel: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: Date())
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(todayLabel).eyebrow()
                        Text("Hi, \(firstName) 👋")
                            .font(.system(size: 28, weight: .black))
                        Text("Ready to play?")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, activeGames.isEmpty ? 20 : 14)

                    if let g = activeGames.first {
                        PlayingNowBanner(game: g, extra: activeGames.count - 1)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 20)
                    }

                    statsStrip

                    section("Your games") {
                        if store.upcoming.isEmpty {
                            EmptyNote(text: "You haven't joined any games yet.")
                        } else {
                            gameList(store.upcoming)
                        }
                    }

                    section("Near you") {
                        Button { showPlaces = true } label: {
                            Label("Find courts & parks nearby", systemImage: "location.magnifyingglass")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        SportChips(selection: $filter).padding(.horizontal, -16).padding(.bottom, 4)
                        GamesMap(
                            games: mapGames,
                            center: store.profile.flatMap { p in p.lat.flatMap { a in p.lng.map { (a, $0) } } }
                        )
                        .frame(height: 260)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
                        if nearYou.isEmpty {
                            EmptyNote(text: "No games yet. Start one from the Find tab.")
                        } else {
                            gameList(nearYou)
                        }
                    }

                    if !store.suggested.isEmpty {
                        section("Suggested for you") { gameList(store.suggested) }
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .refreshable { await store.refresh() }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showPlaces) { NearbyPlacesView() }
            .navigationDestination(for: ChatRoute.self) { ChatView(key: $0.key) }
        }
    }

    private var firstName: String {
        store.profile?.fullName.split(separator: " ").first.map(String.init) ?? ""
    }

    private var statsStrip: some View {
        VStack(spacing: 0) {
            Hairline()
            HStack(spacing: 0) {
                stat("\(store.playedCount)", "Games played")
                Rectangle().fill(Theme.border).frame(width: 1)
                stat("\(store.upcoming.count)", "Upcoming")
                Rectangle().fill(Theme.border).frame(width: 1)
                stat("\(store.streak)", "Day streak")
            }
            .frame(height: 72)
            Hairline()
        }
        .background(Theme.surface)
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 22, weight: .black)).monospacedDigit()
            Text(label).font(.system(size: 11, weight: .semibold)).foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeading(title)
            content()
        }
        .padding(.horizontal, 16)
        .padding(.top, 24)
    }

    private func gameList(_ games: [Game]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(games.enumerated()), id: \.element.id) { i, g in
                if i > 0 { Hairline() }
                GameCardView(game: g).padding(.horizontal, -16)
            }
        }
    }
}


/// Slim green strip shown on Home while you're in a live game. Tapping opens the game chat.
struct PlayingNowBanner: View {
    let game: Game
    var extra: Int = 0
    @State private var pulse = false

    var body: some View {
        NavigationLink(value: ChatRoute(key: "g:\(game.id)")) {
            HStack(spacing: 10) {
                Circle()
                    .fill(Theme.primaryForeground)
                    .frame(width: 8, height: 8)
                    .padding(4)
                    .background(Theme.primaryForeground.opacity(pulse ? 0.15 : 0.35), in: Circle())
                    .onAppear {
                        withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { pulse = true }
                    }
                VStack(alignment: .leading, spacing: 1) {
                    Text(extra > 0 ? "Playing now · +\(extra) more" : "Playing now")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(1.2)
                        .textCase(.uppercase)
                        .opacity(0.85)
                    TimelineView(.periodic(from: .now, by: 30)) { _ in
                        Text("\(sport(for: game.sport).name) · \(timeText)")
                            .font(.system(size: 15, weight: .heavy))
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                Text("Open")
                    .font(.system(size: 12.5, weight: .bold))
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Theme.primaryForeground.opacity(0.2), in: RoundedRectangle(cornerRadius: 5))
            }
            .foregroundStyle(Theme.primaryForeground)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius))
        }
        .buttonStyle(.plain)
    }

    private var timeText: String {
        guard let start = game.startDate else { return game.location }
        let mins = Int(Date().timeIntervalSince(start) / 60)
        if mins < 0 { return "starts in \(-mins) min" }
        if mins < 1 { return "just started" }
        if mins < 60 { return "\(mins) min in" }
        return "\(mins / 60)h \(mins % 60)m in"
    }
}
