import SwiftUI

struct PlayerProfileView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    let id: String

    @State private var errorText: String?
    @State private var report: ReportTarget?
    @State private var confirmBlock = false
    @State private var working = false

    private var person: Profile? { store.person(id) }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let p = person {
                    content(p)
                } else {
                    EmptyNote(text: "This profile isn't available.")
                }
            }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: ChatRoute.self) { ChatView(key: $0.key) }
            .sheet(item: $report) { ReportView(target: $0) }
            .confirmationDialog("Block \(person?.fullName ?? "this person")?", isPresented: $confirmBlock, titleVisibility: .visible) {
                Button("Block", role: .destructive) {
                    Task {
                        try? await store.block(id)
                        dismiss()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("You won't see each other anywhere in Rally. Pending requests will be cancelled. You can unblock from the You tab.")
            }
        }
    }

    @ViewBuilder
    private func content(_ p: Profile) -> some View {
        let showLocation = p.showLocation ?? true
        let showSports = p.showSports ?? true
        let status = store.friendship(with: p.id)

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                PersonAvatar(profile: p, size: 80)
                VStack(alignment: .leading, spacing: 4) {
                    Text(p.fullName).font(.system(size: 24, weight: .black))
                    if let dob = p.dob, let age = ageFromDOB(dob) {
                        Text("\(age) years old").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                    }
                    if showLocation, let city = p.city, !city.isEmpty {
                        Label(city, systemImage: "mappin.and.ellipse")
                            .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
            .padding(20)

            if let bio = p.bio, !bio.isEmpty {
                Text(bio).font(.system(size: 14)).padding(.horizontal, 20).padding(.bottom, 16)
            }

            HStack(spacing: 8) {
                statBox("\(store.gamesPlayed(by: p.id))", "Games")
                statBox("\(showSports ? (p.sports ?? [:]).count : 0)", "Sports")
                statBox(memberYear(p), "Since")
            }
            .padding(.horizontal, 20)

            kudosBox(p)

            VStack(spacing: 10) {
                actions(p, status)
                if needsRequestHint(status) {
                    Text("You'll be able to message \(p.firstName) once they accept your request.")
                        .font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
                }
                if let errorText { Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive) }
                HStack(spacing: 18) {
                    Spacer()
                    Button { report = ReportTarget(type: "user", targetId: p.id, label: p.fullName) } label: {
                        Label("Report", systemImage: "flag")
                    }
                    Button { confirmBlock = true } label: {
                        Label(store.isBlocked(p.id) ? "Blocked" : "Block", systemImage: "nosign")
                    }
                }
                .font(.system(size: 12))
                .foregroundStyle(Theme.mutedForeground)
            }
            .padding(20)

            if showSports, let sports = p.sports, !sports.isEmpty {
                Hairline()
                VStack(alignment: .leading, spacing: 10) {
                    Text("Plays").eyebrow()
                    FlowChips(items: sports.keys.sorted().map { sport(for: $0) })
                }
                .padding(20)
            }
        }
    }

    @ViewBuilder
    private func actions(_ p: Profile, _ status: Friendship) -> some View {
        switch status {
        case .incoming(let reqId):
            HStack(spacing: 8) {
                Button("Accept request") { run { try await store.respond(reqId, accept: true) } }
                    .buttonStyle(PrimaryButtonStyle())
                Button("Decline") { run { try await store.respond(reqId, accept: false) } }
                    .buttonStyle(PrimaryButtonStyle(filled: false))
            }
        case .outgoing(let reqId):
            Button("Requested · tap to cancel") { run { try await store.cancelRequest(reqId) } }
                .buttonStyle(PrimaryButtonStyle(filled: false))
        case .friends:
            HStack(spacing: 8) {
                Button("Friends ✓") { run { try await store.removeFriend(p.id) } }
                    .buttonStyle(PrimaryButtonStyle(filled: false))
                NavigationLink(value: ChatRoute(key: "dm:\(p.id)")) {
                    Text("Message")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .foregroundStyle(Theme.primaryForeground)
                        .background(Theme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                }
            }
        case .none:
            Button("Add friend") { run { try await store.sendFriendRequest(to: p.id) } }
                .buttonStyle(PrimaryButtonStyle())
        }
    }

    private func needsRequestHint(_ status: Friendship) -> Bool {
        switch status {
        case .none, .outgoing: return true
        default: return false
        }
    }

    private func kudosBox(_ p: Profile) -> some View {
        let total = store.kudosCount(for: p.id)
        let breakdown = store.kudosBreakdown(for: p.id)
        return Group {
            if total > 0 {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Kudos received").eyebrow()
                        Spacer()
                        Text("\(total)").font(.system(size: 18, weight: .black))
                    }
                    FlowLayout(spacing: 6) {
                        ForEach(kudoKinds) { k in
                            if let n = breakdown[k.key], n > 0 {
                                Text("\(k.emoji) \(k.label) · \(n)")
                                    .font(.system(size: 11, weight: .semibold))
                                    .padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(Theme.background)
                                    .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
                .padding(14)
                .background(Theme.surface)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
        }
    }

    private func statBox(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 18, weight: .black)).monospacedDigit()
            Text(label).font(.system(size: 11, weight: .semibold)).foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .background(Theme.surface)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func memberYear(_ p: Profile) -> String {
        guard let c = p.createdAt, let d = parseISODate(c) else { return "—" }
        return String(Calendar.current.component(.year, from: d))
    }

    private func run(_ work: @escaping () async throws -> Void) {
        errorText = nil
        Task {
            working = true
            defer { working = false }
            do { try await work() } catch { errorText = error.localizedDescription }
        }
    }
}

struct FlowChips: View {
    let items: [Sport]
    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items) { s in
                Text("\(s.emoji) \(s.name)")
                    .font(.system(size: 13, weight: .medium))
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Theme.background)
                    .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                    .clipShape(Capsule())
            }
        }
    }
}

/// Simple wrapping layout (chips flow onto the next line).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, maxW: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > width, x > 0 { x = 0; y += rowH + spacing; rowH = 0 }
            x += s.width + spacing
            rowH = max(rowH, s.height)
            maxW = max(maxW, x - spacing)
        }
        return CGSize(width: maxW, height: y + rowH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            rowH = max(rowH, s.height)
        }
    }
}
