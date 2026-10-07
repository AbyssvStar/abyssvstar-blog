package com.abyssvstar.blog.export.web

import com.abyssvstar.blog.export.ExportProperties
import com.abyssvstar.blog.export.service.ExportService
import com.abyssvstar.blog.export.web.dto.ExportPayload
import com.abyssvstar.blog.shared.ratelimit.KeyBy
import com.abyssvstar.blog.shared.ratelimit.RateLimit
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * 给 CI 拉全量内容的导出接口。
 *
 * 用静态 Token 而不是会话：调它的是 GitHub Actions，没有浏览器也没有 Cookie。
 * 每次带 `If-None-Match` 的话，内容没变就是 304，CI 可以每 30 分钟无脑调一次。
 */
@RestController
@RequestMapping("/api/v1")
class ExportController(
    private val exportService: ExportService,
    private val props: ExportProperties,
) {

    /** 限流按全站计，不按 IP —— CI 的出口 IP 会变，按 IP 计没有意义。 */
    @RateLimit(keyBy = KeyBy.GLOBAL, limit = 10, window = "1m")
    @GetMapping("/export")
    fun export(
        @RequestHeader(value = TOKEN_HEADER, required = false) token: String?,
        @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) ifNoneMatch: String?,
    ): ResponseEntity<ApiResponse<ExportPayload>> {
        verifyToken(token)

        val result = exportService.build()
        val etag = "\"${result.etag}\""

        if (ifNoneMatch != null && ifNoneMatch == etag) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build()
        }
        return ResponseEntity.ok().eTag(etag).body(ApiResponse.ok(result.payload))
    }

    private fun verifyToken(provided: String?) {
        val expected = props.token

        // 没配 Token 就拒绝服务。这一条是防「配置漏了导致接口裸奔」——
        // 空的期望值绝不能被当成「不用校验」。
        if (expected.isBlank()) {
            throw BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "导出接口未配置 Token，已拒绝服务")
        }
        if (provided == null || !constantTimeEquals(provided, expected)) {
            throw BusinessException(ErrorCode.UNAUTHENTICATED, "导出 Token 无效")
        }
    }

    /** 常量时间比较，避免用 == 泄漏 Token 前缀 */
    private fun constantTimeEquals(a: String, b: String): Boolean =
        MessageDigest.isEqual(a.toByteArray(StandardCharsets.UTF_8), b.toByteArray(StandardCharsets.UTF_8))

    private companion object {
        const val TOKEN_HEADER = "X-Export-Token"
    }
}
