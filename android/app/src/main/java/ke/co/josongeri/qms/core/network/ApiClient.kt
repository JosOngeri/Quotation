package ke.co.josongeri.qms.core.network

import retrofit2.converter.kotlinx.serialization.asConverterFactory
import ke.co.josongeri.qms.BuildConfig
import ke.co.josongeri.qms.core.config.HostProvider
import ke.co.josongeri.qms.core.storage.TokenStore
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Builds (and rebuilds, when the host changes) the Retrofit [ApiService].
 * Adds the Bearer token from [TokenStore] and handles 401 by clearing it.
 */
@Singleton
class ApiClient @Inject constructor(
    private val hostProvider: HostProvider,
    private val tokenStore: TokenStore,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val mutex = Mutex()

    @Volatile
    private var cached: Pair<String, ApiService>? = null

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = tokenStore.getToken()
        val request = if (token != null) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else original

        val response: Response = chain.proceed(request)
        if (response.code == 401) {
            tokenStore.clear()
        }
        response
    }

    private val okHttp: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.HTTP_LOGGING) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BODY
                        }
                    )
                }
            }
            .build()
    }

    /** Returns the ApiService for the currently resolved host, rebuilding if it changed. */
    suspend fun service(): ApiService {
        val base = hostProvider.retrofitBaseUrl()
        cached?.let { (url, svc) -> if (url == base) return svc }
        return mutex.withLock {
            cached?.let { (url, svc) -> if (url == base) return svc }
            val svc = Retrofit.Builder()
                .baseUrl(base)
                .client(okHttp)
                .addConverterFactory(
                    json.asConverterFactory("application/json".toMediaType())
                )
                .build()
                .create(ApiService::class.java)
            cached = base to svc
            svc
        }
    }

    /** Force rebuild on next [service] call (e.g. after the user changes the host). */
    fun invalidate() {
        cached = null
    }

    /**
     * One-off health probe against an arbitrary host (used by "Test connection").
     * Independent of the configured host so unsaved values can be validated.
     */
    fun probeHealth(hostOrigin: String): Boolean = runCatching {
        val client = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()
        val request = okhttp3.Request.Builder()
            .url(hostOrigin.trimEnd('/') + "/api/health")
            .get()
            .build()
        client.newCall(request).execute().use { it.isSuccessful }
    }.getOrDefault(false)
}
