package com.abyssvstar.blog.admin.service

import com.abyssvstar.blog.admin.repository.AdminUserMapper
import com.abyssvstar.blog.shared.security.SessionData
import com.abyssvstar.blog.shared.security.SessionStore
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

/** 登录成功后返回：会话 id 交给 Cookie，会话内容交给响应体。 */
data class LoginResult(
    val sessionId: String,
    val session: SessionData,
)

/**
 * 后台登录。
 *
 * 防爆破不在这里，而是 `AdminAuthController.login` 上的 `@RateLimit(countOn = FAILURE)`：
 * 限流是横切关注点，写进业务方法会让每个需要限流的接口都重复一遍
 * 「查计数 → 判断 → 记录」的逻辑。
 */
@Service
class AdminAuthService(
    private val adminUsers: AdminUserMapper,
    private val sessions: SessionStore,
    private val passwordEncoder: PasswordEncoder,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 用户名不存在时也执行一次哈希校验，让两条分支耗时接近，
     * 否则响应时间会泄漏「这个用户名存在吗」。
     */
    private val timingEqualizerHash: String by lazy {
        passwordEncoder.encode("timing-equalizer-not-a-real-password")
    }

    fun login(username: String, password: String): LoginResult {
        val user = adminUsers.findByUsername(username)

        val passwordMatches = if (user != null) {
            passwordEncoder.matches(password, user.passwordHash)
        } else {
            passwordEncoder.matches(password, timingEqualizerHash)
            false
        }

        val userId = user?.id
        if (userId == null || !passwordMatches) {
            log.warn("后台登录失败 username={}", username)
            // 不区分「用户名错」和「密码错」，不给可枚举的线索
            throw BusinessException(ErrorCode.BAD_CREDENTIALS)
        }

        adminUsers.touchLastLogin(userId)

        val sessionId = sessions.create(userId, user.username)
        val session = checkNotNull(sessions.find(sessionId)) { "会话写入后立即读取失败，Redis 可能不可用" }
        log.info("后台登录成功 username={} userId={}", user.username, userId)
        return LoginResult(sessionId, session)
    }

    fun logout(sessionId: String) {
        sessions.destroy(sessionId)
    }
}
