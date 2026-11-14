import SwiftUI
import MapKit

struct PlaceResult: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let subtitle: String
    let city: String
    let lat: Double
    let lng: Double
}

enum PlaceSearch {
    /// Searches Apple Maps for a place, preferring results near `near`.
    static func search(_ query: String, near: (Double, Double)?) async -> [PlaceResult] {
        let req = MKLocalSearch.Request()
        req.naturalLanguageQuery = query
        if let n = near {
            req.region = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: n.0, longitude: n.1),
                span: MKCoordinateSpan(latitudeDelta: 0.8, longitudeDelta: 0.8)
            )
        }
        guard let res = try? await MKLocalSearch(request: req).start() else { return [] }
        return res.mapItems.prefix(8).map { item in
            let pm = item.placemark
            let city = pm.locality ?? pm.subAdministrativeArea ?? pm.administrativeArea ?? item.name ?? query
            let sub = [pm.thoroughfare, pm.locality].compactMap { $0 }.joined(separator: ", ")
            return PlaceResult(
                name: item.name ?? pm.name ?? query, subtitle: sub, city: city,
                lat: pm.coordinate.latitude, lng: pm.coordinate.longitude
            )
        }
    }
}

/// Text field with live place suggestions underneath.
struct PlaceField: View {
    let placeholder: String
    @Binding var text: String
    @Binding var selected: PlaceResult?
    var near: (Double, Double)? = nil

