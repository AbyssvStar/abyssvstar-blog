package com.abyssvstar.blog.shared.security

import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseCookie
import java.time.Duration

/**
 * 认证上下文的契约：拦截器写入、控制器读取。
 * 集中定义 attribute key，避免各处手写字符串写错。
 */
object AuthContext {

    const val ATTR_SESSION = "blog.auth.session"
    const val ATTR_SESSION_ID = "blog.auth.sessionId"

    /** 前端在非 GET 请求上必须带这个头 */
    const val CSRF_HEADER = "X-CSRF-Token"

    /** 拦截器已保证会话存在；这里再取一次只是为了让控制器代码干净 */
    fun session(request: HttpServletRequest): SessionData =
        request.getAttribute(ATTR_SESSION) as? SessionData
            ?: throw BusinessException(ErrorCode.UNAUTHENTICATED)

    fun sessionId(request: HttpServletRequest): String =
        request.getAttribute(ATTR_SESSION_ID) as? String
            ?: throw BusinessException(ErrorCode.UNAUTHENTICATED)
}

object CookieSupport {

    fun read(request: HttpServletRequest, name: String): String? =
        request.cookies?.firstOrNull { it.name == name }?.value

    fun issue(name: String, value: String, ttl: Duration, secure: Boolean): ResponseCookie =
        ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Strict")
            .path("/")
            .maxAge(ttl)
            .build()

    fun clear(name: String, secure: Boolean): ResponseCookie =
        ResponseCookie.from(name, "")
            .httpOnly(true)
            .secure(secure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ZERO)
            .build()
}
