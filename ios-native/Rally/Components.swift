import SwiftUI

struct AvatarView: View {
    let name: String
    let seed: String
    var path: String? = nil
    var size: CGFloat = 40

    @State private var url: URL?

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .task(id: path) {
            guard let path, !path.isEmpty else { url = nil; return }
            url = await API.shared.signedAvatarURL(path: path)
        }
    }

    private var fallback: some View {
        ZStack {
            Color(hex: avatarColorHex(seed: seed))
            Text(initials(of: name))
                .font(.system(size: size * 0.4, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}

struct SportChips: View {
    @Binding var selection: String?   // nil = all

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                chip(title: "All", emoji: nil, key: nil)
                ForEach(allSports) { s in
                    chip(title: s.name, emoji: s.emoji, key: s.key)
                }
            }
            .padding(.horizontal, 16)
        }
        .scrollIndicators(.hidden)
    }

    private func chip(title: String, emoji: String?, key: String?) -> some View {
        let on = selection == key
        return Button {
            selection = key
        } label: {
            HStack(spacing: 5) {
                if let emoji { Text(emoji) }
                Text(title).font(.system(size: 13, weight: .semibold))
            }
            .padding(.horizontal, 12)
            .frame(height: 34)
            .foregroundStyle(on ? Theme.primaryForeground : Theme.foreground)
            .background(on ? Theme.foreground : Theme.background)
            .overlay(Capsule().stroke(on ? Color.clear : Theme.border, lineWidth: 1))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct SectionHeading: View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some View {
        Text(title).font(.system(size: 18, weight: .black))
    }
}

struct Hairline: View {
    var body: some View { Rectangle().fill(Theme.border).frame(height: 1) }
}

struct EmptyNote: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(Theme.mutedForeground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
    }
}

/// Avatar for a profile (photo if they have one, otherwise colored initials).
struct PersonAvatar: View {
    let profile: Profile?
    var fallbackName = "?"
    var size: CGFloat = 40
    var body: some View {
        AvatarView(
            name: profile?.fullName ?? fallbackName,
            seed: profile?.avatarSeed ?? profile?.id ?? fallbackName,
            path: profile?.avatarUrl,
            size: size
        )
    }
}

/// Tappable name/avatar that opens that player's profile.
extension Store {
    func openPlayer(_ id: String) {
        if id == userId { return }
        shownPlayer = PersonRef(id: id)
    }
}

struct ChatImage: View {
    let path: String
    @State private var url: URL?
    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        Theme.muted
                    }
                }
            } else {
                Theme.muted
            }
        }
        .frame(width: 200, height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .task { url = await API.shared.signedURL(bucket: "chat_photos", path: path) }
    }
}

import UIKit

/// Shrinks a picked photo and turns it into JPEG data for upload.
func compressedJPEG(from data: Data, maxSide: CGFloat = 1600, quality: CGFloat = 0.75) -> Data? {
    guard let image = UIImage(data: data) else { return nil }
    let longest = max(image.size.width, image.size.height)
    let scale = longest > maxSide ? maxSide / longest : 1
    let target = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: target)
    let resized = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }
    return resized.jpegData(compressionQuality: quality)
}
