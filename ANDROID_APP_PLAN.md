# QMS Android App — Implementation Plan

## 1. Overview

A native Android app for the Quotation Management System that consumes the existing REST API currently hosted at `https://quotation.josongeri.co.ke`.

**Key requirement:** the API host must be **changeable without rebuilding the app** (and also overridable at build time for white-labeling).

---

## 2. Tech Stack Decision

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Kotlin + Jetpack Compose** (native) | Best performance, full platform APIs, official | More code to write | **Recommended** |
| React Native | Shares JS/React knowledge with frontend | Heavier, bridging issues | Alternative if team prefers JS |
| Flutter | Single codebase for iOS later | New language (Dart) | Alternative if iOS is planned |

**Recommendation: Kotlin + Jetpack Compose + MVVM** — the backend is already API-first, so a thin native client is the cleanest fit.

Supporting libraries:
- **Retrofit + OkHttp** — REST client (interceptor adds `Authorization: Bearer <jwt>`)
- **Kotlinx Serialization** or **Moshi** — JSON
- **Hilt** — dependency injection
- **DataStore** (Preferences) — token + host config storage
- **EncryptedSharedPreferences / Keystore** — secure token storage
- **Socket.IO client (Java)** — real-time updates (`socket.io-client` for JVM)
- **Coil** — image loading (file attachments, avatars)
- **WorkManager** — background sync / offline queue
- **Material 3 (Compose)** — UI components, dynamic theming

---

## 3. Dynamic Host Configuration (the core requirement)

The host must be resolvable at **runtime** and overridable at **build time**. Implement a three-layer resolution order:

### Layer 1 — Runtime override (in-app settings)
A **"Server" or "Environment" field on the login screen** (and in Settings) lets the user enter any base URL. Stored in `DataStore`. This is what makes host changes survivable without an update.

```
Login Screen
  ├── Email / Password fields
  ├── "Advanced" expandable → Server URL field (prefilled with current default)
  └── "Test connection" button → calls GET /api/health
```

### Layer 2 — Remote config / discovery (optional, recommended)
A **well-known endpoint** on a stable domain (or Firebase Remote Config) returns the current API URL. On app start the app fetches `https://josongeri.co.ke/api-discovery.json` (a tiny static JSON file you control) → gets `{ "apiUrl": "https://quotation.josongeri.co.ke" }`. If you ever move hosts, you update that one JSON file and every installed app follows automatically.

```kotlin
// Pseudo-flow
val discovered = fetch("https://josongeri.co.ke/api-discovery.json").apiUrl
val stored = dataStore.apiUrl            // user override
val buildDefault = BuildConfig.API_BASE_URL // compile-time fallback

baseUrl = stored ?: discovered ?: buildDefault
```

### Layer 3 — Build-time default (BuildConfig)
The default host lives in `gradle.properties` / `build.gradle.kts` `buildConfigField`, so CI and flavors can produce builds pointed at different environments (dev / staging / prod) without touching code.

```kotlin
// app/build.gradle.kts
buildTypes {
    debug   { buildConfigField("String", "API_BASE_URL", "\"https://quotation.josongeri.co.ke\"") }
    release { buildConfigField("String", "API_BASE_URL", "\"https://quotation.josongeri.co.ke\"") }
}
```

### Resolution order (highest priority first)
1. **User-entered URL** (DataStore) — wins always
2. **Remote discovery file** — updated remotely
3. **BuildConfig default** — compile-time fallback

```kotlin
object ApiConfig {
    suspend fun resolve(context: Context): String {
        val user = dataStore.userApiUrl.first()          // Layer 1
        if (!user.isNullOrBlank()) return user
        val remote = runCatching { fetchDiscovery() }.getOrNull()  // Layer 2
        if (!remote.isNullOrBlank()) return remote
        return BuildConfig.API_BASE_URL                  // Layer 3
    }
}
```

All Retrofit/OkHttp clients are built from a `HostProvider` interface so switching hosts at runtime rebuilds the client — never read a URL string directly.

---

## 4. Feature Scope (mirrors the web app)

### Phase A — Core (MVP)
- [ ] **Login** — unified email/password login (the backend already auto-detects platform_admin / tenant / client via `POST /auth/login`)
- [ ] **Dashboard** — quote/project summary cards
- [ ] **Quotes** — list, view detail, the **nested tree** (sections → subsections → items) with totals
- [ ] **Quote editor** — add/edit/delete nodes & items, publish
- [ ] **Clients / Suppliers / Products** — list + search + detail
- [ ] **Profile / Settings** — server URL override, logout

### Phase B — Operational
- [ ] **Projects** — list, cost events, cost summary
- [ ] **Approvals** — pending list, approve/reject (tenant_admin)
- [ ] **Audit log viewer** (tenant_admin)
- [ ] **File attachments** — upload (camera/gallery) + download
- [ ] **Analytics** — summary + charts (win rate, quotes by month)

### Phase C — Advanced
- [ ] **2FA** — TOTP setup + verify flow
- [ ] **Offline mode** — Room cache + WorkManager sync queue
- [ ] **Push notifications** — FCM for quote/approval events (backend emits socket events already; add an FCM bridge)
- [ ] **PDF** — view/download generated quote PDFs
- [ ] **Biometric unlock** — re-auth with fingerprint before showing sensitive data

