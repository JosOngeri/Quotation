package ke.co.josongeri.qms.features.quotes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import ke.co.josongeri.qms.core.network.dto.QuoteDto
import ke.co.josongeri.qms.core.util.Result
import ke.co.josongeri.qms.data.QuoteRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuotesUiState(
    val quotes: List<QuoteDto> = emptyList(),
    val search: String = "",
    val page: Int = 1,
    val totalPages: Int = 1,
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class QuotesViewModel @Inject constructor(
    private val repository: QuoteRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(QuotesUiState())
    val ui: StateFlow<QuotesUiState> = _ui.asStateFlow()

    private var searchJob: Job? = null

    init {
        load(page = 1)
    }

    fun onSearchChange(query: String) {
        _ui.update { it.copy(search = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(400) // debounce
            load(page = 1)
        }
    }

    fun refresh() = load(page = 1, refreshing = true)

    fun nextPage() {
        val s = _ui.value
        if (s.page < s.totalPages && !s.loading) load(s.page + 1)
    }

    fun prevPage() {
        val s = _ui.value
        if (s.page > 1 && !s.loading) load(s.page - 1)
    }

    private fun load(page: Int, refreshing: Boolean = false) {
        viewModelScope.launch {
            _ui.update { it.copy(loading = !refreshing, refreshing = refreshing, error = null) }
            when (val r = repository.listQuotes(page = page, search = _ui.value.search)) {
                is Result.Success -> _ui.update {
                    it.copy(
                        quotes = r.data.quotes,
                        page = r.data.pagination.page,
                        totalPages = r.data.pagination.totalPages,
                        loading = false,
                        refreshing = false,
                    )
                }
                is Result.Error -> _ui.update {
                    it.copy(loading = false, refreshing = false, error = r.message)
                }
                is Result.Loading -> Unit
            }
        }
    }
}
