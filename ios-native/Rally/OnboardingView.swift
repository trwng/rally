import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var store: Store

    @State private var step = 0
    @State private var dob = Calendar.current.date(byAdding: .year, value: -20, to: Date()) ?? Date()
    @State private var cityText = ""
    @State private var place: PlaceResult?
    @State private var skills: [String: String] = [:]
    @State private var saving = false
    @State private var errorText: String?

    private var age: Int { Calendar.current.dateComponents([.year], from: dob, to: Date()).year ?? 0 }
    private var dobOK: Bool { age >= 15 && age <= 100 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                ForEach(0..<3) { i in
                    Capsule().fill(i <= step ? Theme.primary : Theme.border).frame(height: 4)
                }
            }
            .padding(.bottom, 24)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    switch step {
                    case 0: dobStep
                    case 1: cityStep
                    default: sportsStep
                    }
                    if let errorText { Text(errorText).font(.system(size: 13)).foregroundStyle(Theme.destructive) }
                }
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)

            HStack(spacing: 10) {
                if step > 0 {
                    Button("Back") { step -= 1 }.buttonStyle(PrimaryButtonStyle(filled: false)).frame(width: 100)
                }
                Button(step == 2 ? (saving ? "Saving…" : "Finish") : "Continue") {
                    if step < 2 { step += 1 } else { Task { await finish() } }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!canContinue || saving)
                .opacity(canContinue ? 1 : 0.5)
            }
            .frame(height: 46)
            .padding(.top, 12)
        }
        .padding(24)
        .background(Theme.background.ignoresSafeArea())
    }

    private var canContinue: Bool {
        switch step {
        case 0: return dobOK
        case 1: return place != nil
        default: return !skills.isEmpty
        }
    }

    private var dobStep: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("When's your birthday?").font(.system(size: 26, weight: .black))
            Text("We use your age to keep the community safe. You must be 15+ to join.")
                .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
            DatePicker("Date of birth", selection: $dob,
                       in: (Calendar.current.date(byAdding: .year, value: -100, to: Date()) ?? Date())...Date(),
                       displayedComponents: .date)
                .datePickerStyle(.wheel)
                .labelsHidden()
            if age < 15 {
                Text("You must be at least 15 to use Rally.").font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.destructive)
            } else if age > 100 {
                Text("Please check your date of birth.").font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.destructive)
            } else {
                Text("You're \(age) — you'll play with \(age < 18 ? "15–17 (teen)" : "18+ (adult)") players.")
                    .font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
            }
        }
    }

    private var cityStep: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Where do you play?").font(.system(size: 26, weight: .black))
            Text("We'll show games near your city.")
                .font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
            PlaceField(placeholder: "Start typing your city…", text: $cityText, selected: $place)
                .padding(12)
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
            if let p = place {
                Label(p.city, systemImage: "checkmark.circle.fill").foregroundStyle(Theme.primary).font(.system(size: 14, weight: .semibold))
            }
        }
    }

    private var sportsStep: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("What do you play?").font(.system(size: 26, weight: .black))
            Text("Pick your sports and skill level.").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
            ForEach(allSports) { s in
                let on = skills[s.key] != nil
                VStack(alignment: .leading, spacing: 8) {
                    Button {
                        if on { skills[s.key] = nil } else { skills[s.key] = "Intermediate" }
                    } label: {
                        HStack {
                            Text("\(s.emoji) \(s.name)").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.foreground)
                            Spacer()
                            Image(systemName: on ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(on ? Theme.primary : Theme.mutedForeground)
                        }
                    }
                    .buttonStyle(.plain)
                    if on {
                        Picker("Skill", selection: Binding(get: { skills[s.key] ?? "Intermediate" }, set: { skills[s.key] = $0 })) {
                            ForEach(skillLevels, id: \.self) { Text($0).tag($0) }
                        }
                        .pickerStyle(.segmented)
                    }
                }
                .padding(12)
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(on ? Theme.primary : Theme.border, lineWidth: 1))
            }
        }
    }

    private func finish() async {
        guard let p = place else { return }
        saving = true
        defer { saving = false }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        do {
            try await store.completeOnboarding(dob: f.string(from: dob), city: p.city, lat: p.lat, lng: p.lng, sports: skills)
        } catch {
            errorText = error.localizedDescription
        }
    }
}
