import SwiftUI

struct ReportTarget: Identifiable {
    let id = UUID()
    let type: String      // user | message | game | group
    let targetId: String
    let label: String
}

struct ReportView: View {
    @EnvironmentObject var store: Store
    @Environment(\.dismiss) private var dismiss
    let target: ReportTarget

    @State private var reason = "harassment"
    @State private var details = ""
    @State private var sending = false
    @State private var done = false
    @State private var errorText: String?

    private let reasons: [(String, String)] = [
        ("harassment", "Harassment or bullying"),
        ("hate_speech", "Hate speech"),
        ("spam", "Spam or scam"),
        ("inappropriate", "Inappropriate content"),
        ("safety", "Safety concern"),
        ("impersonation", "Impersonation"),
        ("other", "Something else"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                if done {
                    Section {
                        Text("Thanks — we'll review this report.")
                    }
                } else {
                    Section("Reporting \(target.label)") {
                        Picker("Reason", selection: $reason) {
                            ForEach(reasons, id: \.0) { Text($0.1).tag($0.0) }
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                    }
                    Section("Details (optional)") {
                        TextField("Tell us what happened", text: $details, axis: .vertical).lineLimit(3...6)
                    }
                    if let errorText {
                        Text(errorText).foregroundStyle(Theme.destructive)
                    }
                }
            }
            .navigationTitle("Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(done ? "Close" : "Cancel") { dismiss() } }
                if !done {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(sending ? "Sending…" : "Submit") { Task { await submit() } }.disabled(sending)
                    }
                }
            }
        }
    }

    private func submit() async {
        sending = true
        defer { sending = false }
        do {
            try await store.report(targetType: target.type, targetId: target.targetId, reason: reason, details: details)
            done = true
        } catch {
            errorText = error.localizedDescription
        }
    }
}
