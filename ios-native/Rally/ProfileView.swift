import SwiftUI
import PhotosUI

enum AppearanceMode: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
    var scheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

struct ProfileView: View {
    @EnvironmentObject var store: Store
    @AppStorage("appearance") private var appearance = AppearanceMode.system.rawValue

    @State private var confirmSignOut = false
    @State private var editingSports = false
    @State private var editingContact = false
    @State private var editingBio = false
    @State private var photoItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var errorText: String?
    @State private var legal: LegalDoc?
    @State private var confirmDelete = false
    @State private var deleting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                if let me = store.profile {
                    VStack(alignment: .leading, spacing: 0) {
                        identity(me)
                        statsStrip
                        ActivityCalendarView(days: store.activity()).padding(16)
                        Hairline()
                        sportsSection(me)
                        Hairline()
                        pastSection
                        Hairline()
                        friendsSection
                        Hairline()
                        contactSection(me)
                        Hairline()
                        appearanceSection
                        Hairline()
                        privacySection(me)
                        Hairline()
                        blockedSection
                        Hairline()
                        legalSection
                    }
                    .padding(.bottom, 24)
                }
            }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .toolbar(.hidden, for: .navigationBar)
            .refreshable { await store.refresh(); await store.reloadProfile() }
            .navigationDestination(for: ChatRoute.self) { ChatView(key: $0.key) }
            .navigationDestination(for: PastRoute.self) { _ in AllPastGamesView() }
            .sheet(isPresented: $editingSports) { EditSportsView() }
            .sheet(isPresented: $editingContact) { EditContactView() }
            .sheet(isPresented: $editingBio) { EditBioView() }
            .sheet(item: $legal) { LegalView(doc: $0) }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account permanently", role: .destructive) { Task { await deleteAccount() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your profile, the games you host, your messages and photos. This can't be undone.")
            }
            .onChange(of: photoItem) {
                guard let item = photoItem else { return }
                Task { await setPhoto(item) }
            }
            .confirmationDialog("Sign out of Rally?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { store.signOut() }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    // MARK: Sections

    private func identity(_ me: Profile) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 16) {
                ZStack(alignment: .bottomTrailing) {
                    PersonAvatar(profile: me, size: 72)
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Image(systemName: uploading ? "hourglass" : "camera.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.primaryForeground)
                            .frame(width: 28, height: 28)
                            .background(Theme.primary)
                            .clipShape(Circle())
                    }
                    .offset(x: 4, y: 4)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text("Athlete").eyebrow()
                    Text(me.fullName).font(.system(size: 26, weight: .black)).lineLimit(1)
                    if let city = me.city, !city.isEmpty {
                        Text(city).font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
                    }
                }
                Spacer()
            }
            HStack {
                if let bio = me.bio, !bio.isEmpty { Text(bio).font(.system(size: 14)) }
                Spacer()
                Button((me.bio ?? "").isEmpty ? "Add bio" : "Edit") { editingBio = true }
                    .font(.system(size: 12, weight: .semibold))
            }
            if me.avatarUrl != nil {
                Button("Remove photo") { Task { try? await store.removeAvatar() } }
                    .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
            }
            if let errorText { Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive) }
        }
        .padding(16)
    }

    private var statsStrip: some View {
        VStack(spacing: 0) {
            Hairline()
            HStack(spacing: 0) {
                stat("\(store.playedCount)", "Games played")
                Rectangle().fill(Theme.border).frame(width: 1)
                stat("\(store.streak)", "Day streak")
                Rectangle().fill(Theme.border).frame(width: 1)
                stat("\(store.kudosCount(for: store.userId ?? ""))", "Kudos")
            }
            .frame(height: 72)
            Hairline()
        }
        .background(Theme.surface)
    }

    private func stat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) {
            Text(v).font(.system(size: 22, weight: .black)).monospacedDigit()
            Text(l).font(.system(size: 11, weight: .semibold)).foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity)
    }

    private func sportsSection(_ me: Profile) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                SectionHeading("Your sports")
                Spacer()
                Button("Edit") { editingSports = true }.font(.system(size: 13, weight: .semibold))
            }
            let sports = (me.sports ?? [:]).sorted { $0.key < $1.key }
            if sports.isEmpty {
                Text("No sports added yet.").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
            }
            ForEach(sports, id: \.key) { entry in
                let s = sport(for: entry.key)
                HStack(spacing: 12) {
                    Text(s.emoji).frame(width: 36, height: 36)
                        .background(s.color.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                    Text(s.name).font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Text(entry.value).eyebrow()
                }
            }
        }
        .padding(16)
    }

    private var pastSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                SectionHeading("Recent activity")
                Spacer()
                if store.pastGames.count > 3 {
                    NavigationLink("See all", value: PastRoute()).font(.system(size: 13, weight: .semibold))
                }
            }
            .padding(16)
            PastGamesView(limit: 3)
        }
    }

    private var friendsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeading("Friends · \(store.friends.count)")
            if store.friends.isEmpty {
                Text("No friends yet. Tap a player in a game to add them.")
                    .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
            }
            ForEach(store.friends) { f in
                HStack(spacing: 12) {
                    Button { store.openPlayer(f.id) } label: {
                        HStack(spacing: 12) {
                            PersonAvatar(profile: f, size: 38)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(f.fullName).font(.system(size: 14, weight: .semibold))
                                if let c = f.city, !c.isEmpty { Text(c).font(.system(size: 11)).foregroundStyle(Theme.mutedForeground) }
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                    NavigationLink(value: ChatRoute(key: "dm:\(f.id)")) { Image(systemName: "bubble.left").padding(8) }
                }
            }
        }
        .padding(16)
    }

    private func contactSection(_ me: Profile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Contact info").eyebrow()
                    Text("Only shared when you choose to send it in a chat.")
                        .font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
                }
                Spacer()
                Button("Edit") { editingContact = true }.font(.system(size: 13, weight: .semibold))
            }
            let items: [ContactLine] = [
                ContactLine(label: "Phone", value: me.phone ?? ""), ContactLine(label: "Instagram", value: me.instagram ?? ""),
                ContactLine(label: "Snapchat", value: me.snapchat ?? ""), ContactLine(label: "Other", value: me.otherSocial ?? ""),
            ]
            let filled = items.filter { !$0.value.isEmpty }
            if filled.isEmpty {
                Text("Nothing saved yet.").font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
            }
            ForEach(filled) { item in
                HStack {
                    Text(item.label).font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Text(item.value).font(.system(size: 13, weight: .semibold))
                }
            }
        }
        .padding(16)
    }

    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Appearance").eyebrow()
            Picker("Appearance", selection: $appearance) {
                ForEach(AppearanceMode.allCases) { Text($0.label).tag($0.rawValue) }
            }
            .pickerStyle(.segmented)
        }
        .padding(16)
    }

    private func privacySection(_ me: Profile) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Privacy · who sees what").eyebrow().padding(.bottom, 4)
            privacyRow("Discoverable", "Appear in \"People near you\"", me.discoverable ?? true, "discoverable")
            privacyRow("Show activity", "Let others see your games played", me.showActivity ?? true, "show_activity")
            privacyRow("Show city", "Display your city on your profile", me.showLocation ?? true, "show_location")
            privacyRow("Show sports", "Display your sports on your profile", me.showSports ?? true, "show_sports")
            privacyRow("Show skill level", "Display your skill for each sport", me.showSkill ?? true, "show_skill")
        }
        .padding(16)
    }

    private func privacyRow(_ title: String, _ hint: String, _ value: Bool, _ column: String) -> some View {
        Toggle(isOn: Binding(
            get: { value },
            set: { new in Task { try? await store.updateProfile([column: new]) } }
        )) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 14, weight: .semibold))
                Text(hint).font(.system(size: 11)).foregroundStyle(Theme.mutedForeground)
            }
        }
        .tint(Theme.primary)
    }

    private var blockedSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Blocked users").eyebrow()
            let ids = Array(store.blockedIds).sorted()
            if ids.isEmpty {
                Text("You haven't blocked anyone.").font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
            }
            ForEach(ids, id: \.self) { id in
                HStack {
                    Text(store.name(of: id)).font(.system(size: 14, weight: .semibold))
                    Spacer()
                    Button("Unblock") { Task { try? await store.unblock(id) } }.font(.system(size: 13, weight: .semibold))
                }
            }
        }
        .padding(16)
    }

    private var legalSection: some View {
        VStack(spacing: 12) {
            Button { legal = .terms } label: { linkRow("Terms & Conditions") }
            Button { legal = .privacy } label: { linkRow("Privacy Policy") }
            Link(destination: URL(string: "mailto:support@letsrallys.app")!) { linkRow("Contact support") }
            Button("Sign out") { confirmSignOut = true }
                .buttonStyle(PrimaryButtonStyle(filled: false))
                .padding(.top, 6)
            Button(deleting ? "Deleting…" : "Delete account") { confirmDelete = true }
                .buttonStyle(PrimaryButtonStyle(filled: false, destructive: true))
                .disabled(deleting)
        }
        .padding(16)
    }

    private func linkRow(_ t: String) -> some View {
        HStack {
            Text(t).font(.system(size: 14, weight: .semibold))
            Spacer()
            Image(systemName: "arrow.up.right").font(.system(size: 12))
        }
        .foregroundStyle(Theme.foreground)
    }

    private func deleteAccount() async {
        deleting = true
        errorText = nil
        defer { deleting = false }
        do {
            try await store.deleteAccount()
        } catch {
            errorText = "Couldn't delete your account: \(error.localizedDescription)"
        }
    }

    private func setPhoto(_ item: PhotosPickerItem) async {
        uploading = true
        defer { uploading = false; photoItem = nil }
        do {
            guard let raw = try await item.loadTransferable(type: Data.self),
                  let jpeg = compressedJPEG(from: raw, maxSide: 800) else {
                errorText = "Couldn't read that photo."
                return
            }
            try await store.uploadAvatar(jpeg: jpeg)
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct PastRoute: Hashable {}

struct ContactLine: Identifiable {
    let label: String
    let value: String
    var id: String { label }
}

// MARK: - Editors

struct EditSportsView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var skills: [String: String] = [:]
    @State private var saving = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                ForEach(allSports) { s in
                    let on = skills[s.key] != nil
                    Section {
                        Toggle("\(s.emoji) \(s.name)", isOn: Binding(
                            get: { on },
                            set: { skills[s.key] = $0 ? "Intermediate" : nil }
                        ))
                        if on {
                            Picker("Skill", selection: Binding(get: { skills[s.key] ?? "Intermediate" }, set: { skills[s.key] = $0 })) {
                                ForEach(skillLevels, id: \.self) { Text($0).tag($0) }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                }
                if let errorText { Text(errorText).foregroundStyle(Theme.destructive) }
            }
            .navigationTitle("Your sports")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }.disabled(saving)
                }
            }
            .onAppear { skills = store.profile?.sports ?? [:] }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        do { try await store.updateProfile(["sports": skills]); dismiss() }
        catch { errorText = error.localizedDescription }
    }
}

