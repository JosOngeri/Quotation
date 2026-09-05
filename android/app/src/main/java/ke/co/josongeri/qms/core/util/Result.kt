package ke.co.josongeri.qms.core.util

import ke.co.josongeri.qms.core.network.dto.ErrorResponse
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(
        val message: String,
        val code: String? = null,
        val httpCode: Int? = null,
    ) : Result<Nothing>()

    data object Loading : Result<Nothing>()

    val isSuccess get() = this is Success
    fun dataOrNull(): T? = (this as? Success)?.data
}

private val lenientJson = Json { ignoreUnknownKeys = true }

/**
 * Wraps a Retrofit call, mapping HttpException/IOException to Result.Error and
 * parsing the standard `{ "error": { "code", "message" } }` body when present.
 */
suspend fun <T> apiCall(block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: HttpException) {
    val body = e.response()?.errorBody()?.string()
    val parsed = body?.let {
        runCatching { lenientJson.decodeFromString<ErrorResponse>(it) }.getOrNull()
    }
    Result.Error(
        message = parsed?.error?.message
            ?: "Request failed (HTTP ${e.code()})",
        code = parsed?.error?.code,
        httpCode = e.code(),
    )
} catch (e: IOException) {
    Result.Error(message = "Network error: ${e.message ?: "check connection"}")
} catch (e: Exception) {
    Result.Error(message = e.message ?: "Unexpected error")
}
