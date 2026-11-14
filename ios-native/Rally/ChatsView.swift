import SwiftUI

struct ChatRoute: Hashable {
    let key: String
}

struct ChatsView: View {
    @EnvironmentObject var store: Store
    @State private var errorText: String?

    private struct Row: Identifiable {
        let key: String
        let title: String
        let subtitle: String
        let icon: String
        let profile: Profile?
        let last: MessageRow?
        let unread: Int
        var id: String { key }
    }

    private var rows: [Row] {
        let byKey = store.messagesByKey
        var out: [Row] = []

        for g in store.upcoming {
            let key = "g:\(g.id)"
            let s = sport(for: g.sport)
            out.append(Row(key: key, title: "\(s.name) · \(g.whenLabel.components(separatedBy: ",").first ?? g.whenLabel)",
                           subtitle: g.location, icon: s.emoji, profile: nil,
                           last: byKey[key]?.last, unread: store.unread(key, in: byKey)))
        }
        for grp in store.groups where store.myRole(in: grp.id) != nil {
            let key = "gr:\(grp.id)"
            out.append(Row(key: key, title: grp.name, subtitle: "Group", icon: "👥", profile: nil,
                           last: byKey[key]?.last, unread: store.unread(key, in: byKey)))
        }
        for f in store.friends {
            let key = "dm:\(f.id)"
            out.append(Row(key: key, title: f.fullName, subtitle: f.city ?? "Direct message", icon: "", profile: f,
                           last: byKey[key]?.last, unread: store.unread(key, in: byKey)))
        }
        return out.sorted { ($0.last?.date ?? .distantPast) > ($1.last?.date ?? .distantPast) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Chats").font(.system(size: 28, weight: .black))
                        Text("Group chats for your games and messages with friends.")
                            .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                    }
                    .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 12)

                    if !store.incomingRequests.isEmpty {
                        header("Friend requests · \(store.incomingRequests.count)")
                        card {
                            ForEach(Array(store.incomingRequests.enumerated()), id: \.element.id) { i, item in
                                if i > 0 { Hairline() }
                                HStack(spacing: 12) {
                                    Button { if let p = item.person { store.openPlayer(p.id) } } label: {
                                        HStack(spacing: 12) {
                                            PersonAvatar(profile: item.person, size: 38)
                                            VStack(alignment: .leading, spacing: 1) {
                                                Text(item.person?.fullName ?? "Someone").font(.system(size: 13, weight: .semibold))
                                                Text("wants to be friends").font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
                                            }
                                            Spacer()
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    circleButton("checkmark", filled: true) { run { try await store.respond(item.req.id, accept: true) } }
                                    circleButton("xmark", filled: false) { run { try await store.respond(item.req.id, accept: false) } }
                                }
                                .padding(12)
                            }
                        }
                    }

                    if !store.outgoingRequests.isEmpty {
                        header("Pending · sent")
                        card {
                            ForEach(Array(store.outgoingRequests.enumerated()), id: \.element.id) { i, item in
                                if i > 0 { Hairline() }
                                HStack(spacing: 12) {
                                    PersonAvatar(profile: item.person, size: 34)
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(item.person?.fullName ?? "Someone").font(.system(size: 13, weight: .medium))
                                        Text("Waiting for response").font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
                                    }
                                    Spacer()
                                    circleButton("xmark", filled: false) { run { try await store.cancelRequest(item.req.id) } }
                                }
                                .padding(12)
                            }
                        }
                    }

                    if let errorText {
                        Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive).padding(.horizontal, 20)
                    }

                    if rows.isEmpty {
                        EmptyNote(text: "Join a game or add a friend to start chatting.")
                    } else {
                        Hairline().padding(.top, 8)
                        ForEach(rows) { r in
                            NavigationLink(value: ChatRoute(key: r.key)) { rowView(r) }
                                .buttonStyle(.plain)
                            Hairline()
                        }
                    }

                    let people = Array(store.discoverable.prefix(12))
                    if !people.isEmpty {
                        header("People near you")
                        card {
                            ForEach(Array(people.enumerated()), id: \.element.id) { i, p in
                                if i > 0 { Hairline() }
                                HStack(spacing: 12) {
                                    Button { store.openPlayer(p.id) } label: {
                                        HStack(spacing: 12) {
                                            PersonAvatar(profile: p, size: 38)
                                            VStack(alignment: .leading, spacing: 1) {
                                                Text(p.fullName).font(.system(size: 13, weight: .semibold))
                                                if (p.showSports ?? true), let s = p.sports, !s.isEmpty {
                                                    Text(s.keys.sorted().map { sport(for: $0).emoji }.joined(separator: " "))
                                                        .font(.system(size: 12))
                                                }
                                            }
                                            Spacer()
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    if case .none = store.friendship(with: p.id) {
                                        Button("Add") { run { try await store.sendFriendRequest(to: p.id) } }
                                            .font(.system(size: 12, weight: .semibold))
                                            .padding(.horizontal, 12).frame(height: 30)
                                            .foregroundStyle(Theme.primaryForeground)
                                            .background(Theme.primary)
                                            .clipShape(Capsule())
                                    } else {
                                        Text("Requested").font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
                                    }
                                }
                                .padding(12)
                            }
                        }
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .refreshable { await store.refresh() }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: ChatRoute.self) { ChatView(key: $0.key) }
        }
    }

    private func rowView(_ r: Row) -> some View {
        HStack(spacing: 12) {
            if let p = r.profile {
                PersonAvatar(profile: p, size: 44)
            } else {
                Text(r.icon).font(.system(size: 20))
                    .frame(width: 44, height: 44)
                    .background(Theme.muted)
                    .clipShape(Circle())
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(r.title).font(.system(size: 15, weight: .semibold)).lineLimit(1)
                Text(preview(r)).font(.system(size: 13)).foregroundStyle(Theme.mutedForeground).lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                if let last = r.last { Text(relativeShort(last.date)).font(.system(size: 11)).foregroundStyle(Theme.mutedForeground) }
                if r.unread > 0 {
                    Text("\(r.unread)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.orangeForeground)
                        .padding(.horizontal, 6).frame(minWidth: 18, minHeight: 18)
                        .background(Theme.orange)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func preview(_ r: Row) -> String {
        guard let last = r.last else { return r.subtitle }
        let who = last.authorUserId == store.userId ? "You: " : ""
        if let a = last.attachments, !a.isEmpty, last.text.isEmpty { return who + "📷 Photo" }
        return who + last.text
    }

    private func header(_ text: String) -> some View {
        Text(text).eyebrow().padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: 0) { content() }
            .background(Theme.background)
            .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            .padding(.horizontal, 20)
    }

    private func circleButton(_ icon: String, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .bold))
                .frame(width: 32, height: 32)
                .foregroundStyle(filled ? Theme.primaryForeground : Theme.mutedForeground)
                .background(filled ? Theme.primary : Color.clear)
                .overlay(Circle().stroke(filled ? Color.clear : Theme.border, lineWidth: 1))
                .clipShape(Circle())
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        errorText = nil
        Task {
            do { try await work() } catch { errorText = error.localizedDescription }
        }
    }
}
