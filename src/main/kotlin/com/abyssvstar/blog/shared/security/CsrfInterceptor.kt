package com.abyssvstar.blog.shared.security

import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * 非幂等请求的 CSRF 校验。必须注册在 [AuthInterceptor] **之后** ——
 * 它直接复用上一步放进 request attribute 的会话，不再多读一次 Redis。
 *
 * 登录端点被排除：它是唯一在会话建立之前调用的写接口，此时没有 token 可比对。
 * 风险由 SameSite=Strict 兜住（跨站请求根本带不上 Cookie）。详见 docs/08 §7。
 */
@Component
class CsrfInterceptor : HandlerInterceptor {

    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        if (request.method in SAFE_METHODS) return true

        val session = request.getAttribute(AuthContext.ATTR_SESSION) as? SessionData
            ?: throw BusinessException(ErrorCode.UNAUTHENTICATED)

        val provided = request.getHeader(AuthContext.CSRF_HEADER)
        if (provided == null || !constantTimeEquals(provided, session.csrfToken)) {
            throw BusinessException(ErrorCode.CSRF_FAILED)
        }
        return true
    }

    /** 常量时间比较，避免用 == 泄漏 token 前缀 */
    private fun constantTimeEquals(a: String, b: String): Boolean =
        MessageDigest.isEqual(a.toByteArray(StandardCharsets.UTF_8), b.toByteArray(StandardCharsets.UTF_8))

    private companion object {
        val SAFE_METHODS = setOf("GET", "HEAD", "OPTIONS", "TRACE")
    }
}