    @State private var results: [PlaceResult] = []
    @State private var task: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            TextField(placeholder, text: $text)
                .onChange(of: text) { _, new in
                    if let s = selected, s.name != new { selected = nil }
                    task?.cancel()
                    guard new.count >= 2, selected == nil else { results = []; return }
                    task = Task {
                        try? await Task.sleep(nanoseconds: 350_000_000)
                        if Task.isCancelled { return }
                        let r = await PlaceSearch.search(new, near: near)
                        if !Task.isCancelled { results = r }
                    }
                }
            ForEach(results) { r in
                Divider().padding(.top, 8)
                Button {
                    selected = r
                    text = r.name
                    results = []
                } label: {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(r.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.foreground)
                        if !r.subtitle.isEmpty {
                            Text(r.subtitle).font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Nearby courts & parks (OpenStreetMap, same source as the website)

struct NearbyPlace: Identifiable {
    let id: String
    let name: String
    let type: String
    let lat: Double
    let lng: Double
    let address: String?
    let distanceM: Double
    let sportTag: String?
}

private struct OverpassResponse: Decodable {
    struct Element: Decodable {
        let type: String
        let id: Int
        let lat: Double?
        let lon: Double?
        let center: Center?
        let tags: [String: String]?
    }
    struct Center: Decodable { let lat: Double; let lon: Double }
    let elements: [Element]
}

enum NearbyPlaces {
    private static let sportTags: [String: String] = [
        "tennis": "tennis", "pickleball": "pickleball", "basketball": "basketball",
        "soccer": "soccer", "volleyball": "volleyball|beachvolleyball", "badminton": "badminton",
        "running": "running|athletics", "cycling": "cycling|bmx",
    ]

    static func fetch(lat: Double, lng: Double, radiusM: Int, sport: String?, limit: Int = 40) async throws -> [NearbyPlace] {
        let around = "(around:\(radiusM),\(lat),\(lng))"
        let query: String
        if let sport, let tag = sportTags[sport] {
            let f = "[sport~\"\(tag)\"]"
            let track = (sport == "running" || sport == "cycling") ? "nwr\(around)[leisure=track];" : ""
            query = "[out:json][timeout:20];(nwr\(around)[leisure=pitch]\(f);nwr\(around)[leisure=sports_centre]\(f);nwr\(around)[leisure=fitness_centre]\(f);\(track));out center \(limit);"
        } else {
            query = "[out:json][timeout:20];(nwr\(around)[leisure=pitch];nwr\(around)[leisure=sports_centre];nwr\(around)[leisure=fitness_centre];nwr\(around)[leisure=park];nwr\(around)[leisure=stadium];);out center \(limit);"
        }

        var response: OverpassResponse?
        for endpoint in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"] {
            guard let url = URL(string: endpoint) else { continue }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.httpBody = query.data(using: .utf8)
            req.setValue("text/plain;charset=UTF-8", forHTTPHeaderField: "Content-Type")
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let r = try? JSONDecoder().decode(OverpassResponse.self, from: data) {
                response = r
                break
            }
        }
        guard let response else { throw APIError(message: "Couldn't load nearby places. Try again.") }

        var seen = Set<String>()
        var out: [NearbyPlace] = []
        for el in response.elements {
            let pt: (Double, Double)
            if let a = el.lat, let b = el.lon { pt = (a, b) }
            else if let c = el.center { pt = (c.lat, c.lon) }
            else { continue }
            let tags = el.tags ?? [:]
            guard let name = tags["name"]?.trimmingCharacters(in: .whitespaces), !name.isEmpty else { continue }
            let key = "\(name)|\(String(format: "%.4f", pt.0))|\(String(format: "%.4f", pt.1))"
            if !seen.insert(key).inserted { continue }
            let addr = [[tags["addr:housenumber"], tags["addr:street"]].compactMap { $0 }.joined(separator: " "), tags["addr:city"] ?? ""]
                .filter { !$0.isEmpty }.joined(separator: ", ")
            out.append(NearbyPlace(
                id: "\(el.type.prefix(1))\(el.id)", name: name, type: prettyType(tags),
                lat: pt.0, lng: pt.1, address: addr.isEmpty ? nil : addr,
                distanceM: haversineMiles(lat, lng, pt.0, pt.1) * 1609.34, sportTag: tags["sport"]
            ))
        }
        return Array(out.sorted { $0.distanceM < $1.distanceM }.prefix(limit))
    }

    private static func prettyType(_ t: [String: String]) -> String {
        if let s = t["sport"]?.split(separator: ";").first.map(String.init) {
            let nice = s.prefix(1).uppercased() + s.dropFirst()
            if t["leisure"] == "pitch" { return "\(nice) court" }
            if t["leisure"] == "sports_centre" { return "\(nice) centre" }
            return nice
        }
        switch t["leisure"] {
        case "park": return "Park"
        case "pitch": return "Sports pitch"
        case "sports_centre": return "Sports centre"
        case "stadium": return "Stadium"
        case "fitness_centre": return "Gym"
        default: return t["leisure"] ?? "Venue"
        }
    }
}

struct NearbyPlacesView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss

    @State private var sportFilter: String?
    @State private var radiusKm = 4
    @State private var places: [NearbyPlace] = []
    @State private var loading = true
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Text("Live results from OpenStreetMap · within \(radiusKm) km")
                    .font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16).padding(.top, 8)
                SportChips(selection: $sportFilter).padding(.vertical, 10)
                Picker("Radius", selection: $radiusKm) {
                    ForEach([2, 4, 8, 15], id: \.self) { Text("\($0) km").tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16).padding(.bottom, 8)
                Hairline()
                ScrollView {
                    if loading {
                        ProgressView().padding(40)
                    } else if let errorText {
                        EmptyNote(text: errorText)
                    } else if places.isEmpty {
                        EmptyNote(text: "Nothing found. Try a bigger radius or a different sport.")
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(places) { p in
                                row(p)
                                Hairline()
                            }
                        }
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Courts & parks near you")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
            .task(id: "\(sportFilter ?? "all")-\(radiusKm)") { await load() }
        }
    }

    private func row(_ p: NearbyPlace) -> some View {
        let s = allSports.first { p.sportTag?.contains($0.key) == true }
        return HStack(spacing: 12) {
            Text(s?.emoji ?? "📍")
                .frame(width: 44, height: 44)
                .background((s?.color ?? Theme.muted).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            VStack(alignment: .leading, spacing: 2) {
                Text(p.name).font(.system(size: 15, weight: .bold)).lineLimit(1)
                Text("\(p.type) · \(distance(p.distanceM))" + (p.address.map { " · \($0)" } ?? ""))
                    .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground).lineLimit(2)
            }
            Spacer()
            Link(destination: URL(string: "http://maps.apple.com/?daddr=\(p.lat),\(p.lng)&dirflg=d")!) {
                Image(systemName: "arrow.triangle.turn.up.right.circle.fill").font(.system(size: 26))
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }

    private func distance(_ m: Double) -> String {
        if m < 950 { return "\(Int(m.rounded())) m" }
        let km = m / 1000
        return String(format: km < 10 ? "%.1f km" : "%.0f km", km)
    }

    private func load() async {
        guard let lat = store.profile?.lat, let lng = store.profile?.lng else {
            loading = false
            errorText = "Add your city in your profile to see places near you."
            return
        }
        loading = true
        errorText = nil
        do {
            places = try await NearbyPlaces.fetch(lat: lat, lng: lng, radiusM: radiusKm * 1000, sport: sportFilter)
        } catch {
            errorText = error.localizedDescription
        }
        loading = false
    }
}
