package com.abyssvstar.blog.shared.security

import com.abyssvstar.blog.shared.config.BlogProperties
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.util.Base64

/** 会话内容。CSRF token 与会话绑定，登出即失效。 */
data class SessionData(
    val userId: Long,
    val username: String,
    val csrfToken: String,
)

/**
 * 会话存 Redis 而不是 JWT
 */
@Component
class SessionStore(
    private val redis: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    private val props: BlogProperties,
) {

    private val random = SecureRandom()

    fun create(userId: Long, username: String): String {
        val sessionId = randomToken(ID_BYTES)
        val data = SessionData(userId = userId, username = username, csrfToken = randomToken(TOKEN_BYTES))
        redis.opsForValue().set(key(sessionId), objectMapper.writeValueAsString(data), props.session.ttl)
        return sessionId
    }

    fun find(sessionId: String?): SessionData? {
        if (sessionId.isNullOrBlank()) return null
        val json = redis.opsForValue().get(key(sessionId)) ?: return null
        return runCatching { objectMapper.readValue(json, SessionData::class.java) }.getOrNull()
    }

    /** 每次访问续期，TTL 归零即视为登出。 */
    fun renew(sessionId: String) {
        redis.expire(key(sessionId), props.session.ttl)
    }

    fun destroy(sessionId: String) {
        redis.delete(key(sessionId))
    }

    private fun key(sessionId: String) = "session:$sessionId"

    private fun randomToken(byteCount: Int): String {
        val buffer = ByteArray(byteCount)
        random.nextBytes(buffer)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer)
    }

    private companion object {
        const val ID_BYTES = 32
        const val TOKEN_BYTES = 32
    }
}