---

## 5. Architecture

```
┌─────────────────────────────────────┐
│  UI (Jetpack Compose screens)       │
│  ─ Navigation component             │
├─────────────────────────────────────┤
│  ViewModels (StateFlow<UiState>)    │
├─────────────────────────────────────┤
│  Repositories                       │
│  ─ QuoteRepository, AuthRepository, │
│    ClientRepository, ...            │
├─────────────────────────────────────┤
│  Data sources                       │
│  ─ ApiService (Retrofit)            │
│  ─ SocketService (Socket.IO)        │
│  ─ Local: Room DB + DataStore       │
├─────────────────────────────────────┤
│  HostProvider (dynamic base URL)    │  ← the dynamic part
└─────────────────────────────────────┘
```

- **Auth**: JWT in EncryptedSharedPreferences; OkHttp interceptor injects `Authorization: Bearer <token>`; 401 → clear token → navigate to login (same contract as web `lib/axios.ts`).
- **Errors**: map `{ error: { code, message } }` → sealed `Result<T>` / `ApiError`.
- **Pagination**: the API returns `{ data, pagination }` — use Paging 3 for lists.
- **Real-time**: Socket.IO client connects with `auth: { token }`; subscribe to `quote:update`, `project:update`, etc. → show in-app banner/snackbar.

---

## 6. API Contract (already implemented on the backend)

All endpoints are under `<host>/api/v1` and use Bearer JWT:

| Feature | Endpoints |
|---------|-----------|
| Auth | `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/workspaces`, `POST /auth/switch-workspace` |
| Quotes | `GET/POST /quotes`, `GET/PUT/DELETE /quotes/:id`, `POST /quotes/:id/publish`, `POST /quotes/:id/new-revision`, `POST /quotes/:id/submit-for-approval`, `GET/POST /quotes/:id/comments` |
| Quote tree | `GET /quotes/:id/revisions`, `GET .../tree`, `POST/PUT/DELETE .../nodes[...]`, `POST/PUT/DELETE .../items[...]` |
| Approvals | `GET /quotes/approvals/pending`, `POST .../approvals/:id/approve|reject` |
| Templates | `GET/POST/PUT/DELETE /quote-templates`, `POST /quote-templates/:id/apply` |
| Categories | `GET/POST/PUT/DELETE /product-categories`, `.../varieties` |
| Products | `GET/POST/PUT/DELETE /products?search&categoryId&varietyId` |
| Clients | `GET/POST/PUT/DELETE /clients?search` |
| Suppliers | `GET/POST/PUT/DELETE /suppliers`, `.../offers`, `/offers/for-product/:productId` |
| Projects | `GET/POST/PUT/DELETE /projects`, `.../cost-events`, `.../cost-summary` |
| Files | `POST /files/upload`, `GET /files`, `GET /files/:id/download`, `DELETE /files/:id` |
| Audit | `GET /audit-logs`, `GET /audit-logs/export` |
| 2FA | `POST /two-factor/setup|verify|disable`, `GET /two-factor/status` |
| Analytics | `GET /analytics/summary|quotes|win-loss-ratios|conversion-rates` |
| Health | `GET /api/health` (used by "Test connection") |

> Because the app is just a client of these endpoints, **no backend changes are needed** for the mobile app to work — the API is already unified and token-based.

---

## 7. Build & Release

- **Flavors**: `dev` / `staging` / `prod` → different `API_BASE_URL` + app name suffix (`QMS Dev`).
- **CI (GitHub Actions)**: `./gradlew assembleRelease` → sign with keystore in secrets → artifact / Firebase App Distribution / Play internal track.
- **Versioning**: `versionCode` auto-increment from CI run number; `versionName` matches release tag (`1.1.0`).
- **Host migration playbook**: change the **remote discovery JSON** first (Layer 2) so existing installs migrate automatically; the BuildConfig default only affects *new* installs.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Host changes break installed apps | Runtime override + remote discovery (Section 3) |
| Token expiry | 401 interceptor → silent refresh or re-login; keep `expiresIn` reasonable |
| Deep quote trees on small screen | Collapsible/expandable tree nodes, virtualized lists |
| Enum/array serialization (`{a,b}`) | Already fixed server-side (`normalizeRoles`); client just parses JSON array |
| Rate limiting on login | Exponential backoff + clear error messages |
| Self-signed/dev certs | `network_security_config.xml` to allow cleartext only in debug builds |

---

## 9. Estimated milestones

| Milestone | Content |
|-----------|---------|
| **M0** | Project scaffold, HostProvider, login, token storage |
| **M1** | Dashboard, quotes list, quote tree viewer |
| **M2** | Quote editor (nodes/items), publish, comments |
| **M3** | Clients/suppliers/products, projects, approvals |
| **M4** | Files, analytics, audit log |
| **M5** | 2FA, offline, push, polish, release |

---

## 10. Next step

If you want me to **scaffold the Android project** now (Kotlin + Compose + the dynamic `HostProvider` + login + a working quotes list against `https://quotation.josongeri.co.ke`), say so and I'll create the project under `android/` in this repo.
