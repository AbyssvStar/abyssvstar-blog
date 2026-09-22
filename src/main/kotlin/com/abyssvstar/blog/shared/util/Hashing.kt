package com.abyssvstar.blog.shared.util

import jakarta.servlet.http.HttpServletRequest
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

object Hashing {

    fun sha256Hex(input: String): String = sha256Hex(input.toByteArray(StandardCharsets.UTF_8))

    fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
}

/**
 * 客户端 IP 的取值与哈希。
 */
object ClientIp {

    fun of(request: HttpServletRequest): String {
        // 部署在 Nginx 之后，真实来源在 X-Forwarded-For 的第一跳
        val forwarded = request.getHeader("X-Forwarded-For")
            ?.split(',')
            ?.firstOrNull()
            ?.trim()
        return if (!forwarded.isNullOrEmpty()) forwarded else request.remoteAddr ?: "unknown"
    }

    fun hash(request: HttpServletRequest, salt: String): String = Hashing.sha256Hex("$salt|${of(request)}")
}
