package com.abyssvstar.blog.shared.security

import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

/**
 * 后台接口的登录校验。放在拦截器而不是过滤器，是为了能抛 [BusinessException]
 * 并交给 @RestControllerAdvice 统一转成 envelope。
 *
 * 注册范围见 [WebConfig]：只覆盖 /admin/api 下的接口，公开 API 完全不受影响。
 */
@Component
class AuthInterceptor(
    private val sessions: SessionStore,
    private val props: SessionProperties,
) : HandlerInterceptor {

    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        val sessionId = CookieSupport.read(request, props.cookieName)
        val data = sessions.find(sessionId) ?: throw BusinessException(ErrorCode.UNAUTHENTICATED)

        sessions.renew(sessionId!!)
        request.setAttribute(AuthContext.ATTR_SESSION, data)
        request.setAttribute(AuthContext.ATTR_SESSION_ID, sessionId)
        return true
    }
}