struct EditContactView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var phone = ""
    @State private var instagram = ""
    @State private var snapchat = ""
    @State private var other = ""
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                Section(footer: Text("Only shared when you choose to send it in a chat.")) {
                    TextField("Phone", text: $phone).keyboardType(.phonePad)
                    TextField("Instagram", text: $instagram).textInputAutocapitalization(.never)
                    TextField("Snapchat", text: $snapchat).textInputAutocapitalization(.never)
                    TextField("Other", text: $other)
                }
                if let errorText { Text(errorText).foregroundStyle(Theme.destructive) }
            }
            .navigationTitle("Contact info")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } } }
            }
            .onAppear {
                let p = store.profile
                phone = p?.phone ?? ""; instagram = p?.instagram ?? ""
                snapchat = p?.snapchat ?? ""; other = p?.otherSocial ?? ""
            }
        }
    }

    private func save() async {
        func v(_ s: String) -> String? { s.trimmingCharacters(in: .whitespaces).isEmpty ? nil : s.trimmingCharacters(in: .whitespaces) }
        do {
            try await store.updateProfile(["phone": v(phone), "instagram": v(instagram), "snapchat": v(snapchat), "other_social": v(other)])
            dismiss()
        } catch { errorText = error.localizedDescription }
    }
}

struct EditBioView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var bio = ""
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                Section { TextField("Tell people about yourself", text: $bio, axis: .vertical).lineLimit(3...8) }
                if let errorText { Text(errorText).foregroundStyle(Theme.destructive) }
            }
            .navigationTitle("Bio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } } }
            }
            .onAppear { bio = store.profile?.bio ?? "" }
        }
    }

    private func save() async {
        do {
            let t = bio.trimmingCharacters(in: .whitespacesAndNewlines)
            try await store.updateProfile(["bio": t.isEmpty ? nil : t])
            dismiss()
        } catch { errorText = error.localizedDescription }
    }
}
