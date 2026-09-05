package ke.co.josongeri.qms.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ---------- Auth ----------

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class LoginResponse(
    val data: LoginData? = null,
)

@Serializable
data class LoginData(
    val token: String,
    val user: UserDto,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    val roles: List<String> = emptyList(),
    @SerialName("workspaceId") val workspaceId: String? = null,
    @SerialName("workspaceSlug") val workspaceSlug: String? = null,
    @SerialName("userType") val userType: String? = null,
    @SerialName("clientId") val clientId: String? = null,
    @SerialName("clientName") val clientName: String? = null,
)

// ---------- Errors ----------

@Serializable
data class ErrorResponse(
    val error: ApiError? = null,
)

@Serializable
data class ApiError(
    val code: String? = null,
    val message: String? = null,
)

// ---------- Pagination ----------

@Serializable
data class Pagination(
    val page: Int = 1,
    @SerialName("pageSize") val pageSize: Int = 20,
    val total: Int = 0,
    @SerialName("totalPages") val totalPages: Int = 1,
)

// ---------- Quotes ----------

@Serializable
data class QuoteDto(
    val id: String,
    @SerialName("quote_number") val quoteNumber: String? = null,
    val title: String? = null,
    val status: String? = null,
    @SerialName("client_id") val clientId: String? = null,
    @SerialName("client_name") val clientName: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("currency") val currency: String? = "KES",
    @SerialName("total_minor") val totalMinor: Long? = null,
    @SerialName("current_revision_id") val currentRevisionId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class QuoteListResponse(
    val data: List<QuoteDto> = emptyList(),
    val pagination: Pagination? = null,
)

@Serializable
data class QuoteResponse(
    val data: QuoteDto? = null,
)

@Serializable
data class RevisionDto(
    val id: String,
    @SerialName("quote_id") val quoteId: String? = null,
    val version: Int? = null,
    val status: String? = null,
    @SerialName("currency") val currency: String? = "KES",
    @SerialName("subtotal_amount_minor") val subtotalMinor: Long? = null,
    @SerialName("tax_amount_minor") val taxMinor: Long? = null,
    @SerialName("total_amount_minor") val totalMinor: Long? = null,
    @SerialName("published_at") val publishedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class RevisionListResponse(
    val data: List<RevisionDto> = emptyList(),
)

/**
 * GET /quotes/:id/revisions/:revId/tree returns
 * { "data": { "revision": {...}, "tree": [ {node...}, ... ], "totals": {...} } }
 */
@Serializable
data class QuoteTreeResponse(
    val data: QuoteTreeData? = null,
)

@Serializable
data class QuoteTreeData(
    val revision: RevisionDto? = null,
    val tree: List<QuoteNodeDto> = emptyList(),
    val totals: TreeTotals? = null,
)

@Serializable
data class TreeTotals(
    @SerialName("subtotal_amount_minor") val subtotalAmountMinor: Long? = null,
    @SerialName("tax_amount_minor") val taxAmountMinor: Long? = null,
    @SerialName("total_amount_minor") val totalAmountMinor: Long? = null,
)

@Serializable
data class QuoteNodeDto(
    val id: String,
    @SerialName("node_type") val nodeType: String? = null,
    val title: String? = null,
    val description: String? = null,
    val ordinal: Int? = null,
    val children: List<QuoteNodeDto> = emptyList(),
    val items: List<QuoteItemDto> = emptyList(),
    @SerialName("subtotal_minor") val subtotalMinor: Long? = null,
)

@Serializable
data class QuoteItemDto(
    val id: String,
    @SerialName("node_id") val nodeId: String? = null,
    @SerialName("product_id") val productId: String? = null,
    val name: String? = null,
    val description: String? = null,
    val quantity: Double? = null,
    val unit: String? = null,
    @SerialName("unit_cost_minor") val unitCostMinor: Long? = null,
    @SerialName("sell_price_minor") val sellPriceMinor: Long? = null,
    @SerialName("tax_rate") val taxRate: Double? = null,
    @SerialName("tax_amount_minor") val taxAmountMinor: Long? = null,
    @SerialName("line_total_minor") val lineTotalMinor: Long? = null,
)

// ---------- Clients ----------

@Serializable
data class ClientDto(
    val id: String,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
)

// ---------- Health ----------

@Serializable
data class HealthResponse(
    val status: String? = null,
)
