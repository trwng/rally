import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var store: Store
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            ScrollView {
                if let me = store.profile {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 14) {
                            AvatarView(name: me.fullName, seed: me.avatarSeed ?? me.id, path: me.avatarUrl, size: 72)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(me.fullName).font(.system(size: 24, weight: .black))
                                if let city = me.city, !city.isEmpty {
                                    Text(city).font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                                }
                                if let dob = me.dob, let age = ageFromDOB(dob) {
                                    Text("\(age) years old").font(.system(size: 13)).foregroundStyle(Theme.mutedForeground)
                                }
                            }
                        }
                        .padding(16)

                        if let bio = me.bio, !bio.isEmpty {
                            Text(bio).font(.system(size: 14)).padding(.horizontal, 16).padding(.bottom, 12)
                        }

                        Hairline()

                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeading("Your sports")
                            let sports = (me.sports ?? [:]).sorted { $0.key < $1.key }
                            if sports.isEmpty {
                                Text("No sports added yet.").font(.system(size: 14)).foregroundStyle(Theme.mutedForeground)
                            }
                            ForEach(sports, id: \.key) { key, level in
                                let s = sport(for: key)
                                HStack(spacing: 12) {
                                    Text(s.emoji)
                                        .frame(width: 36, height: 36)
                                        .background(s.color.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                                    Text(s.name).font(.system(size: 15, weight: .semibold))
                                    Spacer()
                                    Text(level).eyebrow()
                                }
                            }
                        }
                        .padding(16)

                        Hairline()

                        VStack(spacing: 10) {
                            HStack {
                                Text("Games played").font(.system(size: 14))
                                Spacer()
                                Text("\(store.playedCount)").font(.system(size: 14, weight: .bold)).monospacedDigit()
                            }
                            Link(destination: URL(string: "\(Config.siteURL)/privacy")!) {
                                HStack { Text("Privacy Policy"); Spacer(); Image(systemName: "arrow.up.right").font(.system(size: 12)) }
                                    .font(.system(size: 14))
                            }
                            .foregroundStyle(Theme.foreground)
                            Button("Sign out") { confirmSignOut = true }
                                .buttonStyle(PrimaryButtonStyle(filled: false, destructive: true))
                                .padding(.top, 8)
                        }
                        .padding(16)
                    }
                }
            }
            .scrollIndicators(.hidden)
            .background(Theme.background)
            .toolbar(.hidden, for: .navigationBar)
            .refreshable { await store.loadAll() }
            .confirmationDialog("Sign out of Rally?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { store.signOut() }
                Button("Cancel", role: .cancel) {}
            }
        }
    }
}
