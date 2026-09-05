package ke.co.josongeri.qms.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import ke.co.josongeri.qms.core.config.HostProvider
import ke.co.josongeri.qms.core.network.ApiClient
import ke.co.josongeri.qms.core.storage.SettingsStore
import ke.co.josongeri.qms.core.util.Result
import ke.co.josongeri.qms.data.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

enum class HealthStatus { UNKNOWN, TESTING, OK, FAILED }

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val serverUrl: String = "",
    val advancedOpen: Boolean = false,
    val healthStatus: HealthStatus = HealthStatus.UNKNOWN,
    val loading: Boolean = false,
    val error: String? = null,
    val loggedIn: Boolean = false,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val hostProvider: HostProvider,
    private val settingsStore: SettingsStore,
    private val apiClient: ApiClient,
) : ViewModel() {

    private val _ui = MutableStateFlow(LoginUiState())
    val ui: StateFlow<LoginUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            val current = settingsStore.getApiUrl()
                ?: hostProvider.defaultUrl()
            _ui.update { it.copy(serverUrl = current) }
        }
    }

    fun onEmailChange(v: String) = _ui.update { it.copy(email = v, error = null) }
    fun onPasswordChange(v: String) = _ui.update { it.copy(password = v, error = null) }
    fun onServerUrlChange(v: String) =
        _ui.update { it.copy(serverUrl = v, healthStatus = HealthStatus.UNKNOWN) }
    fun toggleAdvanced() = _ui.update { it.copy(advancedOpen = !it.advancedOpen) }

    /** Probes GET <entered host>/api/health. */
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

    fun login() {
        val state = _ui.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _ui.update { it.copy(error = "Email and password are required") }
            return
        }
        _ui.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            // Persist the entered server URL (if it differs from the default)
            // so the login call hits the right host.
            val entered = state.serverUrl.trim()
            if (entered.isNotBlank()) {
                val normalized = HostProvider.normalize(entered)
                if (normalized != hostProvider.defaultUrl()) {
                    settingsStore.setApiUrl(normalized)
                    hostProvider.invalidate()
                    apiClient.invalidate()
                } else {
                    settingsStore.setApiUrl(null)
                }
            }

            when (val result = authRepository.login(state.email.trim(), state.password)) {
                is Result.Success -> _ui.update { it.copy(loading = false, loggedIn = true) }
                is Result.Error -> _ui.update {
                    it.copy(
                        loading = false,
                        error = if (result.httpCode == 401)
                            "Invalid email or password"
                        else result.message,
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }
}
