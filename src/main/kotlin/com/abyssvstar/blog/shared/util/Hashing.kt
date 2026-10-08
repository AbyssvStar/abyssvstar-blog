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
        /*
         * 只信入口 Nginx 覆盖写入的头。X-Forwarded-For 里前面的值可能是客户端自己伪造的，
         * 所以取最后一跳，并优先用 X-Real-IP —— Nginx 要写 proxy_set_header X-Real-IP $remote_addr；
         * 前面还挂了 CDN 的话，先用 set_real_ip_from / real_ip_header 把 $remote_addr 还原成真实访客。
         */
        val realIp = request.getHeader("X-Real-IP")?.split(",")?.firstOrNull()?.trim()
        if (!realIp.isNullOrEmpty()) return realIp

        val forwarded = request.getHeader("X-Forwarded-For")
            ?.split(",")
            ?.map { it.trim() }
            ?.lastOrNull { it.isNotEmpty() }
        return if (!forwarded.isNullOrEmpty()) forwarded else request.remoteAddr ?: "unknown"
    }

    fun hash(request: HttpServletRequest, salt: String): String = Hashing.sha256Hex("$salt|${of(request)}")
}
