import SwiftUI

/// Everything that used to sit at the bottom of the You tab, behind the gear button.
struct SettingsView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appearance") private var appearance = AppearanceMode.system.rawValue

    @State private var editingContact = false
    @State private var legal: LegalDoc?
    @State private var confirmSignOut = false
    @State private var confirmDelete = false
    @State private var deleting = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                if let me = store.profile {
                    Section {
                        Picker("Appearance", selection: $appearance) {
                            ForEach(AppearanceMode.allCases) { Text($0.label).tag($0.rawValue) }
                        }
                        .pickerStyle(.segmented)
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    } header: { Text("Appearance") }

                    Section {
                        contactRows(me)
                    } header: {
                        Text("Contact info")
                    } footer: {
                        Text("Only shared when you choose to send it in a chat.")
                    }

                    Section {
                        privacyRow("Discoverable", "Appear in \"People near you\"", me.discoverable ?? true, "discoverable")
                        privacyRow("Show activity", "Let others see your games played", me.showActivity ?? true, "show_activity")
                        privacyRow("Show city", "Display your city on your profile", me.showLocation ?? true, "show_location")
                        privacyRow("Show sports", "Display your sports on your profile", me.showSports ?? true, "show_sports")
                        privacyRow("Show skill level", "Display your skill for each sport", me.showSkill ?? true, "show_skill")
                    } header: { Text("Privacy") }
                }

                Section {
                    let ids = Array(store.blockedIds).sorted()
                    if ids.isEmpty {
                        Text("You haven't blocked anyone.").foregroundStyle(Theme.mutedForeground)
                    }
                    ForEach(ids, id: \.self) { id in
                        HStack {
                            Text(store.name(of: id)).font(.system(size: 15, weight: .semibold))
                            Spacer()
                            Button("Unblock") { Task { try? await store.unblock(id) } }
                                .font(.system(size: 14, weight: .semibold))
                                .buttonStyle(.borderless)
                        }
                    }
                } header: { Text("Blocked users") }

                Section {
                    Button { legal = .terms } label: { linkRow("Terms & Conditions") }
                    Button { legal = .privacy } label: { linkRow("Privacy Policy") }
                    Link(destination: URL(string: "mailto:support@letsrallys.app")!) { linkRow("Contact support") }
                } header: { Text("About") }

                Section {
                    Button("Sign out") { confirmSignOut = true }
                        .foregroundStyle(Theme.foreground)
                    Button(deleting ? "Deleting…" : "Delete account", role: .destructive) { confirmDelete = true }
                        .disabled(deleting)
                } footer: {
                    if let errorText {
                        Text(errorText).foregroundStyle(Theme.destructive)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.surface)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() }.fontWeight(.semibold) } }
            .tint(Theme.primary)
            .sheet(isPresented: $editingContact) { EditContactView() }
            .sheet(item: $legal) { LegalView(doc: $0) }
            .confirmationDialog("Sign out of Rally?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { store.signOut() }
                Button("Cancel", role: .cancel) {}
            }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account permanently", role: .destructive) { Task { await deleteAccount() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your profile, the games you host, your messages and photos. This can't be undone.")
            }
        }
    }

    @ViewBuilder private func contactRows(_ me: Profile) -> some View {
        let items: [ContactLine] = [
            ContactLine(label: "Phone", value: me.phone ?? ""), ContactLine(label: "Instagram", value: me.instagram ?? ""),
            ContactLine(label: "Snapchat", value: me.snapchat ?? ""), ContactLine(label: "Other", value: me.otherSocial ?? ""),
        ]
        let filled = items.filter { !$0.value.isEmpty }
        if filled.isEmpty {
            Text("Nothing saved yet.").foregroundStyle(Theme.mutedForeground)
        }
        ForEach(filled) { item in
            HStack {
                Text(item.label).foregroundStyle(Theme.mutedForeground)
                Spacer()
                Text(item.value).fontWeight(.semibold)
            }
            .font(.system(size: 14))
        }
        Button(filled.isEmpty ? "Add contact info" : "Edit contact info") { editingContact = true }
    }

    private func privacyRow(_ title: String, _ hint: String, _ value: Bool, _ column: String) -> some View {
        Toggle(isOn: Binding(
            get: { value },
            set: { new in Task { try? await store.updateProfile([column: new]) } }
        )) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 15, weight: .semibold))
                Text(hint).font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
            }
        }
        .tint(Theme.primary)
    }

    private func linkRow(_ t: String) -> some View {
        HStack {
            Text(t).font(.system(size: 15))
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.mutedForeground)
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
}
