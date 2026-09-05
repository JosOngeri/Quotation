package ke.co.josongeri.qms.features.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import ke.co.josongeri.qms.core.config.HostProvider
import ke.co.josongeri.qms.core.network.ApiClient
import ke.co.josongeri.qms.core.storage.SettingsStore
import ke.co.josongeri.qms.data.AuthRepository
import ke.co.josongeri.qms.features.auth.HealthStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class SettingsUiState(
    val serverUrl: String = "",
    val defaultUrl: String = "",
    val healthStatus: HealthStatus = HealthStatus.UNKNOWN,
    val saving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val loggedOut: Boolean = false,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsStore: SettingsStore,
    private val hostProvider: HostProvider,
    private val apiClient: ApiClient,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(SettingsUiState())
    val ui: StateFlow<SettingsUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            val current = settingsStore.getApiUrl() ?: hostProvider.defaultUrl()
            _ui.update {
                it.copy(serverUrl = current, defaultUrl = hostProvider.defaultUrl())
            }
        }
    }

    fun onServerUrlChange(v: String) =
        _ui.update { it.copy(serverUrl = v, healthStatus = HealthStatus.UNKNOWN, message = null, error = null) }

    fun testConnection() {
        val raw = _ui.value.serverUrl
        if (raw.isBlank()) return
        _ui.update { it.copy(healthStatus = HealthStatus.TESTING) }
        viewModelScope.launch {
            val ok = withContext(Dispatchers.IO) {
                apiClient.probeHealth(HostProvider.normalize(raw))
            }
            _ui.update {
                it.copy(healthStatus = if (ok) HealthStatus.OK else HealthStatus.FAILED)
            }
        }
    }

    /** Validates via /api/health then persists the override and rebuilds the client. */
    fun save() {
        val raw = _ui.value.serverUrl.trim()
        if (raw.isBlank()) {
            _ui.update { it.copy(error = "Server URL cannot be empty") }
            return
        }
        _ui.update { it.copy(saving = true, error = null, message = null) }
        viewModelScope.launch {
            val normalized = HostProvider.normalize(raw)
            val ok = withContext(Dispatchers.IO) { apiClient.probeHealth(normalized) }
            if (!ok) {
                _ui.update {
                    it.copy(saving = false, error = "Health check failed for $normalized")
                }
                return@launch
            }
            settingsStore.setApiUrl(normalized)
            hostProvider.invalidate()
            apiClient.invalidate()
            _ui.update {
                it.copy(
                    saving = false,
                    serverUrl = normalized,
                    healthStatus = HealthStatus.OK,
                    message = "Saved. API host is now $normalized",
                )
            }
        }
    }

    fun resetToDefault() {
        viewModelScope.launch {
            settingsStore.setApiUrl(null)
            hostProvider.invalidateAll()
            apiClient.invalidate()
            _ui.update {
                it.copy(
                    serverUrl = it.defaultUrl,
                    healthStatus = HealthStatus.UNKNOWN,
                    message = "Reset to default host",
                    error = null,
                )
            }
        }
    }

    fun logout() {
        authRepository.logout()
        _ui.update { it.copy(loggedOut = true) }
    }
}
