import Foundation
import SwiftUI
import Combine

@MainActor
final class Store: ObservableObject {
    enum Phase { case loading, signedOut, needsProfile, ready }

    @Published var phase: Phase = .loading
    @Published var profile: Profile?
    @Published var allGames: [Game] = []
    @Published var players: [GamePlayer] = []
    @Published var loadError: String?

    private let api = API.shared

    var userId: String? { api.session?.userId }

    // MARK: Derived data

    /// Games that haven't been played yet.
    var games: [Game] {
        allGames.filter { !$0.isOver }
    }

    var joinedIds: Set<String> {
        Set(players.filter { $0.userId == userId }.map { $0.gameId })
    }

    func isHost(_ g: Game) -> Bool { g.hostUserId == userId }
    func isJoined(_ g: Game) -> Bool { joinedIds.contains(g.id) }

    /// My upcoming games, active ones first.
    var upcoming: [Game] {
        games
            .filter { isHost($0) || isJoined($0) }
            .sorted { a, b in
                if a.isActive != b.isActive { return a.isActive }
                return (a.startDate ?? .distantFuture) < (b.startDate ?? .distantFuture)
            }
    }

    var playedCount: Int {
        let past = Set(allGames.filter { $0.isOver }.map { $0.id })
        return players.filter { $0.userId == userId && past.contains($0.gameId) }.count
    }

    var suggested: [Game] {
        let mine = Set((profile?.sports ?? [:]).keys)
        return games
            .filter { mine.contains($0.sport) && !isJoined($0) && !isHost($0) && !$0.isFull }
            .prefix(3)
            .map { $0 }
    }

    func distanceLabel(_ g: Game) -> String {
        guard let p = profile, let a = p.lat, let b = p.lng, let gl = g.lat, let gn = g.lng else { return "—" }
        return String(format: "%.1f mi", haversineMiles(a, b, gl, gn))
    }

    // MARK: Auth

    func start() async {
        guard api.session != nil else { phase = .signedOut; return }
        // The saved access token may have expired, so refresh before loading.
        if await api.refresh() {
            await loadAll()
        } else {
            api.signOut()
            phase = .signedOut
        }
    }

    func signIn(email: String, password: String) async throws {
        try await api.signIn(email: email, password: password)
        phase = .loading
        await loadAll()
    }

    /// Returns true when the user is now signed in, false when they must confirm by email first.
    func signUp(email: String, password: String, name: String) async throws -> Bool {
        let signedIn = try await api.signUp(email: email, password: password, fullName: name)
        if signedIn {
            phase = .loading
            await loadAll()
        }
        return signedIn
    }

    func signOut() {
        api.signOut()
        profile = nil
        allGames = []
        players = []
        phase = .signedOut
    }

    // MARK: Loading

    func loadAll() async {
        guard let uid = userId else { phase = .signedOut; return }
        do {
            let profiles: [Profile] = try await api.select(
                "profiles", query: [URLQueryItem(name: "id", value: "eq.\(uid)")]
            )
            guard let me = profiles.first else {
                profile = nil
                phase = .needsProfile
                return
            }
            profile = me
            try await reloadGames()
            phase = .ready
        } catch {
            loadError = error.localizedDescription
            // Keep whatever we had; only fall back to the sign-in screen if we have nothing.
            if profile == nil { phase = .signedOut }
        }
    }

    func reloadGames() async throws {
        async let g: [Game] = api.select("games", query: [URLQueryItem(name: "order", value: "created_at.desc")])
        async let p: [GamePlayer] = api.select("game_players")
        allGames = try await g
        players = try await p
    }

    func refresh() async {
        do { try await reloadGames() } catch { loadError = error.localizedDescription }
    }

    // MARK: Actions

    func join(_ g: Game) async throws {
        guard let uid = userId else { return }
        struct Row: Encodable { let game_id: String; let user_id: String; let pool: String }
        try await api.insert("game_players", body: Row(game_id: g.id, user_id: uid, pool: profile?.pool ?? g.pool ?? "adult"))
        try await reloadGames()
    }

    func leave(_ g: Game) async throws {
        guard let uid = userId else { return }
        try await api.delete("game_players", query: [
            URLQueryItem(name: "game_id", value: "eq.\(g.id)"),
            URLQueryItem(name: "user_id", value: "eq.\(uid)"),
        ])
        try await reloadGames()
    }

    func cancel(_ g: Game) async throws {
        try await api.delete("games", query: [URLQueryItem(name: "id", value: "eq.\(g.id)")])
        try await reloadGames()
    }

    func end(_ g: Game) async throws {
        struct Patch: Encodable { let is_past: Bool }
        try await api.update("games", query: [URLQueryItem(name: "id", value: "eq.\(g.id)")], body: Patch(is_past: true))
        try await reloadGames()
    }

    func createGame(sportKey: String, skill: String, spots: Int, when: Date, location: String, notes: String) async throws {
        guard let uid = userId, let me = profile else { return }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d · h:mm a"
        let row = NewGameRow(
            pool: me.pool ?? "adult",
            sport: sportKey,
            host_user_id: uid,
            host_name: me.fullName,
            host_avatar_seed: me.avatarSeed ?? uid,
            when_label: f.string(from: when),
            when_at: isoString(when),
            location: location,
            lat: me.lat,
            lng: me.lng,
            spots_total: spots,
            skill: skill,
            notes: notes.isEmpty ? nil : notes
        )
        let gameId = try await api.insertReturningId("games", body: row)

        // Every game gets a group-chat thread (used by the Chats tab).
        struct Thread: Encodable {
            let pool: String; let kind: String; let game_id: String
            let owner_user_id: String; let title: String
        }
        try? await api.insert("threads", body: Thread(
            pool: me.pool ?? "adult", kind: "game", game_id: gameId, owner_user_id: uid, title: location
        ))
        try await reloadGames()
    }
}
