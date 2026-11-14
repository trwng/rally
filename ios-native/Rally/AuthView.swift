import SwiftUI

struct AuthView: View {
    @EnvironmentObject var store: Store

    @State private var isSignup = true
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agreed = false
    @State private var showPassword = false
    @State private var legal: LegalDoc?
    @State private var loading = false
    @State private var message: String?
    @State private var messageIsError = true
    @FocusState private var focus: Field?

    private enum Field { case name, email, password }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Text("R")
                        .font(.system(size: 18, weight: .black))
                        .foregroundStyle(Theme.primaryForeground)
                        .frame(width: 40, height: 40)
                        .background(Theme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                    Text("Rally").font(.system(size: 20, weight: .black))
                }
                .padding(.bottom, 40)

                Text(isSignup ? "Create your account" : "Welcome back")
                    .font(.system(size: 28, weight: .black))
                Text(isSignup ? "Find pickup games near you. Takes a minute." : "Sign in to your Rally account.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.top, 6)
                    .padding(.bottom, 28)

                VStack(alignment: .leading, spacing: 14) {
                    if isSignup {
                        field("Full name") {
                            TextField("Sam Rivera", text: $name)
                                .textContentType(.name)
                                .focused($focus, equals: .name)
                        }
                    }
                    field("Email") {
                        TextField("you@example.com", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                    }
                    field("Password") {
                        HStack(spacing: 8) {
                            Group {
                                if showPassword {
                                    TextField("At least 6 characters", text: $password)
                                } else {
                                    SecureField("At least 6 characters", text: $password)
                                }
                            }
                            .textContentType(isSignup ? .newPassword : .password)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .password)
                            Button {
                                showPassword.toggle()
                            } label: {
                                Image(systemName: showPassword ? "eye.slash" : "eye")
                                    .font(.system(size: 16))
                                    .foregroundStyle(Theme.mutedForeground)
                                    .frame(width: 32, height: 32)
                            }
                            .accessibilityLabel(showPassword ? "Hide password" : "Show password")
                        }
                    }

                    if isSignup {
                        VStack(alignment: .leading, spacing: 5) {
                            requirement("Your name", ok: !name.trimmingCharacters(in: .whitespaces).isEmpty, touched: !name.isEmpty)
                            requirement("A valid email address", ok: emailLooksValid, touched: !email.isEmpty)
                            requirement("Password is at least 6 characters", ok: password.count >= 6, touched: !password.isEmpty)
                        }
                    }

                    if isSignup {
                        Button {
                            agreed.toggle()
                        } label: {
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: agreed ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(agreed ? Theme.primary : Theme.mutedForeground)
                                Text("I'm 15 or older and I agree to Rally's Terms & Conditions and Privacy Policy. I understand games are organized between users at their own risk and Rally is not responsible for in-person meetups.")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                                    .multilineTextAlignment(.leading)
                            }
                        }
                        .buttonStyle(.plain)
                        HStack(spacing: 14) {
                            Button("Terms") { legal = .terms }
                            Button("Privacy Policy") { legal = .privacy }
                        }
                        .font(.system(size: 12, weight: .semibold))
                    }

                    if let message {
                        Text(message)
                            .font(.system(size: 13))
                            .foregroundStyle(messageIsError ? Theme.destructive : Theme.primary)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        if loading { ProgressView().tint(Theme.primaryForeground) }
                        else { Text(isSignup ? "Create account" : "Sign in") }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(height: 44)
                    .disabled(loading || (isSignup && (!agreed || name.trimmingCharacters(in: .whitespaces).isEmpty)) || !emailLooksValid || password.count < 6)
                    .opacity((isSignup && !agreed) ? 0.5 : 1)
                    .padding(.top, 4)
                }

                HStack(spacing: 4) {
                    Spacer()
                    Text(isSignup ? "Already have an account?" : "New to Rally?")
                        .foregroundStyle(Theme.mutedForeground)
                    Button(isSignup ? "Sign in" : "Create one") {
                        isSignup.toggle()
                        message = nil
                    }
                    .fontWeight(.semibold)
                    Spacer()
                }
                .font(.system(size: 13))
                .padding(.top, 24)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 40)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.background.ignoresSafeArea())
        .sheet(item: $legal) { LegalView(doc: $0) }
    }

    private var emailLooksValid: Bool {
        let e = email.trimmingCharacters(in: .whitespaces)
        guard let at = e.firstIndex(of: "@"), at != e.startIndex else { return false }
        let domain = e[e.index(after: at)...]
        return domain.contains(".") && !domain.hasSuffix(".") && !domain.hasPrefix(".")
    }

    private func requirement(_ text: String, ok: Bool, touched: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: ok ? "checkmark.circle.fill" : (touched ? "xmark.circle.fill" : "circle"))
                .foregroundStyle(ok ? Theme.primary : (touched ? Theme.destructive : Theme.mutedForeground))
            Text(text)
                .foregroundStyle(ok ? Theme.foreground : Theme.mutedForeground)
        }
        .font(.system(size: 12))
    }

    private func field<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 12, weight: .semibold))
            content()
                .font(.system(size: 15))
                .padding(.horizontal, 12)
                .frame(height: 44)
                .background(Theme.background)
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.border, lineWidth: 1))
        }
    }

    private func submit() async {
        focus = nil
        loading = true
        message = nil
        defer { loading = false }
        do {
            if isSignup {
                let signedIn = try await store.signUp(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password,
                    name: name.trimmingCharacters(in: .whitespaces)
                )
                if !signedIn {
                    messageIsError = false
                    message = "Account created. Check your email to confirm it, then sign in."
                    isSignup = false
                }
            } else {
                try await store.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            }
        } catch {
            messageIsError = true
            message = error.localizedDescription
        }
    }
}
