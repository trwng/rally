import SwiftUI
import PhotosUI
import UIKit

struct ChatView: View {
    @EnvironmentObject var store: Store
    let key: String

    @State private var text = ""
    @State private var sending = false
    @State private var errorText: String?
    @State private var pickerItem: PhotosPickerItem?
    @State private var photoPaths: [String] = []
    @State private var uploading = false
    @State private var report: ReportTarget?
    @FocusState private var focused: Bool

    private var messages: [MessageRow] { store.messagesByKey[key] ?? [] }
    private var isMulti: Bool { key.hasPrefix("g:") || key.hasPrefix("gr:") }

    private var titleInfo: (title: String, subtitle: String) {
        if key.hasPrefix("g:") {
            let id = String(key.dropFirst(2))
            if let g = store.allGames.first(where: { $0.id == id }) {
                let s = sport(for: g.sport)
                return ("\(s.name) · \(g.whenLabel.components(separatedBy: ",").first ?? g.whenLabel)",
                        "\(g.location) · \(g.spotsTaken)/\(g.spotsTotal) players")
            }
        } else if key.hasPrefix("gr:") {
            let id = String(key.dropFirst(3))
            if let g = store.groups.first(where: { $0.id == id }) {
                return (g.name, "\(store.members(of: id).count) members")
            }
        } else if key.hasPrefix("dm:") {
            let id = String(key.dropFirst(3))
            if let p = store.person(id) { return (p.fullName, p.city ?? "Direct message") }
        }
        return ("Chat", "")
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        if messages.isEmpty {
                            EmptyNote(text: "No messages yet. Say hi 👋")
                        }
                        ForEach(messages) { m in
                            bubble(m).id(m.id)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                .scrollIndicators(.hidden)
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: messages.count) {
                    if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
                .onAppear {
                    if let last = messages.last { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }

            Hairline()
            composer
        }
        .background(Theme.background)
        .navigationTitle(titleInfo.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 0) {
                    Text(titleInfo.title).font(.system(size: 15, weight: .bold)).lineLimit(1)
                    Text(titleInfo.subtitle).font(.system(size: 11)).foregroundStyle(Theme.mutedForeground).lineLimit(1)
                }
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .sheet(item: $report) { ReportView(target: $0) }
        .task {
            await store.markRead(key)
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                await store.reloadMessages()
            }
        }
        .onChange(of: messages.count) {
            Task { await store.markRead(key) }
        }
        .onChange(of: pickerItem) {
            guard let item = pickerItem else { return }
            Task { await attach(item) }
        }
    }

    // MARK: Bubbles

