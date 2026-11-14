import SwiftUI

struct Sport: Identifiable, Hashable {
    let key: String
    let name: String
    let emoji: String
    let tint: UInt32
    var id: String { key }
    var color: Color { Color(hex: tint) }
}

let allSports: [Sport] = [
    Sport(key: "volleyball", name: "Volleyball", emoji: "🏐", tint: 0xF59E0B),
    Sport(key: "soccer", name: "Soccer", emoji: "⚽", tint: 0x16A34A),
    Sport(key: "tennis", name: "Tennis", emoji: "🎾", tint: 0x84CC16),
    Sport(key: "pickleball", name: "Pickleball", emoji: "🥒", tint: 0x0EA5E9),
    Sport(key: "basketball", name: "Basketball", emoji: "🏀", tint: 0xF97316),
    Sport(key: "badminton", name: "Badminton", emoji: "🏸", tint: 0x8B5CF6),
    Sport(key: "running", name: "Running", emoji: "🏃", tint: 0xEF4444),
    Sport(key: "cycling", name: "Cycling", emoji: "🚴", tint: 0x14B8A6),
]

func sport(for key: String) -> Sport {
    allSports.first(where: { $0.key == key }) ?? allSports[0]
}

let skillLevels = ["Beginner", "Intermediate", "Advanced"]
