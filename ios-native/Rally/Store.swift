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

    // Social data (all scoped to what the signed-in user is allowed to see)
    @Published var people: [Profile] = []
    @Published var threads: [ThreadRow] = []
    @Published var messages: [MessageRow] = []
    @Published var buddies: [Buddy] = []
    @Published var requests: [FriendRequest] = []
    @Published var groups: [RallyGroup] = []
    @Published var groupMembers: [GroupMember] = []
    @Published var joinRequests: [GroupJoinRequest] = []
    @Published var blocks: [BlockRow] = []
    @Published var kudos: [Kudo] = []
    @Published var reads: [ThreadRead] = []
    @Published var localReads: [String: Date] = [:]
    @Published var shownPlayer: PersonRef?

    let api = API.shared

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
        people = []; threads = []; messages = []; buddies = []; requests = []
        groups = []; groupMembers = []; joinRequests = []; blocks = []; kudos = []; reads = []
        localReads = [:]
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
            await reloadSocial()
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
        await reloadSocial()
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

    func createGame(sportKey: String, skill: String, spots: Int, when: Date, location: String, notes: String, groupId: String? = nil, lat: Double? = nil, lng: Double? = nil) async throws {
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
            lat: lat ?? me.lat,
            lng: lng ?? me.lng,
            spots_total: spots,
            skill: skill,
            notes: notes.isEmpty ? nil : notes,
            group_id: groupId
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

    // MARK: - Groups (used by chats and the Groups tab)

    func myRole(in groupId: String) -> String? {
        groupMembers.first { $0.groupId == groupId && $0.userId == userId }?.role
    }

    func members(of groupId: String) -> [GroupMember] {
        groupMembers.filter { $0.groupId == groupId && !isBlocked($0.userId) }
    }

    // MARK: - People, friends, blocks

    var blockedIds: Set<String> {
        Set(blocks.filter { $0.blockerUserId == userId }.map { $0.blockedUserId })
    }

    func isBlocked(_ id: String) -> Bool { blockedIds.contains(id) }

    func person(_ id: String) -> Profile? {
        if id == userId { return profile }
        return people.first { $0.id == id }
    }

    func name(of id: String) -> String { person(id)?.fullName ?? "Someone" }

    var friendIds: Set<String> {
        Set(buddies.filter { $0.userId == userId }.map { $0.buddyUserId })
    }

    var friends: [Profile] {
        friendIds.compactMap { person($0) }.filter { !isBlocked($0.id) }.sorted { $0.fullName < $1.fullName }
    }

    func friendship(with id: String) -> Friendship {
        if friendIds.contains(id) { return .friends }
        if let r = requests.first(where: { $0.status == "pending" && $0.fromUserId == id && $0.toUserId == userId }) {
            return .incoming(r.id)
        }
        if let r = requests.first(where: { $0.status == "pending" && $0.fromUserId == userId && $0.toUserId == id }) {
            return .outgoing(r.id)
        }
        return .none
    }

    var incomingRequests: [RequestItem] {
        requests.filter { $0.status == "pending" && $0.toUserId == userId && !isBlocked($0.fromUserId) }
            .map { RequestItem(req: $0, person: person($0.fromUserId)) }
    }

    var outgoingRequests: [RequestItem] {
        requests.filter { $0.status == "pending" && $0.fromUserId == userId && !isBlocked($0.toUserId) }
            .map { RequestItem(req: $0, person: person($0.toUserId)) }
    }

    /// Same-city people who opted in to being found and aren't friends yet.
    var discoverable: [Profile] {
        guard let me = profile else { return [] }
        let city = (me.city ?? "").trimmingCharacters(in: .whitespaces).lowercased()
        return people.filter { p in
            p.id != me.id && !friendIds.contains(p.id) && !isBlocked(p.id)
                && (p.discoverable ?? true)
                && (city.isEmpty || (p.city ?? "").trimmingCharacters(in: .whitespaces).lowercased() == city)
        }
    }

    func gamesPlayed(by id: String) -> Int {
        let past = Set(allGames.filter { $0.isOver }.map { $0.id })
        return players.filter { $0.userId == id && past.contains($0.gameId) }.count
    }

    func kudosCount(for id: String) -> Int { kudos.filter { $0.toUserId == id }.count }

    func kudosBreakdown(for id: String) -> [String: Int] {
        var out: [String: Int] = [:]
        for k in kudos where k.toUserId == id { out[k.kind, default: 0] += 1 }
        return out
    }

    // MARK: - Loading social data

    func reloadSocial() async {
        guard let uid = userId else { return }
        async let ppl: [Profile] = api.select("profiles")
        async let thr: [ThreadRow] = api.select("threads")
        async let msg: [MessageRow] = api.select("messages", query: [URLQueryItem(name: "order", value: "ts.asc")])
        async let bud: [Buddy] = api.select("buddies", query: [URLQueryItem(name: "user_id", value: "eq.\(uid)")])
        async let req: [FriendRequest] = api.select("friend_requests", query: [URLQueryItem(name: "status", value: "eq.pending")])
        async let grp: [RallyGroup] = api.select("groups", query: [URLQueryItem(name: "order", value: "created_at.desc")])
        async let gm: [GroupMember] = api.select("group_members")
        async let gjr: [GroupJoinRequest] = api.select("group_join_requests")
        async let blk: [BlockRow] = api.select("blocks")
        async let kd: [Kudo] = api.select("kudos")
        async let rd: [ThreadRead] = api.select("thread_reads", query: [URLQueryItem(name: "user_id", value: "eq.\(uid)")])

        // Each list is loaded independently so one failing table doesn't blank the rest.
        people = (try? await ppl) ?? people
        threads = (try? await thr) ?? threads
        messages = (try? await msg) ?? messages
        buddies = (try? await bud) ?? buddies
        requests = (try? await req) ?? requests
        groups = (try? await grp) ?? groups
        groupMembers = (try? await gm) ?? groupMembers
        joinRequests = (try? await gjr) ?? joinRequests
        blocks = (try? await blk) ?? blocks
        kudos = (try? await kd) ?? kudos
        reads = (try? await rd) ?? reads
    }

    /// Lighter refresh used while a chat is open.
    func reloadMessages() async {
        async let thr: [ThreadRow] = api.select("threads")
        async let msg: [MessageRow] = api.select("messages", query: [URLQueryItem(name: "order", value: "ts.asc")])
        threads = (try? await thr) ?? threads
        messages = (try? await msg) ?? messages
    }

    // MARK: - Chats

    func threadKey(_ t: ThreadRow) -> String {
        if t.kind == "game", let g = t.gameId { return "g:\(g)" }
        if t.kind == "group", let g = t.groupId { return "gr:\(g)" }
        let other = t.ownerUserId == userId ? t.peerUserId : t.ownerUserId
        return "dm:\(other ?? "unknown")"
    }

    private var threadKeyById: [String: String] {
        Dictionary(threads.map { ($0.id, threadKey($0)) }, uniquingKeysWith: { a, _ in a })
    }

    var messagesByKey: [String: [MessageRow]] {
        let map = threadKeyById
        var out: [String: [MessageRow]] = [:]
        for m in messages {
            guard let key = map[m.threadId] else { continue }
            if isBlocked(m.authorUserId) { continue }
            out[key, default: []].append(m)
        }
        return out
    }

    func lastRead(_ key: String) -> Date {
        let map = threadKeyById
        var best = localReads[key] ?? .distantPast
        for r in reads {
            if map[r.threadId] == key, let d = parseISODate(r.lastReadAt), d > best { best = d }
        }
        return best
    }

    func unread(_ key: String, in byKey: [String: [MessageRow]]) -> Int {
        let last = lastRead(key)
        return (byKey[key] ?? []).filter { $0.authorUserId != userId && $0.date > last }.count
    }

    var unreadTotal: Int {
        let byKey = messagesByKey
        return byKey.keys.reduce(0) { $0 + unread($1, in: byKey) }
    }

    func markRead(_ key: String) async {
        guard let uid = userId else { return }
        localReads[key] = Date()
        guard let tid = try? await ensureThreadId(key, createIfMissing: false) else { return }
        try? await api.insertDict(
            "thread_reads",
            ["thread_id": tid, "user_id": uid, "last_read_at": isoString(Date())],
            upsertOn: "thread_id,user_id"
        )
    }

    /// Finds (or creates) the database thread behind a chat key.
    func ensureThreadId(_ key: String, createIfMissing: Bool = true) async throws -> String? {
        guard let uid = userId, let me = profile else { return nil }
        let pool = me.pool ?? "adult"

        if let existing = threads.first(where: { threadKey($0) == key }) { return existing.id }

        if key.hasPrefix("g:") {
            let gid = String(key.dropFirst(2))
            let found: [ThreadRow] = try await api.select("threads", query: [
                URLQueryItem(name: "kind", value: "eq.game"), URLQueryItem(name: "game_id", value: "eq.\(gid)")])
            if let t = found.first { return t.id }
            guard createIfMissing else { return nil }
            let title = allGames.first(where: { $0.id == gid })?.location ?? "Game chat"
            return try await api.insertDictReturningId("threads", [
                "pool": pool, "kind": "game", "game_id": gid, "owner_user_id": uid, "title": title])
        } else if key.hasPrefix("gr:") {
            let gid = String(key.dropFirst(3))
            let found: [ThreadRow] = try await api.select("threads", query: [
                URLQueryItem(name: "kind", value: "eq.group"), URLQueryItem(name: "group_id", value: "eq.\(gid)")])
            if let t = found.first { return t.id }
            guard createIfMissing else { return nil }
            let title = groups.first(where: { $0.id == gid })?.name ?? "Group chat"
            return try await api.insertDictReturningId("threads", [
                "pool": pool, "kind": "group", "group_id": gid, "owner_user_id": uid, "title": title])
        } else if key.hasPrefix("dm:") {
            let peer = String(key.dropFirst(3))
            let found: [ThreadRow] = try await api.select("threads", query: [
                URLQueryItem(name: "kind", value: "eq.dm"),
                URLQueryItem(name: "owner_user_id", value: "eq.\(uid)"),
                URLQueryItem(name: "peer_user_id", value: "eq.\(peer)")])
            if let t = found.first { return t.id }
            guard createIfMissing else { return nil }
            return try await api.insertDictReturningId("threads", [
                "pool": pool, "kind": "dm", "owner_user_id": uid, "peer_user_id": peer, "title": name(of: peer)])
        }
        return nil
    }

    func send(_ key: String, text: String, contact: ContactPayload? = nil, attachments: [String] = []) async throws {
        guard let uid = userId, let me = profile else { return }
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.isEmpty && contact == nil && attachments.isEmpty { return }
        guard let tid = try await ensureThreadId(key) else { throw APIError(message: "Couldn't open that chat.") }
        var row: [String: Any?] = [
            "thread_id": tid, "author_user_id": uid, "author_name": me.fullName,
            "text": clean, "pool": me.pool ?? "adult", "kind": contact == nil ? "text" : "contact",
        ]
        if let c = contact { row["payload"] = ["label": c.label ?? "", "value": c.value ?? ""] }
        if !attachments.isEmpty { row["attachments"] = attachments }
        try await api.insertDict("messages", row)
        await reloadMessages()
    }

    func uploadChatPhoto(_ key: String, data: Data) async throws -> String {
        guard let uid = userId else { throw APIError(message: "Not signed in.") }
        let safeKey = key.replacingOccurrences(of: ":", with: "_")
        let path = "\(uid)/\(safeKey)/\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
        try await api.upload(bucket: "chat_photos", path: path, data: data, contentType: "image/jpeg")
        return path
    }

    // MARK: - Friend requests

    func sendFriendRequest(to id: String) async throws {
        guard let uid = userId else { return }
        try await api.insertDict("friend_requests", ["from_user_id": uid, "to_user_id": id])
        await reloadSocial()
    }

    func respond(_ reqId: String, accept: Bool) async throws {
        try await api.updateDict("friend_requests", query: [URLQueryItem(name: "id", value: "eq.\(reqId)")],
                                 ["status": accept ? "accepted" : "declined"])
        await reloadSocial()
    }

    func cancelRequest(_ reqId: String) async throws {
        try await api.delete("friend_requests", query: [URLQueryItem(name: "id", value: "eq.\(reqId)")])
        await reloadSocial()
    }

    func removeFriend(_ id: String) async throws {
        guard let uid = userId else { return }
        try await api.delete("buddies", query: [
            URLQueryItem(name: "user_id", value: "eq.\(uid)"), URLQueryItem(name: "buddy_user_id", value: "eq.\(id)")])
        await reloadSocial()
    }

    // MARK: - Safety

    func block(_ id: String) async throws {
        guard let uid = userId else { return }
        do {
            try await api.insertDict("blocks", ["blocker_user_id": uid, "blocked_user_id": id])
        } catch let e as APIError where e.message.lowercased().contains("duplicate") {
        }
        await reloadSocial()
    }

    func unblock(_ id: String) async throws {
        guard let uid = userId else { return }
        try await api.delete("blocks", query: [
            URLQueryItem(name: "blocker_user_id", value: "eq.\(uid)"), URLQueryItem(name: "blocked_user_id", value: "eq.\(id)")])
        await reloadSocial()
    }

    func report(targetType: String, targetId: String, reason: String, details: String) async throws {
        guard let uid = userId else { return }
        try await api.insertDict("reports", [
            "reporter_user_id": uid, "target_type": targetType, "target_id": targetId,
            "reason": reason, "details": details.isEmpty ? nil : details,
        ])
    }

    // MARK: - Kudos

    func giveKudo(game: String, to id: String, kind: String) async throws {
        guard let uid = userId else { return }
        try await api.insertDict("kudos", ["game_id": game, "from_user_id": uid, "to_user_id": id, "kind": kind, "pool": profile?.pool ?? "adult"])
        await reloadSocial()
    }

    func revokeKudo(_ id: String) async throws {
        try await api.delete("kudos", query: [URLQueryItem(name: "id", value: "eq.\(id)")])
        await reloadSocial()
    }
}

