import SwiftUI

struct NewGameView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss

    @State private var sportKey = "volleyball"
    @State private var skill = "Intermediate"
    @State private var spots = 6
    @State private var when = Date().addingTimeInterval(3600 * 3)
    @State private var location = ""
    @State private var place: PlaceResult?
    @State private var notes = ""
    @State private var groupId: String = ""
    @State private var saving = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Sport") {
                    Picker("Sport", selection: $sportKey) {
                        ForEach(allSports) { s in Text("\(s.emoji) \(s.name)").tag(s.key) }
                    }
                    Picker("Skill level", selection: $skill) {
                        ForEach(skillLevels, id: \.self) { Text($0).tag($0) }
                    }
                }
                Section("When & where") {
                    DatePicker("Starts", selection: $when, in: Date()...)
                    PlaceField(placeholder: "Location (e.g. Piedmont Park courts)", text: $location, selected: $place,
                               near: store.profile.flatMap { p in p.lat.flatMap { a in p.lng.map { (a, $0) } } })
                }
                if !store.groups.filter({ store.myRole(in: $0.id) != nil }).isEmpty {
                    Section("Group (optional)") {
                        Picker("Post to", selection: $groupId) {
                            Text("Everyone").tag("")
                            ForEach(store.groups.filter { store.myRole(in: $0.id) != nil }) { g in
                                Text(g.name).tag(g.id)
                            }
                        }
                    }
                }
                Section("Players") {
                    Stepper("Spots: \(spots)", value: $spots, in: 2...30)
                }
                Section("Notes (optional)") {
                    TextField("Anything players should know", text: $notes, axis: .vertical)
                        .lineLimit(2...5)
                }
                if let errorText {
                    Text(errorText).foregroundStyle(Theme.destructive).font(.system(size: 13))
                }
            }
            .navigationTitle("New game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Posting…" : "Post") { Task { await save() } }
                        .disabled(saving || location.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() async {
        saving = true
        errorText = nil
        defer { saving = false }
        do {
            try await store.createGame(
                sportKey: sportKey, skill: skill, spots: spots, when: when,
                location: location.trimmingCharacters(in: .whitespaces), notes: notes,
                groupId: groupId.isEmpty ? nil : groupId,
                lat: place?.lat, lng: place?.lng
            )
            dismiss()
        } catch {
            errorText = error.localizedDescription
        }
    }
}
