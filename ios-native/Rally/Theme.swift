import SwiftUI
import UIKit

// Colors copied from the website (src/styles.css), converted to sRGB.

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { trait in
            UIColor(hex: trait.userInterfaceStyle == .dark ? dark : light)
        })
    }
    init(hex: UInt32) {
        self.init(uiColor: UIColor(hex: hex))
    }
}

enum Theme {
    static let background = Color(light: 0xFFFFFF, dark: 0x060A07)
    static let foreground = Color(light: 0x0A0F0B, dark: 0xF8F9F7)
    static let surface = Color(light: 0xF9FBF9, dark: 0x0C110D)
    static let muted = Color(light: 0xF2F4F2, dark: 0x171C18)
    static let mutedForeground = Color(light: 0x5A5F5B, dark: 0x949A95)
    static let border = Color(light: 0xE3E5E3, dark: 0x1C211D)
    static let primary = Color(light: 0x009B39, dark: 0x35BB58)
    static let primaryForeground = Color(light: 0xFBFCF9, dark: 0x040B05)
    static let primarySoft = Color(light: 0xE1FAE3, dark: 0x0B2C12)
    static let orange = Color(light: 0xFA6E1D, dark: 0xFF862E)
    static let orangeForeground = Color(light: 0x140B05, dark: 0x0F0703)
    static let destructive = Color(light: 0xDF202E, dark: 0xEE343B)

    static let radius: CGFloat = 6
}

/// Uppercase small label used for section captions on the website.
struct Eyebrow: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.system(size: 11, weight: .bold))
            .tracking(1.4)
            .textCase(.uppercase)
            .foregroundStyle(Theme.mutedForeground)
    }
}

extension View {
    func eyebrow() -> some View { modifier(Eyebrow()) }
}

struct PrimaryButtonStyle: ButtonStyle {
    var filled = true
    var destructive = false
    func makeBody(configuration: Configuration) -> some View {
        let tint = destructive ? Theme.destructive : Theme.primary
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 40)
            .foregroundStyle(filled ? Theme.primaryForeground : (destructive ? Theme.destructive : Theme.foreground))
            .background(filled ? tint : Color.clear)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(filled ? Color.clear : (destructive ? Theme.destructive.opacity(0.4) : Theme.border), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}