    @ViewBuilder
    private func bubble(_ m: MessageRow) -> some View {
        let mine = m.authorUserId == store.userId
        HStack(alignment: .bottom, spacing: 8) {
            if mine { Spacer(minLength: 48) }
            if !mine {
                Button { store.openPlayer(m.authorUserId) } label: {
                    PersonAvatar(profile: store.person(m.authorUserId), fallbackName: m.authorName, size: 28)
                }
                .buttonStyle(.plain)
            }
            VStack(alignment: mine ? .trailing : .leading, spacing: 3) {
                if !mine && isMulti {
                    Text(m.authorName).font(.system(size: 11, weight: .semibold)).foregroundStyle(Theme.mutedForeground)
                }
                if let paths = m.attachments, !paths.isEmpty {
                    ForEach(paths, id: \.self) { ChatImage(path: $0) }
                }
                if m.kind == "contact" {
                    contactCard(m, mine: mine)
                } else if !m.text.isEmpty {
                    Text(m.text)
                        .font(.system(size: 15))
                        .foregroundStyle(mine ? Theme.primaryForeground : Theme.foreground)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(mine ? Theme.primary : Theme.muted)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                Text(m.date.formatted(date: .omitted, time: .shortened))
                    .font(.system(size: 10)).foregroundStyle(Theme.mutedForeground)
            }
            .contextMenu {
                if !m.text.isEmpty { Button("Copy") { UIPasteboard.general.string = m.text } }
                if !mine {
                    Button("Report message", systemImage: "flag") {
                        report = ReportTarget(type: "message", targetId: m.id, label: "this message")
                    }
                }
            }
            if !mine { Spacer(minLength: 48) }
        }
    }

    private func contactCard(_ m: MessageRow, mine: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(m.payload?.label ?? "Contact").eyebrow()
            Text(m.payload?.value ?? m.text).font(.system(size: 15, weight: .semibold)).textSelection(.enabled)
        }
        .padding(12)
        .background(Theme.primarySoft)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.primary.opacity(0.4), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: Composer

    private struct ContactItem: Identifiable {
        let label: String
        let value: String
        var id: String { label }
    }

    private var contactItems: [ContactItem] {
        guard let p = store.profile else { return [] }
        var out: [ContactItem] = []
        if let v = p.phone, !v.isEmpty { out.append(ContactItem(label: "Phone", value: v)) }
        if let v = p.instagram, !v.isEmpty { out.append(ContactItem(label: "Instagram", value: v)) }
        if let v = p.snapchat, !v.isEmpty { out.append(ContactItem(label: "Snapchat", value: v)) }
        if let v = p.otherSocial, !v.isEmpty { out.append(ContactItem(label: "Other", value: v)) }
        return out
    }

    private var composer: some View {
        VStack(spacing: 6) {
            if !photoPaths.isEmpty || uploading {
                HStack {
                    if uploading { ProgressView() }
                    ForEach(photoPaths, id: \.self) { _ in
                        Image(systemName: "photo.fill").foregroundStyle(Theme.primary)
                    }
                    Text(photoPaths.isEmpty ? "Uploading…" : "\(photoPaths.count) photo\(photoPaths.count == 1 ? "" : "s") attached")
                        .font(.system(size: 12)).foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    if !photoPaths.isEmpty { Button("Remove") { photoPaths = [] }.font(.system(size: 12)) }
                }
                .padding(.horizontal, 14)
            }
            if let errorText {
                Text(errorText).font(.system(size: 12)).foregroundStyle(Theme.destructive).padding(.horizontal, 14)
            }
            HStack(spacing: 10) {
                Menu {
                    if contactItems.isEmpty {
                        Text("Add contact info in your profile first.")
                    } else {
                        ForEach(contactItems) { item in
                            Button("Share \(item.label)") {
                                Task { await sendContact(item.label, item.value) }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "person.crop.circle.badge.plus").font(.system(size: 20))
                }
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Image(systemName: "photo").font(.system(size: 20))
                }
                TextField(photoPaths.isEmpty ? "Message…" : "Add a caption…", text: $text, axis: .vertical)
                    .lineLimit(1...4)
                    .focused($focused)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Theme.muted)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                Button {
                    Task { await send() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.system(size: 30))
                }
                .disabled(sending || (text.trimmingCharacters(in: .whitespaces).isEmpty && photoPaths.isEmpty))
            }
            .padding(.horizontal, 14)
            .tint(Theme.primary)
        }
        .padding(.vertical, 8)
        .background(Theme.background)
    }

    private func send() async {
        sending = true
        defer { sending = false }
        let t = text
        let photos = photoPaths
        text = ""
        photoPaths = []
        do {
            try await store.send(key, text: t, attachments: photos)
        } catch {
            text = t
            photoPaths = photos
            errorText = error.localizedDescription
        }
    }

    private func sendContact(_ label: String, _ value: String) async {
        do {
            try await store.send(key, text: "\(label): \(value)", contact: ContactPayload(label: label, value: value))
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func attach(_ item: PhotosPickerItem) async {
        uploading = true
        defer { uploading = false; pickerItem = nil }
        do {
            guard let raw = try await item.loadTransferable(type: Data.self),
                  let jpeg = compressedJPEG(from: raw) else {
                errorText = "Couldn't read that photo."
                return
            }
            let path = try await store.uploadChatPhoto(key, data: jpeg)
            photoPaths.append(path)
        } catch {
            errorText = error.localizedDescription
        }
    }
}
