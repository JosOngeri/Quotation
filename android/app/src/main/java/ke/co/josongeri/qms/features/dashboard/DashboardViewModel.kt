package ke.co.josongeri.qms.features.dashboard

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import ke.co.josongeri.qms.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class DashboardUiState(
    val userName: String = "",
    val workspaceName: String = "",
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    authRepository: AuthRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(
        DashboardUiState(
            userName = authRepository.currentUser()?.name
                ?: authRepository.currentUser()?.email.orEmpty(),
            workspaceName = authRepository.currentUser()?.workspaceSlug.orEmpty(),
        )
    )
    val ui: StateFlow<DashboardUiState> = _ui.asStateFlow()
}
