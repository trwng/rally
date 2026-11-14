import SwiftUI
import MapKit

struct FindView: View {
    @EnvironmentObject var store: Store
    @State private var filter: String?
    @State private var showMap = false
    @State private var showNew = false

    private var list: [Game] {
        let g = filter == nil ? store.games : store.games.filter { $0.sport == filter }
        return g.sorted { ($0.startDate ?? .distantFuture) < ($1.startDate ?? .distantFuture) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Text("Find a game").font(.system(size: 28, weight: .black))
                    Spacer()
                    Picker("View", selection: $showMap) {
                        Image(systemName: "list.bullet").tag(false)
                        Image(systemName: "map").tag(true)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 100)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 12)

                SportChips(selection: $filter).padding(.bottom, 10)
                Hairline()

                if showMap {
                    GamesMap(games: list)
                } else {
                    ScrollView {
                        if list.isEmpty {
                            EmptyNote(text: "No games match. Be the first to start one.")
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(Array(list.enumerated()), id: \.element.id) { i, g in
                                    if i > 0 { Hairline() }
                                    GameCardView(game: g)
                                }
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                    .refreshable { await store.refresh() }
                }
            }
            .background(Theme.background)
            .toolbar(.hidden, for: .navigationBar)
            .overlay(alignment: .bottomTrailing) {
                Button {
                    showNew = true
                } label: {
                    Label("New game", systemImage: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .padding(.horizontal, 16)
                        .frame(height: 46)
                        .foregroundStyle(Theme.primaryForeground)
                        .background(Theme.primary)
                        .clipShape(Capsule())
                        .shadow(color: .black.opacity(0.18), radius: 8, y: 3)
                }
                .padding(16)
            }
            .sheet(isPresented: $showNew) { NewGameView() }
        }
    }
}

struct GamesMap: View {
    @EnvironmentObject var store: Store
    let games: [Game]
    @State private var selected: Game?

    var body: some View {
        let pins = games.filter { $0.lat != nil && $0.lng != nil }
        Map {
            ForEach(pins) { g in
                let s = sport(for: g.sport)
                Annotation(s.name, coordinate: CLLocationCoordinate2D(latitude: g.lat ?? 0, longitude: g.lng ?? 0)) {
                    Button { selected = g } label: {
                        Text(s.emoji)
                            .font(.system(size: 18))
                            .frame(width: 36, height: 36)
                            .background(Theme.background)
                            .overlay(Circle().stroke(s.color, lineWidth: 2))
                            .clipShape(Circle())
                    }
                }
            }
        }
        .sheet(item: $selected) { g in
            ScrollView { GameCardView(game: g) }
                .presentationDetents([.medium])
        }
        .overlay {
            if pins.isEmpty {
                EmptyNote(text: "No games with a map location yet.")
                    .background(Theme.background.opacity(0.9))
            }
        }
    }
}
