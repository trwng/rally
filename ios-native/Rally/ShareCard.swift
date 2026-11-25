import SwiftUI
import UIKit

// MARK: - What goes on a card

enum ShareStyle: String, CaseIterable, Identifiable {
    case sticker, story, square
    var id: String { rawValue }
    var title: String {
        switch self {
        case .sticker: return "Sticker"
        case .story: return "Story"
        case .square: return "Square"
        }
    }
    var canvas: CGSize {
        switch self {
        case .sticker: return CGSize(width: 300, height: 400)
        case .story: return CGSize(width: 360, height: 640)
        case .square: return CGSize(width: 360, height: 360)
        }
    }
}

struct SharePerson: Identifiable {
    let id: String
    let name: String
    let seed: String
}

struct ShareCardData {
    var sportName: String
    var emoji: String
    var dateText: String
    var durationText: String?
    var players: Int
    var people: [SharePerson]   // first names only, never includes you or blocked users
    var showPeople: Bool
}

extension Store {
    /// Builds the content of a share card for one finished game.
    func shareCardData(for g: Game, showPeople: Bool) -> ShareCardData {
        let s = sport(for: g.sport)
        let ids = roster(of: g).filter { !isBlocked($0) }
        let others = ids.filter { $0 != userId }
        let people = others.map { id -> SharePerson in
            let p = person(id)
            return SharePerson(id: id, name: p?.firstName ?? "Someone", seed: p?.avatarSeed ?? p?.id ?? id)
        }
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        return ShareCardData(
            sportName: s.name,
            emoji: s.emoji,
            dateText: g.startDate.map { f.string(from: $0) } ?? g.whenLabel,
            durationText: g.durationMinutes.map(formatDuration),
            players: ids.count,
            people: people,
            showPeople: showPeople
        )
    }
}

func formatDuration(_ minutes: Int) -> String {
    let h = minutes / 60, m = minutes % 60
    if h == 0 { return "\(m)m" }
    if m == 0 { return "\(h)h" }
    return "\(h)h \(m)m"
}

// MARK: - The card itself

/// Fixed colors on purpose: the card is turned into an image, so it can't follow light/dark mode.
struct ShareCardView: View {
    let data: ShareCardData
    let style: ShareStyle

    private var ink: Color { style == .square ? Color(hex: 0x0A0F0B) : .white }
    private var soft: Color { style == .square ? Color(hex: 0x5A5F5B) : Color.white.opacity(0.85) }
    private var ring: Color { style == .story ? Color(hex: 0x060A07) : (style == .square ? .white : Color.white) }

    var body: some View {
        content
            .frame(width: style.canvas.width, height: style.canvas.height)
            .background(background)
            .environment(\.colorScheme, .light)
    }

    @ViewBuilder private var background: some View {
        switch style {
        case .sticker: Color.clear
        case .story: Color(hex: 0x060A07)
        case .square: Color.white
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Text(data.emoji).font(.system(size: 22))
                Text(data.sportName).font(.system(size: 22, weight: .heavy))
            }
            .padding(.bottom, 14)

            if let t = data.durationText {
                label("Time played")
                timeView(t).padding(.top, 2)
            } else {
                label("Date")
                Text(data.dateText).font(.system(size: 34, weight: .heavy)).padding(.top, 2)
            }

            if style != .square {
                label("Players").padding(.top, 16)
                Text("\(data.players)").font(.system(size: 30, weight: .heavy)).padding(.top, 2)
            }

            if data.showPeople && !data.people.isEmpty {
                label("Played with").padding(.top, 16)
                avatarRow.padding(.top, 8)
                Text(namesText)
                    .font(.system(size: 15, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.top, 8)
                    .padding(.horizontal, 24)
            }

            HStack(spacing: 7) {
                Text("R")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(
                        LinearGradient(colors: [Color(hex: 0x35BB58), Color(hex: 0x009B39)], startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: RoundedRectangle(cornerRadius: 6)
                    )
                Text("Rally").font(.system(size: 17, weight: .heavy))
            }
            .padding(.top, 22)
        }
        .foregroundStyle(ink)
        .shadow(color: style == .sticker ? Color.black.opacity(0.4) : Color.clear, radius: 7, y: 1)
    }

    private func label(_ s: String) -> some View {
        Text(s).font(.system(size: 14, weight: .semibold)).foregroundStyle(soft)
    }

    /// "1h 30m" with the units smaller.
    private func timeView(_ t: String) -> some View {
        let parts = t.split(separator: " ").map(String.init)
        return HStack(alignment: .firstTextBaseline, spacing: 6) {
            ForEach(parts, id: \.self) { p in
                let unit = String(p.last ?? "m")
                let num = String(p.dropLast())
                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    Text(num).font(.system(size: 48, weight: .heavy))
                    Text(unit).font(.system(size: 24, weight: .bold)).opacity(0.8)
                }
            }
        }
    }

