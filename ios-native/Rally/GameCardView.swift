import SwiftUI

struct GameCardView: View {
    @EnvironmentObject var store: Store
    let game: Game

    @State private var working = false
    @State private var errorText: String?
    @State private var confirm: Confirm?

    private enum Confirm: Identifiable {
        case leave, cancel, end
        var id: Int { hashValue }
    }

    var body: some View {
        let s = sport(for: game.sport)
        let isHost = store.isHost(game)
        let joined = store.isJoined(game)

        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                Text(s.emoji)
                    .font(.system(size: 22))
                    .frame(width: 44, height: 44)
                    .background(s.color.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(s.name).font(.system(size: 15, weight: .bold))
                        Spacer()
                        Text(game.skill ?? "").eyebrow().font(.system(size: 10, weight: .bold))
                    }
                    Button {
                        store.openPlayer(game.hostUserId)
                    } label: {
                        HStack(spacing: 6) {
                            AvatarView(name: game.hostName, seed: game.hostAvatarSeed ?? game.hostUserId, size: 16)
                            Text(isHost ? "You" : game.hostName).lineLimit(1)
                            Text("·")
                            Text(store.distanceLabel(game))
                        }
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                row("mappin.and.ellipse", game.location)
                row("clock", game.whenLabel)
                row("person.2", "\(game.spotsTaken)/\(game.spotsTotal) \(game.isFull ? "full" : "joined")")
            }
            .padding(.top, 12)

            if let note = game.notes, !note.isEmpty {
                Text(note)
                    .font(.system(size: 13).italic())
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.leading, 12)
                    .overlay(alignment: .leading) { Rectangle().fill(Theme.border).frame(width: 2) }
                    .padding(.top, 12)
            }

            HStack(spacing: 8) {
                if isHost {
                    if game.isActive {
                        Button("End game") { confirm = .end }
                            .buttonStyle(PrimaryButtonStyle())
                    } else {
                        Button("Cancel game") { confirm = .cancel }
                            .buttonStyle(PrimaryButtonStyle(filled: false, destructive: true))
                    }
                } else if joined {
                    Button("Leave game") { confirm = .leave }
                        .buttonStyle(PrimaryButtonStyle(filled: false))
                } else {
                    Button(game.isFull ? "Full" : "Join game") {
                        Task { await run { try await store.join(game) } }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(game.isFull)
                    .opacity(game.isFull ? 0.5 : 1)
                }
            }
            .disabled(working)
            .padding(.top, 14)

            if let errorText {
                Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive).padding(.top, 6)
            }
        }
        .padding(16)
        .background(Theme.background)
        .confirmationDialog(title(for: confirm), isPresented: Binding(
            get: { confirm != nil }, set: { if !$0 { confirm = nil } }
        ), titleVisibility: .visible) {
            switch confirm {
            case .leave:
                Button("Leave game", role: .destructive) { Task { await run { try await store.leave(game) } } }
            case .cancel:
                Button("Cancel game", role: .destructive) { Task { await run { try await store.cancel(game) } } }
            case .end:
                Button("End game") { Task { await run { try await store.end(game) } } }
            case .none:
                EmptyView()
            }
            Button("Never mind", role: .cancel) {}
        } message: {
            Text(message(for: confirm))
        }
    }

    private func row(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(Theme.mutedForeground)
                .frame(width: 16)
            Text(text).font(.system(size: 13)).lineLimit(1)
        }
    }

    private func title(for c: Confirm?) -> String {
        switch c {
        case .leave: return "Leave this game?"
        case .cancel: return "Cancel this game?"
        case .end: return "End this game?"
        case .none: return ""
        }
    }

    private func message(for c: Confirm?) -> String {
        switch c {
        case .leave: return "Your spot will open up for someone else."
        case .cancel: return "The game and its group chat will be removed for everyone. This can't be undone."
        case .end: return "This wraps up the game and moves it to your activity."
        case .none: return ""
        }
    }

    private func run(_ work: () async throws -> Void) async {
        working = true
        errorText = nil
        defer { working = false }
        do { try await work() } catch { errorText = error.localizedDescription }
    }
}
