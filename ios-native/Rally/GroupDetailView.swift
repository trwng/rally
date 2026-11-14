import SwiftUI
import UIKit

struct GroupDetailView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    let groupId: String

    @State private var inviteCode: String?
    @State private var errorText: String?
    @State private var confirmDelete = false
    @State private var confirmLeave = false
    @State private var report: ReportTarget?

    private var group: RallyGroup? { store.groups.first { $0.id == groupId } }
    private var role: String? { store.myRole(in: groupId) }
    private var isAdmin: Bool { role == "admin" }

    var body: some View {
        ScrollView {
            if let g = group {
                VStack(alignment: .leading, spacing: 0) {
                    header(g)
                    actions(g)
                    if isAdmin { adminTools }
                    if isAdmin, !store.pendingRequests(for: groupId).isEmpty { requestsSection }
                    membersSection
                    gamesSection
                }
            } else {
                EmptyNote(text: "This group isn't available.")
            }
        }
        .scrollIndicators(.hidden)
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if role == nil, group != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { report = ReportTarget(type: "group", targetId: groupId, label: group?.name ?? "group") } label: {
                        Image(systemName: "flag")
                    }
                }
            }
        }
        .sheet(item: $report) { ReportView(target: $0) }
        .confirmationDialog("Delete this group?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete group", role: .destructive) { run { try await store.deleteGroup(groupId); dismiss() } }
            Button("Cancel", role: .cancel) {}
        } message: { Text("This removes the group for everyone. It can't be undone.") }
        .confirmationDialog("Leave this group?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave group", role: .destructive) { run { try await store.leaveGroup(groupId) } }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func header(_ g: RallyGroup) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Text(String(g.name.prefix(2)).uppercased())
                    .font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.primary)
                    .frame(width: 56, height: 56)
                    .background(Theme.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                VStack(alignment: .leading, spacing: 2) {
                    Text(g.name).font(.system(size: 22, weight: .black))
                    Text("\((g.isPublic ?? true) ? "Public" : "Private") · \(store.members(of: g.id).count) members")
                        .font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
                }
            }
            if let d = g.description, !d.isEmpty { Text(d).font(.system(size: 14)) }
            if let c = g.city, !c.isEmpty { Text("📍 \(c)").font(.system(size: 12)).foregroundStyle(Theme.mutedForeground) }
            Text((g.sports ?? []).map { "\(sport(for: $0).emoji) \(sport(for: $0).name)" }.joined(separator: "   "))
                .font(.system(size: 12))
        }
        .padding(20)
    }

    private func actions(_ g: RallyGroup) -> some View {
        VStack(spacing: 8) {
            if role != nil {
                HStack(spacing: 8) {
                    NavigationLink(value: ChatRoute(key: "gr:\(g.id)")) {
                        Label("Group chat", systemImage: "bubble.left")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(maxWidth: .infinity, minHeight: 40)
                            .foregroundStyle(Theme.primaryForeground)
                            .background(Theme.primary)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                    }
                    if !isAdmin {
                        Button("Leave") { confirmLeave = true }
                            .buttonStyle(PrimaryButtonStyle(filled: false)).frame(width: 90)
                    }
                }
            } else if store.myJoinStatus(groupId) != nil {
                Button("Request pending") {}.buttonStyle(PrimaryButtonStyle(filled: false)).disabled(true)
            } else if g.isPublic ?? true {
                Button("Request to join") { run { try await store.requestToJoin(groupId) } }
                    .buttonStyle(PrimaryButtonStyle())
            } else {
                Text("Private group. You need an invite code.")
                    .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
            }
            if let errorText { Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive) }
        }
        .padding(.horizontal, 20).padding(.bottom, 16)
    }

    private var adminTools: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Admin").eyebrow()
            HStack(spacing: 8) {
                Button("Create invite code") { run { inviteCode = try await store.createInvite(groupId) } }
                    .buttonStyle(PrimaryButtonStyle(filled: false))
                Button("Delete") { confirmDelete = true }
                    .buttonStyle(PrimaryButtonStyle(filled: false, destructive: true)).frame(width: 90)
            }
            if let code = inviteCode {
                HStack {
                    Text(code).font(.system(size: 20, weight: .black, design: .monospaced))
                    Spacer()
                    Button("Copy") { UIPasteboard.general.string = code }.font(.system(size: 13, weight: .semibold))
                }
                .padding(12)
                .background(Theme.primarySoft)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            }
        }
        .padding(.horizontal, 20).padding(.bottom, 16)
    }

    private var requestsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Join requests · \(store.pendingRequests(for: groupId).count)").eyebrow()
            ForEach(store.pendingRequests(for: groupId)) { item in
                HStack(spacing: 10) {
                    PersonAvatar(profile: item.person, size: 34)
                    Text(item.person?.fullName ?? "Someone").font(.system(size: 14, weight: .semibold))
                    Spacer()
                    Button("Approve") { run { try await store.decide(item.req.id, approve: true) } }
                        .font(.system(size: 12, weight: .semibold))
                    Button("Deny") { run { try await store.decide(item.req.id, approve: false) } }
                        .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
                }
            }
        }
        .padding(.horizontal, 20).padding(.bottom, 16)
    }

    private var membersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Hairline()
            Text("Members · \(store.members(of: groupId).count)").eyebrow().padding(.top, 6)
            ForEach(store.members(of: groupId), id: \.userId) { m in
                HStack(spacing: 10) {
                    Button { store.openPlayer(m.userId) } label: {
                        HStack(spacing: 10) {
                            PersonAvatar(profile: store.person(m.userId), size: 36)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(store.name(of: m.userId) + (m.userId == store.userId ? " (you)" : ""))
                                    .font(.system(size: 14, weight: .semibold))
                                if m.role == "admin" {
                                    Text("Admin").eyebrow().foregroundStyle(Theme.primary)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    if isAdmin, m.role != "admin" {
                        Menu {
                            Button("Make admin") { run { try await store.promote(groupId, m.userId) } }
                            Button("Remove from group", role: .destructive) { run { try await store.removeMember(groupId, m.userId) } }
                        } label: { Image(systemName: "ellipsis").padding(8) }
                    }
                }
            }
        }
        .padding(20)
    }

    private var gamesSection: some View {
        let games = store.gamesIn(group: groupId)
        return VStack(alignment: .leading, spacing: 6) {
            Hairline()
            Text("Upcoming group games · \(games.count)").eyebrow().padding(.top, 6).padding(.horizontal, 20)
            if games.isEmpty {
                Text("No games posted in this group yet.").font(.system(size: 14))
                    .foregroundStyle(Theme.mutedForeground).padding(.horizontal, 20)
            } else {
                ForEach(games) { g in
                    Hairline()
                    GameCardView(game: g)
                }
            }
        }
        .padding(.bottom, 24)
    }

    private func run(_ work: @escaping () async throws -> Void) {
        errorText = nil
        Task { do { try await work() } catch { errorText = error.localizedDescription } }
    }
}
