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
