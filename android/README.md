# QMS Android App

Native Android client for the Quotation Management System (QMS). Talks to the
REST API at `https://quotation.josongeri.co.ke` (all endpoints under `/api/v1`).

## Opening in Android Studio

1. Install Android Studio (Hedgehog or newer) with Android SDK 34.
2. **File → Open** and select the `android/` directory (this folder is a
   self-contained Gradle project).
3. Let Gradle sync. If the wrapper JAR is missing, Android Studio will
   regenerate it, or run `gradle wrapper` from this directory.
4. Run the `app` configuration on a device/emulator (minSdk 24).

## Architecture

- Kotlin 2.0 + Jetpack Compose (BOM 2024.09) + Material 3, Navigation Compose
- Hilt (KSP) for DI, StateFlow-based ViewModels
- Retrofit 2.11 + OkHttp 4.12 + kotlinx-serialization
- DataStore Preferences for settings, EncryptedSharedPreferences for the JWT
- Coil for images; `socket.io-client` dependency included (service stubbed)

Package root: `ke.co.josongeri.qms`

```
QmsApp.kt                  @HiltAndroidApp
MainActivity.kt            Compose host, picks start route from stored token
di/AppModule.kt            Hilt module
core/config/HostProvider   3-layer API host resolution
core/network/              ApiClient, ApiService, dto/
core/storage/              TokenStore (encrypted), SettingsStore (DataStore)
core/util/Result.kt        sealed Result + apiCall{} error mapper
data/                      AuthRepository, QuoteRepository
features/auth|dashboard|quotes|settings
navigation/AppNavHost.kt   login / dashboard / quotes / quote/{id} / settings
ui/theme/                  Material3 light + dark theme
```

## API host resolution (3 layers)

`HostProvider.baseUrl()` resolves the API origin in this order:

1. **User override** — `api_url` in DataStore (set on the Login → Advanced
   section or in Settings). Wins over everything.
2. **Remote discovery** — `GET https://josongeri.co.ke/api-discovery.json`
   → `{ "apiUrl": "..." }`. Short (3 s) timeout, fails silently; the result is
   cached in DataStore (`resolved_host`) so future launches don't wait.
3. **Build default** — `BuildConfig.API_BASE_URL`.

Input is normalized: a missing scheme becomes `https://`, and trailing `/`,
`/api`, or `/api/v1` suffixes are stripped, so both origins and full API paths
are accepted.

### Changing the default host at build time

Set `API_BASE_URL` in `android/gradle.properties`, or override it in
`android/local.properties` (not committed):

```properties
API_BASE_URL=https://my-new-host.example.com
```

### Changing the host at runtime

- **Login screen → Advanced**: enter the Server URL, tap **Test connection**
  (probes `GET <host>/api/health`), then sign in.
- **Settings**: edit the Server URL, **Test connection**, **Save**
  (validates then persists + rebuilds the Retrofit client), or
  **Reset to default**.

## Auth & API conventions

- `POST /api/v1/auth/login` `{email, password}` → `{data:{token, user}}`;
  the JWT is stored in EncryptedSharedPreferences and sent as
  `Authorization: Bearer …`. A `401` response clears the token.
- Lists return `{data:[…], pagination:{page,pageSize,total,totalPages}}`.
- Errors return `{error:{code,message}}` — parsed by `apiCall {}`.
- Quote detail flow: `GET /quotes/:id` → `GET /quotes/:id/revisions`
  (pick `current_revision_id`, else first) → `GET /quotes/:id/revisions/:rev/tree`,
  rendered as an expandable tree of nodes/items with minor-unit amounts
  displayed as `value/100` + currency code.

## Demo flow

1. Launch the app → Login screen. (Advanced section lets you point at another
   server and test it.)
2. Sign in with your QMS credentials → Dashboard.
3. Tap **Quotes** → search / paginate → tap a quote → expandable revision tree.
4. Settings (gear icon) → change/reset server URL, log out.

## Notes / stubs

- `socket.io-client` is on the classpath but no real-time service is wired yet.
- `gradle/wrapper/gradle-wrapper.jar` is not committed; Android Studio or
  `gradle wrapper` generates it.
- Projects / Clients / Products dashboard cards are placeholders — only Quotes
  is implemented.
- Cleartext HTTP is allowed in **debug** builds only (debug manifest override);
  release enforces the `network_security_config.xml` (cleartext off).
