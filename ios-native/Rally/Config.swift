import Foundation

/// Public Supabase settings (same ones the website uses). Safe to ship in the app.
enum Config {
    static let supabaseURL = URL(string: "https://hmiltvzjpplvgfreetqz.supabase.co")!
    static let anonKey = "sb_publishable_dvcuIIN-tomemGdweAS51A_vW74pkxX"
    static let siteURL = "https://letsrallys.app"
    /// Optional: your free Meta developer App ID. Instagram can use it to credit shares from Rally.
    static let metaAppID = ""
}
