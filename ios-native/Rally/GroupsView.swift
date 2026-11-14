import SwiftUI

struct GroupRoute: Hashable { let id: String }

struct GroupsView: View {
    @EnvironmentObject var store: Store
    @State private var query = ""
    @State private var creating = false
    @State private var code = ""
    @State private var message: String?
    @State private var messageIsError = true
    @State private var joining = false

    private var mine: [RallyGroup] { store.groups.filter { store.myRole(in: $0.id) != nil } }
    private var discover: [RallyGroup] {
        store.groups.filter { g in
            store.myRole(in: g.id) == nil && (g.isPublic ?? true)
                && (query.trimmingCharacters(in: .whitespaces).isEmpty || g.name.localizedCaseInsensitiveContains(query))
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Groups").font(.system(size: 28, weight: .black))
                        Text("Clubs, teams, and friend groups. Games stay inside the group.")
                            .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                    }
                    .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 12)

                    VStack(spacing: 8) {
                        Button { creating = true } label: { Label("Create group", systemImage: "plus") }
                            .buttonStyle(PrimaryButtonStyle())
                            .frame(height: 44)
                        HStack(spacing: 8) {
                            TextField("Have an invite code?", text: $code)
                                .textInputAutocapitalization(.characters)
                                .autocorrectionDisabled()
                                .padding(.horizontal, 12).frame(height: 40)
                                .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
                            Button(joining ? "…" : "Join") { Task { await joinCode() } }
                                .buttonStyle(PrimaryButtonStyle(filled: false))
                                .frame(width: 80)
                                .disabled(joining || code.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                        if let message {
                            Text(message).font(.system(size: 12))
                                .foregroundStyle(messageIsError ? Theme.destructive : Theme.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(.horizontal, 20)

                    sectionTitle("Your groups · \(mine.count)")
                    if mine.isEmpty {
                        Text("You're not in any groups yet.").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                            .padding(.horizontal, 20)
                    } else {
                        ForEach(mine) { row($0) }
                    }

                    sectionTitle("Discover public groups")
                    TextField("Search groups", text: $query)
                        .padding(.horizontal, 12).frame(height: 40)
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
                        .padding(.horizontal, 20).padding(.bottom, 8)
                    if discover.isEmpty {
                        Text("No public groups found.").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                            .padding(.horizontal, 20)
                    } else {
                        ForEach(discover) { row($0) }
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.background)
            .refreshable { await store.reloadSocial() }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: GroupRoute.self) { GroupDetailView(groupId: $0.id) }
            .navigationDestination(for: ChatRoute.self) { ChatView(key: $0.key) }
            .sheet(isPresented: $creating) { CreateGroupView() }
        }
    }

    private func sectionTitle(_ t: String) -> some View {
        Text(t).eyebrow().padding(.horizontal, 20).padding(.top, 24).padding(.bottom, 8)
    }

    private func row(_ g: RallyGroup) -> some View {
        NavigationLink(value: GroupRoute(id: g.id)) {
            HStack(spacing: 12) {
                Text(String(g.name.prefix(2)).uppercased())
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Theme.primary)
                    .frame(width: 48, height: 48)
                    .background(Theme.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(g.name).font(.system(size: 15, weight: .semibold)).lineLimit(1)
                        Image(systemName: (g.isPublic ?? true) ? "globe" : "lock")
                            .font(.system(size: 10)).foregroundStyle(Theme.mutedForeground)
                    }
                    Text("\(store.members(of: g.id).count) members" + ((g.city ?? "").isEmpty ? "" : " · \(g.city ?? "")"))
                        .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
                    Text((g.sports ?? []).prefix(4).map { sport(for: $0).emoji }.joined(separator: " "))
                        .font(.system(size: 12))
                }
                Spacer()
            }
            .padding(12)
            .background(Theme.background)
            .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            .padding(.horizontal, 20).padding(.bottom, 8)
        }
        .buttonStyle(.plain)
    }

    private func joinCode() async {
        joining = true
        message = nil
        defer { joining = false }
        do {
            try await store.joinWithCode(code.trimmingCharacters(in: .whitespaces).uppercased())
            messageIsError = false
            message = "Joined group"
            code = ""
        } catch {
            messageIsError = true
            message = error.localizedDescription
        }
    }
}

struct CreateGroupView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var about = ""
    @State private var picked: Set<String> = []
    @State private var city = ""
    @State private var isPublic = true
    @State private var saving = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") { TextField("Sunday Soccer Club", text: $name) }
                Section("About") { TextField("What's this group about?", text: $about, axis: .vertical).lineLimit(2...5) }
                Section("Sports") {
                    ForEach(allSports) { s in
                        Button {
                            if picked.contains(s.key) { picked.remove(s.key) } else { picked.insert(s.key) }
                        } label: {
                            HStack {
                                Text("\(s.emoji) \(s.name)").foregroundStyle(Theme.foreground)
                                Spacer()
                                if picked.contains(s.key) { Image(systemName: "checkmark").foregroundStyle(Theme.primary) }
                            }
                        }
                    }
                }
                Section("City") { TextField(store.profile?.city ?? "City", text: $city) }
                Section {
                    Toggle("Public group", isOn: $isPublic)
                } footer: {
                    Text(isPublic ? "Anyone can find this group and ask to join." : "Only people with an invite code can join.")
                }
                if let errorText { Text(errorText).foregroundStyle(Theme.destructive) }
            }
            .navigationTitle("New group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Creating…" : "Create") { Task { await save() } }
                        .disabled(saving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        do {
            try await store.createGroup(
                name: name.trimmingCharacters(in: .whitespaces), description: about,
                sports: allSports.map { $0.key }.filter { picked.contains($0) },
                city: city.isEmpty ? (store.profile?.city ?? "") : city, isPublic: isPublic
            )
            dismiss()
        } catch {
            errorText = error.localizedDescription
        }
    }
}
