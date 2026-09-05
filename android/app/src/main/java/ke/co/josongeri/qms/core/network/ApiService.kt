package ke.co.josongeri.qms.core.network

import ke.co.josongeri.qms.core.network.dto.HealthResponse
import ke.co.josongeri.qms.core.network.dto.LoginRequest
import ke.co.josongeri.qms.core.network.dto.LoginResponse
import ke.co.josongeri.qms.core.network.dto.QuoteListResponse
import ke.co.josongeri.qms.core.network.dto.QuoteResponse
import ke.co.josongeri.qms.core.network.dto.QuoteTreeResponse
import ke.co.josongeri.qms.core.network.dto.RevisionListResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    // ---------- Auth ----------
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    // ---------- Health ----------
    @GET("api/health")
    suspend fun health(): HealthResponse

    // ---------- Quotes ----------
    @GET("api/v1/quotes")
    suspend fun listQuotes(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("search") search: String? = null,
    ): QuoteListResponse

    @GET("api/v1/quotes/{id}")
    suspend fun getQuote(@Path("id") id: String): QuoteResponse

    @GET("api/v1/quotes/{id}/revisions")
    suspend fun listRevisions(@Path("id") quoteId: String): RevisionListResponse

    @GET("api/v1/quotes/{id}/revisions/{revisionId}/tree")
    suspend fun getRevisionTree(
        @Path("id") quoteId: String,
        @Path("revisionId") revisionId: String,
    ): QuoteTreeResponse
}
