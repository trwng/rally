import SwiftUI

struct PastGamesView: View {
    @EnvironmentObject var store: Store
    var limit: Int? = nil
    @State private var kudosGame: Game?

    var body: some View {
        let all = store.pastGames
        let list = limit.map { Array(all.prefix($0)) } ?? all
        VStack(spacing: 0) {
            if list.isEmpty {
                VStack(spacing: 4) {
                    Text("No completed games yet").font(.system(size: 13, weight: .semibold))
                    Text("Once a game you host or join wraps up, it'll show up here.")
                        .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity).padding(28)
            } else {
                ForEach(list) { g in
                    Hairline()
                    article(g)
                }
                Hairline()
            }
        }
        .sheet(item: $kudosGame) { KudosView(game: $0) }
    }

    private func article(_ g: Game) -> some View {
        let s = sport(for: g.sport)
        let others = store.roster(of: g).filter { $0 != store.userId }
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                Text(s.emoji).font(.system(size: 24))
                    .frame(width: 48, height: 48)
                    .background(s.color.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                VStack(alignment: .leading, spacing: 2) {
                    Text(g.whenLabel).eyebrow()
                    Text(s.name).font(.system(size: 17, weight: .black))
                }
            }
            HStack(spacing: 14) {
                Label(g.location, systemImage: "mappin.and.ellipse").lineLimit(1)
                Label("\(store.roster(of: g).count) players", systemImage: "person.2")
            }
            .font(.system(size: 12.5))
            .foregroundStyle(Theme.foreground.opacity(0.85))

            if let n = g.notes, !n.isEmpty {
                Text(n).font(.system(size: 13).italic()).foregroundStyle(Theme.mutedForeground)
            }
            if !others.isEmpty {
                Text("Played with").eyebrow()
                FlowLayout(spacing: 6) {
                    ForEach(others, id: \.self) { id in
                        Button { store.openPlayer(id) } label: {
                            HStack(spacing: 6) {
                                PersonAvatar(profile: store.person(id), size: 22)
                                Text(store.name(of: id)).font(.system(size: 12, weight: .medium))
                            }
                            .padding(.leading, 4).padding(.trailing, 10).padding(.vertical, 4)
                            .background(Theme.surface)
                            .overlay(Capsule().stroke(Theme.border, lineWidth: 1))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                Button { kudosGame = g } label: {
                    Label("Give kudos", systemImage: "rosette").font(.system(size: 12, weight: .semibold))
                        .padding(.horizontal, 12).frame(height: 32)
                        .background(Theme.surface)
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
    }
}

struct AllPastGamesView: View {
    var body: some View {
        ScrollView { PastGamesView() }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .navigationTitle("Past games")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct KudosView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    let game: Game
    @State private var errorText: String?

    var body: some View {
        let s = sport(for: game.sport)
        let others = store.roster(of: game).filter { $0 != store.userId }
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if others.isEmpty {
                        EmptyNote(text: "No other players in this game to commend.")
                    }
                    ForEach(others, id: \.self) { id in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                PersonAvatar(profile: store.person(id), size: 36)
                                Text(store.name(of: id)).font(.system(size: 14, weight: .semibold))
                            }
                            FlowLayout(spacing: 8) {
                                ForEach(kudoKinds) { k in
                                    let existing = store.kudo(game: game.id, to: id, kind: k.key)
                                    Button {
                                        Task { await toggle(id, k, existing) }
                                    } label: {
                                        Text("\(k.emoji) \(k.label)")
                                            .font(.system(size: 12, weight: .semibold))
                                            .padding(.horizontal, 12).padding(.vertical, 7)
                                            .foregroundStyle(existing != nil ? Theme.primaryForeground : Theme.foreground)
                                            .background(existing != nil ? Theme.primary : Theme.surface)
                                            .overlay(Capsule().stroke(existing != nil ? Color.clear : Theme.border, lineWidth: 1))
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(16)
                        Hairline()
                    }
                    if let errorText {
                        Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive).padding(16)
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Kudos · \(s.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
    }

    private func toggle(_ id: String, _ k: KudoKind, _ existing: Kudo?) async {
        errorText = nil
        do {
            if let existing { try await store.revokeKudo(existing.id) }
            else { try await store.giveKudo(game: game.id, to: id, kind: k.key) }
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct ActivityCalendarView: View {
    let days: [ActivityDay]

    private var weeks: [[ActivityDay?]] {
        guard let first = days.first else { return [] }
        let lead = Calendar.current.component(.weekday, from: first.date) - 1
        var grid: [ActivityDay?] = Array(repeating: nil, count: lead) + days.map { Optional($0) }
        while grid.count % 7 != 0 { grid.append(nil) }
        return stride(from: 0, to: grid.count, by: 7).map { Array(grid[$0..<$0 + 7]) }
    }

    private func shade(_ n: Int) -> Color {
        switch n {
        case ...0: return Theme.muted
        case 1: return Theme.primary.opacity(0.28)
        case 2: return Theme.primary.opacity(0.55)
        case 3: return Theme.primary.opacity(0.8)
        default: return Theme.primary
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Activity").eyebrow()
                    Text("Last 4 months").font(.system(size: 13, weight: .semibold))
                }
                Spacer()
                HStack(spacing: 3) {
                    Text("Less").font(.system(size: 10)).foregroundStyle(Theme.mutedForeground)
                    ForEach(0..<5) { n in RoundedRectangle(cornerRadius: 2).fill(shade(n)).frame(width: 10, height: 10) }
                    Text("More").font(.system(size: 10)).foregroundStyle(Theme.mutedForeground)
                }
            }
            ScrollView(.horizontal) {
                HStack(spacing: 2) {
                    ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: 2) {
                            ForEach(0..<7, id: \.self) { i in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(week[i].map { shade($0.count) } ?? Color.clear)
                                    .frame(width: 11, height: 11)
                            }
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }
}
