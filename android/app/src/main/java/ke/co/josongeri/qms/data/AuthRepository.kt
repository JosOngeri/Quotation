package ke.co.josongeri.qms.data

import ke.co.josongeri.qms.core.network.ApiClient
import ke.co.josongeri.qms.core.network.dto.LoginRequest
import ke.co.josongeri.qms.core.network.dto.UserDto
import ke.co.josongeri.qms.core.storage.SettingsStore
import ke.co.josongeri.qms.core.storage.TokenStore
import ke.co.josongeri.qms.core.util.Result
import ke.co.josongeri.qms.core.util.apiCall
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val tokenStore: TokenStore,
    private val settingsStore: SettingsStore,
) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        val result = apiCall {
            apiClient.service().login(LoginRequest(email, password))
        }
        return when (result) {
            is Result.Success -> {
                val data = result.data.data
                    ?: return Result.Error("Malformed login response")
                tokenStore.saveToken(data.token)
                tokenStore.saveUser(data.user)
                data.user.workspaceSlug?.let { settingsStore.setWorkspace(it) }
                Result.Success(data.user)
            }
            is Result.Error -> result
            is Result.Loading -> Result.Loading
        }
    }

    fun logout() {
        tokenStore.clear()
    }

    fun currentUser(): UserDto? = tokenStore.getUser()

    fun isLoggedIn(): Boolean = tokenStore.getToken() != null
}