struct PersonRef: Identifiable, Hashable {
    let id: String
}

struct RequestItem: Identifiable {
    let req: FriendRequest
    let person: Profile?
    var id: String { req.id }
}

// MARK: - Group actions

extension Store {
    func pendingRequests(for groupId: String) -> [RequestRow] {
        joinRequests.filter { $0.groupId == groupId && $0.status == "pending" }
            .map { RequestRow(req: $0, person: person($0.userId)) }
    }

    func myJoinStatus(_ groupId: String) -> String? {
        joinRequests.first { $0.groupId == groupId && $0.userId == userId && $0.status == "pending" }?.status
    }

    func gamesIn(group id: String) -> [Game] {
        games.filter { $0.groupId == id }
    }

    func createGroup(name: String, description: String, sports: [String], city: String, isPublic: Bool) async throws {
        guard let uid = userId else { return }
        _ = try await api.insertDictReturningId("groups", [
            "pool": profile?.pool ?? "adult",
            "name": name,
            "description": description.isEmpty ? nil : description,
            "sports": sports,
            "city": city.isEmpty ? nil : city,
            "lat": profile?.lat,
            "lng": profile?.lng,
            "is_public": isPublic,
            "created_by": uid,
        ])
        await reloadSocial()
    }

    func requestToJoin(_ groupId: String) async throws {
        guard let uid = userId else { return }
        try await api.insertDict("group_join_requests", [
            "group_id": groupId, "user_id": uid, "pool": profile?.pool ?? "adult", "status": "pending"])
        await reloadSocial()
    }

