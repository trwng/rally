import Foundation

struct Profile: Codable, Identifiable {
    let id: String
    var fullName: String
    var dob: String?
    var pool: String?
    var city: String?
    var lat: Double?
    var lng: Double?
    var sports: [String: String]?
    var avatarSeed: String?
    var avatarUrl: String?
    var bio: String?
    var createdAt: String?
    var discoverable: Bool?
    var showActivity: Bool?
    var showLocation: Bool?
    var showSports: Bool?
    var showSkill: Bool?
    var phone: String?
    var instagram: String?
    var snapchat: String?
    var otherSocial: String?

    var firstName: String { fullName.split(separator: " ").first.map(String.init) ?? fullName }
}

struct Game: Codable, Identifiable, Hashable {
    let id: String
    var pool: String?
    var sport: String
    var hostUserId: String
    var hostName: String
    var hostAvatarSeed: String?
    var whenLabel: String
    var whenAt: String?
    var location: String
    var lat: Double?
    var lng: Double?
    var spotsTotal: Int
    var spotsTaken: Int
    var skill: String?
    var notes: String?
    var isPast: Bool?
    var createdAt: String?

    var spotsLeft: Int { spotsTotal - spotsTaken }
    var isFull: Bool { spotsLeft <= 0 }
    var startDate: Date? { whenAt.flatMap(parseISODate) }

    /// A game is past once the host ended it or its start time has gone by.
    var isOver: Bool {
        if isPast == true { return true }
        if let d = startDate { return d < Date() }
        return false
    }

    /// Active from 15 minutes before start until 3 hours after.
    var isActive: Bool {
        guard let d = startDate else { return false }
        let now = Date()
        return now >= d.addingTimeInterval(-15 * 60) && now <= d.addingTimeInterval(3 * 3600)
    }
}

struct GamePlayer: Codable, Hashable {
    var gameId: String
    var userId: String?
    var pool: String?
}

struct NewGameRow: Encodable {
    var pool: String
    var sport: String
    var host_user_id: String
    var host_name: String
    var host_avatar_seed: String
    var when_label: String
    var when_at: String
    var location: String
    var lat: Double?
    var lng: Double?
    var spots_total: Int
    var spots_taken: Int = 1
    var skill: String
    var notes: String?
    var is_past: Bool = false
}

struct IdRow: Decodable { let id: String }

private let isoWithFraction: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()
private let isoPlain = ISO8601DateFormatter()

func parseISODate(_ s: String) -> Date? {
    isoWithFraction.date(from: s) ?? isoPlain.date(from: s)
}

func isoString(_ d: Date) -> String { isoWithFraction.string(from: d) }

// MARK: - Helpers shared with the website

func initials(of name: String) -> String {
    let parts = name.split(separator: " ").compactMap { $0.first }
    return String(parts.prefix(2)).uppercased()
}

private let avatarColors: [UInt32] = [
    0x16A34A, 0x0EA5E9, 0xF59E0B, 0xEF4444, 0x8B5CF6, 0xEC4899, 0x14B8A6, 0xF97316,
]

/// Same hash as the website so a person keeps the same avatar color.
func avatarColorHex(seed: String) -> UInt32 {
    var h: Int32 = 0
    for u in seed.utf16 { h = h &* 31 &+ Int32(u) }
    let idx = Int(Int64(h).magnitude % UInt64(avatarColors.count))
    return avatarColors[idx]
}

func haversineMiles(_ aLat: Double, _ aLng: Double, _ bLat: Double, _ bLng: Double) -> Double {
    let r = 3958.8
    func rad(_ d: Double) -> Double { d * .pi / 180 }
    let dLat = rad(bLat - aLat)
    let dLng = rad(bLng - aLng)
    let s = pow(sin(dLat / 2), 2) + cos(rad(aLat)) * cos(rad(bLat)) * pow(sin(dLng / 2), 2)
    return 2 * r * asin(sqrt(s))
}

func ageFromDOB(_ dob: String) -> Int? {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.locale = Locale(identifier: "en_US_POSIX")
    guard let d = f.date(from: String(dob.prefix(10))) else { return nil }
    return Calendar.current.dateComponents([.year], from: d, to: Date()).year
}


// MARK: - Social models

struct ThreadRow: Codable, Identifiable, Hashable {
    let id: String
    var pool: String?
    var kind: String
    var gameId: String?
    var groupId: String?
    var ownerUserId: String?
    var peerUserId: String?
    var title: String?
    var createdAt: String?
}

struct ContactPayload: Codable, Hashable {
    var label: String?
    var value: String?
}

struct MessageRow: Codable, Identifiable, Hashable {
    let id: String
    var threadId: String
    var authorUserId: String
    var authorName: String
    var text: String
    var ts: String
    var kind: String?
    var payload: ContactPayload?
    var attachments: [String]?

    var date: Date { parseISODate(ts) ?? Date() }
}

struct Buddy: Codable, Hashable {
    var userId: String
    var buddyUserId: String
}

struct FriendRequest: Codable, Identifiable, Hashable {
    let id: String
    var fromUserId: String
    var toUserId: String
    var status: String
    var createdAt: String?
}

struct RallyGroup: Codable, Identifiable, Hashable {
    let id: String
    var pool: String?
    var name: String
    var description: String?
    var sports: [String]?
    var photoUrl: String?
    var city: String?
    var lat: Double?
    var lng: Double?
    var isPublic: Bool?
    var createdBy: String
    var createdAt: String?
}

struct GroupMember: Codable, Hashable {
    var groupId: String
    var userId: String
    var role: String
}

struct GroupJoinRequest: Codable, Identifiable, Hashable {
    let id: String
    var groupId: String
    var userId: String
    var status: String
}

struct GroupInvite: Codable, Identifiable, Hashable {
    let id: String
    var groupId: String
    var code: String
}

struct ThreadRead: Codable, Hashable {
    var threadId: String
    var userId: String
    var lastReadAt: String
}

struct BlockRow: Codable, Hashable {
    var blockerUserId: String
    var blockedUserId: String
}

struct Kudo: Codable, Identifiable, Hashable {
    let id: String
    var gameId: String
    var fromUserId: String
    var toUserId: String
    var kind: String
}

struct KudoKind: Identifiable {
    let key: String
    let label: String
    let emoji: String
    var id: String { key }
}

let kudoKinds: [KudoKind] = [
    KudoKind(key: "good_sport", label: "Good sport", emoji: "🤝"),
    KudoKind(key: "skilled", label: "Skilled", emoji: "⭐"),
    KudoKind(key: "friendly", label: "Friendly", emoji: "😊"),
    KudoKind(key: "on_time", label: "On time", emoji: "⏱️"),
    KudoKind(key: "great_teammate", label: "Great teammate", emoji: "🙌"),
]

enum Friendship: Equatable {
    case none, friends
    case incoming(String)
    case outgoing(String)
}

/// A chat is identified the same way as on the website:
/// `g:<gameId>`, `gr:<groupId>` or `dm:<otherUserId>`.
func relativeShort(_ d: Date) -> String {
    let m = Int(Date().timeIntervalSince(d) / 60)
    if m < 1 { return "now" }
    if m < 60 { return "\(m)m" }
    let h = m / 60
    if h < 24 { return "\(h)h" }
    return "\(h / 24)d"
}
