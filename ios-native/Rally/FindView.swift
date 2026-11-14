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

struct GameCluster: Identifiable {
    let id: String
    let lat: Double
    let lng: Double
    let games: [Game]
}

struct GamesMap: View {
    @EnvironmentObject var store: Store
    let games: [Game]
    /// Where the map opens (usually the player's city). Fits all pins when nil.
    var center: (Double, Double)? = nil
    @State private var selected: GameCluster?

    /// Games at the same spot share one pin.
    private var clusters: [GameCluster] {
        var groups: [String: [Game]] = [:]
        for g in games {
            guard let a = g.lat, let b = g.lng else { continue }
            groups[String(format: "%.4f,%.4f", a, b), default: []].append(g)
        }
        return groups.map { key, list in
            GameCluster(id: key, lat: list[0].lat ?? 0, lng: list[0].lng ?? 0, games: list)
        }
    }

    private var initialPosition: MapCameraPosition {
        if let c = center {
            return .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: c.0, longitude: c.1),
                span: MKCoordinateSpan(latitudeDelta: 0.3, longitudeDelta: 0.3)
            ))
        }
        return .automatic
    }

    var body: some View {
        let pins = clusters
        Map(initialPosition: initialPosition) {
            if let c = center {
                Marker("You", systemImage: "person.fill", coordinate: CLLocationCoordinate2D(latitude: c.0, longitude: c.1))
                    .tint(Theme.foreground)
            }
            ForEach(pins) { cluster in
                let s = sport(for: cluster.games[0].sport)
                Annotation(cluster.games.count > 1 ? "\(cluster.games.count) games" : s.name,
                           coordinate: CLLocationCoordinate2D(latitude: cluster.lat, longitude: cluster.lng)) {
                    Button { selected = cluster } label: {
                        ZStack(alignment: .topTrailing) {
                            Text(s.emoji)
                                .font(.system(size: 18))
                                .frame(width: 36, height: 36)
                                .background(Theme.background)
                                .overlay(Circle().stroke(s.color, lineWidth: 2))
                                .clipShape(Circle())
                            if cluster.games.count > 1 {
                                Text("\(cluster.games.count)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Theme.primaryForeground)
                                    .frame(minWidth: 16, minHeight: 16)
                                    .background(Theme.primary)
                                    .clipShape(Circle())
                                    .offset(x: 4, y: -4)
                            }
                        }
                    }
                }
            }
        }
        .sheet(item: $selected) { cluster in
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(cluster.games.enumerated()), id: \.element.id) { i, g in
                        if i > 0 { Hairline() }
                        GameCardView(game: g)
                    }
                }
            }
            .presentationDetents([.medium, .large])
        }
        .overlay {
            if pins.isEmpty {
                Text("No games with a map location yet.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(10)
                    .background(Theme.background.opacity(0.9))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            }
        }
    }
}
