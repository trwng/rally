import Foundation

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

struct StoredSession: Codable {
    var accessToken: String
    var refreshToken: String
    var userId: String
}

private struct AuthResponse: Decodable {
    struct User: Decodable { let id: String }
    let accessToken: String?
    let refreshToken: String?
    let user: User?
}

private struct ErrorBody: Decodable {
    let message: String?
    let msg: String?
    let errorDescription: String?
    let error: String?
}

/// Talks to Supabase over plain HTTPS (the same backend the website uses).
final class API {
    static let shared = API()

    private(set) var session: StoredSession?
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
    private let sessionKey = "session"

    init() {
        if let data = Keychain.load(account: sessionKey),
           let s = try? JSONDecoder().decode(StoredSession.self, from: data) {
            session = s
        }
    }

    // MARK: Session

    private func store(_ s: StoredSession?) {
        session = s
        if let s, let data = try? JSONEncoder().encode(s) {
            Keychain.save(data, account: sessionKey)
        } else {
            Keychain.delete(account: sessionKey)
        }
    }

    func signOut() { store(nil) }

    /// Returns true when a full session was created (false = email confirmation needed).
    @discardableResult
    func signIn(email: String, password: String) async throws -> Bool {
        let body = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        let data = try await raw(
            "auth/v1/token", method: "POST",
            query: [URLQueryItem(name: "grant_type", value: "password")],
            body: body, authorized: false
        )
        return try adopt(data)
    }

    @discardableResult
    func signUp(email: String, password: String, fullName: String) async throws -> Bool {
        let payload: [String: Any] = [
            "email": email,
            "password": password,
            "data": ["full_name": fullName],
        ]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let data = try await raw(
            "auth/v1/signup", method: "POST",
            query: [URLQueryItem(name: "redirect_to", value: Config.siteURL)],
            body: body, authorized: false
        )
        return try adopt(data)
    }

    private func adopt(_ data: Data) throws -> Bool {
        let r = try decoder.decode(AuthResponse.self, from: data)
        guard let access = r.accessToken, let refresh = r.refreshToken, let uid = r.user?.id else {
            return false
        }
        store(StoredSession(accessToken: access, refreshToken: refresh, userId: uid))
        return true
    }

    /// Swap the refresh token for a new access token. Returns false if it no longer works.
    func refresh() async -> Bool {
        guard let current = session else { return false }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["refresh_token": current.refreshToken])
            let data = try await raw(
                "auth/v1/token", method: "POST",
                query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
                body: body, authorized: false, retry: false
            )
            return try adopt(data)
        } catch {
            return false
        }
    }

    // MARK: Database (PostgREST)

    func select<T: Decodable>(_ table: String, query: [URLQueryItem] = []) async throws -> [T] {
        var q = [URLQueryItem(name: "select", value: "*")]
        q.append(contentsOf: query)
        let data = try await raw("rest/v1/\(table)", query: q)
        return try decoder.decode([T].self, from: data)
    }

    func insert<B: Encodable>(_ table: String, body: B) async throws {
        let data = try JSONEncoder().encode(body)
        _ = try await raw("rest/v1/\(table)", method: "POST", body: data, prefer: "return=minimal")
    }

    func insertReturningId<B: Encodable>(_ table: String, body: B) async throws -> String {
        let data = try JSONEncoder().encode(body)
        let out = try await raw(
            "rest/v1/\(table)", method: "POST",
            query: [URLQueryItem(name: "select", value: "id")],
            body: data, prefer: "return=representation"
        )
        let rows = try decoder.decode([IdRow].self, from: out)
        guard let id = rows.first?.id else { throw APIError(message: "Couldn't save that.") }
        return id
    }

    func delete(_ table: String, query: [URLQueryItem]) async throws {
        _ = try await raw("rest/v1/\(table)", method: "DELETE", query: query)
    }

    func update<B: Encodable>(_ table: String, query: [URLQueryItem], body: B) async throws {
        let data = try JSONEncoder().encode(body)
        _ = try await raw("rest/v1/\(table)", method: "PATCH", query: query, body: data, prefer: "return=minimal")
    }

    // MARK: Storage

    /// Temporary link to a private avatar image.
    func signedAvatarURL(path: String) async -> URL? {
        struct Out: Decodable { let signedURL: String }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["expiresIn": 3600])
            let data = try await raw("storage/v1/object/sign/avatars/\(path)", method: "POST", body: body)
            let out = try JSONDecoder().decode(Out.self, from: data)
            return URL(string: Config.supabaseURL.absoluteString + "/storage/v1" + out.signedURL)
        } catch {
            return nil
        }
    }

    // MARK: Plumbing

    private func raw(
        _ path: String,
        method: String = "GET",
        query: [URLQueryItem] = [],
        body: Data? = nil,
        prefer: String? = nil,
        authorized: Bool = true,
        retry: Bool = true
    ) async throws -> Data {
        var comps = URLComponents(url: Config.supabaseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        guard let url = comps.url else { throw APIError(message: "Bad address.") }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.httpBody = body
        req.setValue(Config.anonKey, forHTTPHeaderField: "apikey")
        if body != nil { req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let prefer { req.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if authorized, let token = session?.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        if status == 401, authorized, retry, session != nil {
            if await refresh() {
                return try await raw(path, method: method, query: query, body: body,
                                     prefer: prefer, authorized: authorized, retry: false)
            }
        }
        guard (200..<300).contains(status) else {
            let e = try? decoder.decode(ErrorBody.self, from: data)
            throw APIError(message: e?.message ?? e?.msg ?? e?.errorDescription ?? e?.error ?? "Something went wrong (\(status)).")
        }
        return data
    }
}
