package ke.co.josongeri.qms.core.config

import ke.co.josongeri.qms.BuildConfig
import ke.co.josongeri.qms.core.storage.SettingsStore
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Resolves the API base URL via a 3-layer strategy:
 *
 * 1. User-entered `api_url` stored in DataStore (highest priority).
 * 2. Remote discovery: GET https://josongeri.co.ke/api-discovery.json
 *    → `{ "apiUrl": "..." }` (short timeout, fails silently).
 * 3. Build-time default: BuildConfig.API_BASE_URL.
 *
 * The resolved URL is cached in memory and in DataStore (`resolved_host`)
 * so a failed discovery doesn't block future launches.
 */
@Singleton
class HostProvider @Inject constructor(
    private val settings: SettingsStore,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val mutex = Mutex()

    @Volatile
    private var memoryCache: String? = null

    private val discoveryClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(3, TimeUnit.SECONDS)
            .build()
    }

    /** Returns the resolved API origin, e.g. `https://quotation.josongeri.co.ke` (no trailing slash). */
    suspend fun baseUrl(): String {
        memoryCache?.let { return it }
        return mutex.withLock {
            memoryCache?.let { return it }

            // 1. User override
            val userUrl = settings.getApiUrl()?.takeIf { it.isNotBlank() }
            val resolved = when {
                userUrl != null -> normalize(userUrl)
                else -> {
                    // 2. Cached discovery result, else fresh discovery, else build default
                    settings.getCachedHost()?.takeIf { it.isNotBlank() }
                        ?: discover().also { discovered ->
                            if (discovered != null) settings.setCachedHost(discovered)
                        }
                        ?: normalize(BuildConfig.API_BASE_URL)
                }
            }
            memoryCache = resolved
            resolved
        }
    }

    /** Base URL suitable for Retrofit (must end in `/`). */
    suspend fun retrofitBaseUrl(): String = baseUrl().trimEnd('/') + "/"

    /** Clears memory + persisted caches; next call re-resolves from layer 1. */
    fun invalidate() {
        memoryCache = null
    }

    suspend fun invalidateAll() {
        memoryCache = null
        settings.setCachedHost(null)
    }

    /** Default (non-user) URL for prefilling UI fields. */
    suspend fun defaultUrl(): String =
        settings.getCachedHost()?.takeIf { it.isNotBlank() }
            ?: normalize(BuildConfig.API_BASE_URL)

    private fun discover(): String? = runCatching {
        val request = Request.Builder()
            .url(DISCOVERY_URL)
            .get()
            .build()
        discoveryClient.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) return null
            val body = resp.body?.string() ?: return null
            json.decodeFromString<DiscoveryDoc>(body).apiUrl
                ?.takeIf { it.isNotBlank() }
                ?.let { normalize(it) }
        }
    }.getOrNull()

    companion object {
        const val DISCOVERY_URL = "https://josongeri.co.ke/api-discovery.json"

        /**
         * Normalises user/discovery input into an origin:
         * - adds `https://` when the scheme is missing
         * - strips trailing `/`, `/api`, `/api/v1` path suffixes
         */
        fun normalize(raw: String): String {
            var url = raw.trim()
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://$url"
            }
            url = url.trimEnd('/')
            url = url.removeSuffix("/api/v1").removeSuffix("/api")
            return url.trimEnd('/')
        }
    }

    @Serializable
    private data class DiscoveryDoc(val apiUrl: String? = null)
}
