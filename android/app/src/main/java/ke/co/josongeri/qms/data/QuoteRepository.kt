package ke.co.josongeri.qms.data

import ke.co.josongeri.qms.core.network.ApiClient
import ke.co.josongeri.qms.core.network.dto.Pagination
import ke.co.josongeri.qms.core.network.dto.QuoteDto
import ke.co.josongeri.qms.core.network.dto.QuoteNodeDto
import ke.co.josongeri.qms.core.network.dto.RevisionDto
import ke.co.josongeri.qms.core.network.dto.TreeTotals
import ke.co.josongeri.qms.core.util.Result
import ke.co.josongeri.qms.core.util.apiCall
import javax.inject.Inject
import javax.inject.Singleton

data class QuotePage(
    val quotes: List<QuoteDto>,
    val pagination: Pagination,
)

data class QuoteDetail(
    val quote: QuoteDto?,
    val revision: RevisionDto?,
    /** Top-level nodes of the tree (may be several). */
    val roots: List<QuoteNodeDto>,
    val totals: TreeTotals?,
)

@Singleton
class QuoteRepository @Inject constructor(
    private val apiClient: ApiClient,
) {
    suspend fun listQuotes(
        page: Int = 1,
        pageSize: Int = 20,
        search: String? = null,
    ): Result<QuotePage> = when (
        val r = apiCall {
            apiClient.service().listQuotes(
                page = page,
                pageSize = pageSize,
                search = search?.takeIf { it.isNotBlank() },
            )
        }
    ) {
        is Result.Success -> Result.Success(
            QuotePage(
                quotes = r.data.data,
                pagination = r.data.pagination ?: Pagination(),
            )
        )
        is Result.Error -> r
        is Result.Loading -> Result.Loading
    }

    /**
     * Loads a quote, picks its current (or first) revision and fetches the tree.
     */
    suspend fun quoteDetail(quoteId: String): Result<QuoteDetail> {
        val quote = when (val r = apiCall { apiClient.service().getQuote(quoteId) }) {
            is Result.Success -> r.data.data
            is Result.Error -> return r
            is Result.Loading -> return Result.Loading
        }

        val revisions = when (val r = apiCall { apiClient.service().listRevisions(quoteId) }) {
            is Result.Success -> r.data.data
            is Result.Error -> return r
            is Result.Loading -> return Result.Loading
        }

        val revision = revisions.firstOrNull { it.id == quote?.currentRevisionId }
            ?: revisions.firstOrNull()
            ?: return Result.Success(QuoteDetail(quote, null, emptyList(), null))

        val treeData = when (
            val r = apiCall { apiClient.service().getRevisionTree(quoteId, revision.id) }
        ) {
            is Result.Success -> r.data.data
            is Result.Error -> return r
            is Result.Loading -> return Result.Loading
        }

        return Result.Success(
            QuoteDetail(
                quote = quote,
                revision = treeData?.revision ?: revision,
                roots = treeData?.tree ?: emptyList(),
                totals = treeData?.totals,
            )
        )
    }
}
