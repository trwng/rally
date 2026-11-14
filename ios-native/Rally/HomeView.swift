import SwiftUI

struct HomeView: View {
    @EnvironmentObject var store: Store
    @State private var filter: String?
    @State private var showPlaces = false

    private var nearYou: [Game] {
        let list = filter == nil ? store.games : store.games.filter { $0.sport == filter }
        return Array(list.prefix(6))
    }

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
                    .padding(.bottom, 20)

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
                        SportChips(selection: $filter).padding(.horizontal, -16).padding(.bottom, 8)
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
