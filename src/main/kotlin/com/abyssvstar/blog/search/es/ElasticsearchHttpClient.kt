package com.abyssvstar.blog.search.es

import com.abyssvstar.blog.search.SearchProperties
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.time.Instant

/** ES 的轻量 HTTP 入口。接口很少，直接用 JDK HttpClient，避免为了三个索引引入整套客户端依赖。 */
@Component
class ElasticsearchHttpClient(
    private val props: SearchProperties,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val http = HttpClient.newBuilder()
        .connectTimeout(props.connectTimeout)
        .build()

    @Volatile
    private var circuitOpenUntil: Instant = Instant.EPOCH

    fun circuitOpen(): Boolean = Instant.now().isBefore(circuitOpenUntil)

    fun ping(): Boolean {
        if (!props.enabled) return false
        return runCatching {
            val response = send("GET", "/", null, timeout = props.connectTimeout)
            response.statusCode() in 200..299
        }.getOrDefault(false)
    }

    fun request(
        method: String,
        path: String,
        body: String? = null,
        contentType: String = JSON,
        allowNotFound: Boolean = false,
        timeout: Duration = props.requestTimeout,
    ): String? {
        if (!props.enabled) throw SearchUnavailableException("搜索功能未启用")
        val response = try {
            send(method, path, body, contentType, timeout)
        } catch (ex: Exception) {
            openCircuit(ex)
            throw SearchUnavailableException("无法连接搜索服务", ex)
        }

        if (response.statusCode() in 200..299) {
            circuitOpenUntil = Instant.EPOCH
            return response.body()
        }
        if (response.statusCode() == 404 && allowNotFound) {
            circuitOpenUntil = Instant.EPOCH
            return null
        }
        if (response.statusCode() >= 500 || response.statusCode() == 429) {
            val error = "搜索服务返回 HTTP ${response.statusCode()}: ${response.body().take(300)}"
            openCircuit(IllegalStateException(error))
            throw SearchUnavailableException(error)
        }
        throw SearchRequestException(
            "搜索服务拒绝请求 HTTP ${response.statusCode()}: ${response.body().take(500)}",
        )
    }

    fun json(value: Any): String = objectMapper.writeValueAsString(value)

    fun readTree(value: String) = objectMapper.readTree(value)

    private fun send(
        method: String,
        path: String,
        body: String?,
        contentType: String = JSON,
        timeout: Duration = props.requestTimeout,
    ): HttpResponse<String> {
        val builder = HttpRequest.newBuilder()
            .uri(URI.create(props.url.trimEnd('/') + path))
            .timeout(timeout)
            .header("Accept", "application/json")
        if (body != null) {
            builder.header("Content-Type", contentType)
            builder.method(method, HttpRequest.BodyPublishers.ofString(body))
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody())
        }
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString())
    }

    private fun openCircuit(cause: Exception) {
        circuitOpenUntil = Instant.now().plus(CIRCUIT_COOLDOWN)
        log.warn("搜索主路径暂时熔断 {} 秒: {}", CIRCUIT_COOLDOWN.seconds, cause.message)
    }

    private companion object {
        const val JSON = "application/json"
        val CIRCUIT_COOLDOWN: Duration = Duration.ofSeconds(30)
    }
}

class SearchUnavailableException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

class SearchRequestException(message: String) : RuntimeException(message)