import SwiftUI

enum LegalDoc: String, Identifiable {
    case terms, privacy
    var id: String { rawValue }
    var title: String { self == .terms ? "Terms & Conditions" : "Privacy Policy" }
}

private struct LegalSection {
    let heading: String
    let body: String
}

private let termsSections: [LegalSection] = [
    LegalSection(heading: "1. What Rally is", body: "Rally is a platform that helps adults and teens (15+) find people to play pickup sports with. Rally does not organize, run, supervise, officiate, or sponsor any game, meetup, or activity arranged through the app."),
    LegalSection(heading: "2. Meetups are at your own risk", body: "All games and meetups are between users, at your own risk. You are solely responsible for your own safety and decisions. Rally does not verify the identity, background, skill level, health, or conduct of any user. We are not responsible for anything that happens before, during, or after an in-person meetup, including injury, loss, theft, harassment, or property damage.\\n\\nUse common sense: meet in public places, tell someone where you're going, don't share sensitive personal information, and leave if you feel unsafe."),
    LegalSection(heading: "3. Eligibility & age separation", body: "You must be at least 15 years old. Users 15–17 are placed in a separate pool from users 18+. You may only interact with users in your own pool."),
    LegalSection(heading: "4. Your conduct — zero tolerance", body: "There is no tolerance for objectionable content or abusive users. You agree not to harass, bully, threaten, discriminate against, or endanger other users; not to post hateful, sexual, violent, illegal, or misleading content; not to impersonate anyone; and not to use Rally for commercial solicitation without permission. We remove content and suspend or delete accounts that violate these rules."),
    LegalSection(heading: "5. Reporting and blocking", body: "You can report any user, message, game, or group from inside the app, and you can block any user at any time. Reports are reviewed by the Rally team, and we aim to act on them within 24 hours. Blocked users can't see you or contact you."),
    LegalSection(heading: "6. Content", body: "You are responsible for anything you post (game details, messages, photos, profile info). Don't share other users' private contact information without their consent."),
    LegalSection(heading: "7. No warranty", body: "Rally is provided \"as is\" without warranty of any kind. We do not guarantee that games will happen, that other players will show up, or that the app will always be available."),
    LegalSection(heading: "8. Limitation of liability", body: "To the maximum extent allowed by law, Rally and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the app or any meetup arranged through it."),
    LegalSection(heading: "9. Deleting your account", body: "You can delete your account at any time from the You tab. This permanently removes your profile, games you host, messages, photos, and other data."),
    LegalSection(heading: "10. Changes", body: "We may update these terms. Continued use after updates means you accept the new terms."),
]

private let privacySections: [LegalSection] = [
    LegalSection(heading: "What we collect", body: "• Account info: name, email, date of birth (used to determine your age pool).\\n• Profile info you add: sports, skill levels, city, bio, a profile photo, and any optional contact info (phone, Instagram, Snapchat) you save.\\n• Location: the city and approximate coordinates you set in your profile, used to show nearby games on the map. We don't track your device location in the background.\\n• Content you post: games, chat messages, chat photos, kudos, and group activity.\\n• Reports and blocks you submit, so we can keep the community safe."),
    LegalSection(heading: "How we use it", body: "• To match you with users and games in your own age pool.\\n• To show relevant games near you.\\n• To enable chat, friends, and groups.\\n• To keep the platform safe and review reports."),
    LegalSection(heading: "Contact info sharing", body: "Phone number, Instagram, Snapchat, and other handles saved in your profile are private by default. They are only shared with another user when you explicitly send them in a chat."),
    LegalSection(heading: "Age pools", body: "Users under 18 and users 18+ are stored in separated pools enforced at the database level. Data from one pool is never returned to users in the other pool."),
    LegalSection(heading: "Third parties", body: "Rally uses Apple Maps and OpenStreetMap for maps and place search, and a hosted backend (Supabase) for authentication and data storage. We don't sell your data and we don't use it for advertising or tracking."),
    LegalSection(heading: "Your choices", body: "You can edit your profile, remove contact info, hide your city, sports or activity, leave games and groups, or sign out at any time. You can permanently delete your account and all of your data from the You tab."),
    LegalSection(heading: "Contact", body: "Questions or requests: support@letsrallys.app"),
]

struct LegalView: View {
    @Environment(\.dismiss) private var dismiss
    let doc: LegalDoc

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(doc == .terms ? termsSections : privacySections, id: \.heading) { s in
                        Text(s.heading).font(.system(size: 14, weight: .bold))
                        Text(s.body.replacingOccurrences(of: "\\n", with: "\n"))
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.foreground.opacity(0.9))
                    }
                }
                .padding(20)
            }
            .background(Theme.background)
            .navigationTitle(doc.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
    }
}
