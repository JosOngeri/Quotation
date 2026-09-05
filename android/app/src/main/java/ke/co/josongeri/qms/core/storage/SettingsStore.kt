package ke.co.josongeri.qms.core.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "qms_settings")

/**
 * Non-secret settings: API URL override, current workspace, cached resolved host.
 */
@Singleton
class SettingsStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val API_URL = stringPreferencesKey("api_url")
        val WORKSPACE = stringPreferencesKey("workspace_slug")
        val CACHED_HOST = stringPreferencesKey("resolved_host")
    }

    val apiUrl: Flow<String?> = context.dataStore.data.map { it[Keys.API_URL] }
    val workspace: Flow<String?> = context.dataStore.data.map { it[Keys.WORKSPACE] }
    val cachedHost: Flow<String?> = context.dataStore.data.map { it[Keys.CACHED_HOST] }

    suspend fun getApiUrl(): String? = apiUrl.first()

    suspend fun setApiUrl(url: String?) {
        context.dataStore.edit { prefs ->
            if (url == null) prefs.remove(Keys.API_URL) else prefs[Keys.API_URL] = url
        }
    }

    suspend fun getCachedHost(): String? = cachedHost.first()

    suspend fun setCachedHost(url: String?) {
        context.dataStore.edit { prefs ->
            if (url == null) prefs.remove(Keys.CACHED_HOST) else prefs[Keys.CACHED_HOST] = url
        }
    }

    suspend fun setWorkspace(slug: String?) {
        context.dataStore.edit { prefs ->
            if (slug == null) prefs.remove(Keys.WORKSPACE) else prefs[Keys.WORKSPACE] = slug
        }
    }
}