    func decide(_ requestId: String, approve: Bool) async throws {
        try await api.updateDict("group_join_requests", query: [URLQueryItem(name: "id", value: "eq.\(requestId)")],
                                 ["status": approve ? "approved" : "denied"])
        await reloadSocial()
    }

    func leaveGroup(_ groupId: String) async throws {
        guard let uid = userId else { return }
        try await removeMember(groupId, uid)
    }

    func removeMember(_ groupId: String, _ uid: String) async throws {
        try await api.delete("group_members", query: [
            URLQueryItem(name: "group_id", value: "eq.\(groupId)"), URLQueryItem(name: "user_id", value: "eq.\(uid)")])
        await reloadSocial()
    }

    func promote(_ groupId: String, _ uid: String) async throws {
        try await api.updateDict("group_members", query: [
            URLQueryItem(name: "group_id", value: "eq.\(groupId)"), URLQueryItem(name: "user_id", value: "eq.\(uid)")],
            ["role": "admin"])
        await reloadSocial()
    }

    func deleteGroup(_ groupId: String) async throws {
        try await api.delete("groups", query: [URLQueryItem(name: "id", value: "eq.\(groupId)")])
        await reloadSocial()
    }

    func createInvite(_ groupId: String) async throws -> String {
        guard let uid = userId else { throw APIError(message: "Not signed in.") }
        let code = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(8)).uppercased()
        try await api.insertDict("group_invites", [
            "group_id": groupId, "code": code, "created_by": uid, "pool": profile?.pool ?? "adult"])
        return code
    }

    func joinWithCode(_ code: String) async throws {
        _ = try await api.rpc("consume_group_invite", ["_code": code])
        await reloadSocial()
    }
}

