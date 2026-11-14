import SwiftUI

struct GroupsView: View {
    var body: some View { ComingSoon(title: "Groups", note: "Crews and clubs are next on the list.") }
}

struct ComingSoon: View {
    let title: String
    let note: String
    var body: some View {
        VStack(spacing: 8) {
            Text(title).font(.system(size: 28, weight: .black))
            Text(note)
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}