    private var avatarRow: some View {
        let shown = Array(data.people.prefix(4))
        let extra = data.people.count - shown.count
        return HStack(spacing: -8) {
            ForEach(shown) { p in
                Text(initials(of: p.name))
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(hex: avatarColorHex(seed: p.seed)), in: Circle())
                    .overlay(Circle().stroke(ring, lineWidth: 2))
            }
            if extra > 0 {
                Text("+\(extra)")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color(hex: 0x555555), in: Circle())
                    .overlay(Circle().stroke(ring, lineWidth: 2))
            }
        }
    }

    private var namesText: String {
        let names = data.people.map { $0.name }
        if names.count <= 3 { return names.joined(separator: ", ") }
        return names.prefix(3).joined(separator: ", ") + " +\(names.count - 3)"
    }
}

// MARK: - Turning it into an image and sending it out

@MainActor
func renderShareImage(_ data: ShareCardData, style: ShareStyle) -> UIImage? {
    let renderer = ImageRenderer(content: ShareCardView(data: data, style: style))
    renderer.scale = 3
    renderer.isOpaque = style != .sticker   // keep the sticker see-through
    return renderer.uiImage
}

/// Hands the image to Instagram's Story editor. Returns false if Instagram isn't installed.
@MainActor
func openInstagramStory(image: UIImage, asSticker: Bool) async -> Bool {
    guard let png = image.pngData() else { return false }
    var urlString = "instagram-stories://share"
    if !Config.metaAppID.isEmpty { urlString += "?source_application=\(Config.metaAppID)" }
    guard let url = URL(string: urlString) else { return false }
    let key = asSticker ? "com.instagram.sharedSticker.stickerImage" : "com.instagram.sharedSticker.backgroundImage"
    UIPasteboard.general.setItems([[key: png]], options: [.expirationDate: Date().addingTimeInterval(300)])
    return await UIApplication.shared.open(url)
}

// MARK: - The share sheet

struct ShareGameSheet: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    let game: Game

    @State private var style: ShareStyle = .sticker
    @State private var showPeople = true
    @State private var image: UIImage?
    @State private var message: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Picker("Style", selection: $style) {
                        ForEach(ShareStyle.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    preview

                    Text(blurb).font(.system(size: 12.5)).foregroundStyle(Theme.mutedForeground)
                        .multilineTextAlignment(.center)

                    Toggle("Show who I played with", isOn: $showPeople)
                        .font(.system(size: 14, weight: .medium))
                        .tint(Theme.primary)

                    VStack(spacing: 8) {
                        if style != .square {
                            Button { Task { await instagram() } } label: {
                                Label("Instagram Story", systemImage: "camera")
                            }
                            .buttonStyle(PrimaryButtonStyle())
                        }
                        if let image {
                            ShareLink(
                                item: Image(uiImage: image),
                                preview: SharePreview("My game on Rally", image: Image(uiImage: image))
                            ) {
                                Label("Save or share…", systemImage: "square.and.arrow.up")
                            }
                            .buttonStyle(PrimaryButtonStyle(filled: false))
                        }
                    }
                    if let message {
                        Text(message).font(.system(size: 12.5)).foregroundStyle(Theme.destructive).multilineTextAlignment(.center)
                    }
                }
                .padding(16)
            }
            .background(Theme.background)
            .navigationTitle("Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() } } }
        }
        .onAppear(perform: rerender)
        .onChange(of: style) { _, _ in rerender() }
        .onChange(of: showPeople) { _, _ in rerender() }
    }

    private var preview: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 380)
            } else {
                ProgressView().frame(height: 200)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(style == .sticker ? Color(white: 0.2) : Theme.muted, in: RoundedRectangle(cornerRadius: Theme.radius))
    }

    private var blurb: String {
        switch style {
        case .sticker: return "A see-through sticker. In Instagram you can drop it on top of your own photo."
        case .story: return "A ready-made 9:16 Story image."
        case .square: return "A square post for your feed or a message."
        }
    }

    private func rerender() {
        let data = store.shareCardData(for: game, showPeople: showPeople)
        image = renderShareImage(data, style: style)
    }

    private func instagram() async {
        guard let image else { return }
        message = nil
        let ok = await openInstagramStory(image: image, asSticker: style == .sticker)
        if !ok { message = "Couldn't open Instagram. Use \"Save or share…\" instead." }
    }
}