struct RequestRow: Identifiable {
    let req: GroupJoinRequest
    let person: Profile?
    var id: String { req.id }
}


// MARK: - Past games, activity, profile editing, onboarding

struct ActivityDay: Identifiable {
    let date: Date
    let count: Int
    var id: Date { date }
}

extension Store {
    /// Everyone who played: the host plus anyone who joined.
    func roster(of game: Game) -> [String] {
        var ids = players.filter { $0.gameId == game.id }.compactMap { $0.userId }
        if !ids.contains(game.hostUserId) { ids.append(game.hostUserId) }
        return ids
    }

    /// Finished games I hosted or joined, newest first.
    var pastGames: [Game] {
        allGames
            .filter { $0.isOver && (isHost($0) || isJoined($0)) }
            .sorted { ($0.startDate ?? .distantPast) > ($1.startDate ?? .distantPast) }
    }

    func activity(days: Int = 119) -> [ActivityDay] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        var counts: [Date: Int] = [:]
        for g in pastGames {
            guard let d = g.startDate else { continue }
            counts[cal.startOfDay(for: d), default: 0] += 1
        }
        return (0..<days).reversed().compactMap { i in
            guard let day = cal.date(byAdding: .day, value: -i, to: today) else { return nil }
            return ActivityDay(date: day, count: counts[day] ?? 0)
        }
    }

    var streak: Int {
        var s = 0
        for d in activity().reversed() {
            if d.count > 0 { s += 1 } else { break }
        }
        return s
    }

    // Kudos helpers
    func kudo(game: String, to id: String, kind: String) -> Kudo? {
        kudos.first { $0.gameId == game && $0.fromUserId == userId && $0.toUserId == id && $0.kind == kind }
    }

    // Profile editing
    func reloadProfile() async {
        guard let uid = userId else { return }
        if let rows: [Profile] = try? await api.select("profiles", query: [URLQueryItem(name: "id", value: "eq.\(uid)")]),
           let me = rows.first {
            profile = me
        }
    }

    func updateProfile(_ patch: [String: Any?]) async throws {
        guard let uid = userId else { return }
        try await api.updateDict("profiles", query: [URLQueryItem(name: "id", value: "eq.\(uid)")], patch)
        await reloadProfile()
    }

    func uploadAvatar(jpeg: Data) async throws {
        guard let uid = userId else { return }
        let path = "\(uid)/avatar-\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
        try await api.upload(bucket: "avatars", path: path, data: jpeg, contentType: "image/jpeg", upsert: true)
        try await updateProfile(["avatar_url": path])
    }

    func removeAvatar() async throws {
        if let old = profile?.avatarUrl { await api.removeObjects(bucket: "avatars", paths: [old]) }
        try await updateProfile(["avatar_url": nil])
    }

    func completeOnboarding(dob: String, city: String, lat: Double, lng: Double, sports: [String: String]) async throws {
        guard let uid = userId else { return }
        let name = await api.currentUserName() ?? "Rally player"
        try await api.insertDict("profiles", [
            "id": uid, "full_name": name, "dob": dob, "pool": "adult",
            "city": city, "lat": lat, "lng": lng, "sports": sports, "avatar_seed": name,
        ])
        await loadAll()
    }
}
