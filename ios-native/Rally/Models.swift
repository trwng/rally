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
