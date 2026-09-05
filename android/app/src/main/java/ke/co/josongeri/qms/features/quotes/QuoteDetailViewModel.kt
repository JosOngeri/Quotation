package ke.co.josongeri.qms.features.quotes

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import ke.co.josongeri.qms.core.util.Result
import ke.co.josongeri.qms.data.QuoteDetail
import ke.co.josongeri.qms.data.QuoteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuoteDetailUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val detail: QuoteDetail? = null,
    val expandedNodes: Set<String> = setOf(),
)

@HiltViewModel
class QuoteDetailViewModel @Inject constructor(
    private val repository: QuoteRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val quoteId: String = checkNotNull(savedStateHandle["id"])

    private val _ui = MutableStateFlow(QuoteDetailUiState())
    val ui: StateFlow<QuoteDetailUiState> = _ui.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            when (val r = repository.quoteDetail(quoteId)) {
                is Result.Success -> _ui.update {
                    it.copy(
                        loading = false,
                        detail = r.data,
                        expandedNodes = r.data.roots.map { it.id }.toSet(),
                    )
                }
                is Result.Error -> _ui.update {
                    it.copy(loading = false, error = r.message)
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun toggleNode(nodeId: String) {
        _ui.update {
            val expanded = it.expandedNodes.toMutableSet()
            if (!expanded.add(nodeId)) expanded.remove(nodeId)
            it.copy(expandedNodes = expanded)
        }
    }
}
