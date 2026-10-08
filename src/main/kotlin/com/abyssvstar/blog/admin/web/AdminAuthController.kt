package com.abyssvstar.blog.admin.web

import com.abyssvstar.blog.admin.service.AdminAuthService
import com.abyssvstar.blog.admin.web.dto.LoginRequest
import com.abyssvstar.blog.admin.web.dto.MeResponse
import com.abyssvstar.blog.shared.ratelimit.CountOn
import com.abyssvstar.blog.shared.ratelimit.RateLimit
import com.abyssvstar.blog.shared.security.AuthContext
import com.abyssvstar.blog.shared.security.CookieSupport
import com.abyssvstar.blog.shared.security.SessionData
import com.abyssvstar.blog.shared.security.SessionProperties
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.ErrorCode
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 后台认证接口。
 *
 * `/login` 是本模块唯一不需要会话的端点，因此在 `WebConfig` 的拦截器注册里被排除。
 */
@RestController
@RequestMapping("/admin/api/auth")
class AdminAuthController(
    private val authService: AdminAuthService,
    private val props: SessionProperties,
) {

    /**
     * 登录。同一 IP 15 分钟内失败 5 次锁定。
     *
     * 用 `CountOn.FAILURE` 而不是 `ATTEMPT`：成功不消耗额度，
     * 否则自己连登几次就把自己锁在外面了。
     *
     * 锁定时返回 20003；请求太频繁才是 10005，前端可以分别提示。
     */
    @RateLimit(limit = 5, window = "15m", countOn = CountOn.FAILURE, exceededCode = ErrorCode.LOGIN_LOCKED)
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody body: LoginRequest,
        response: HttpServletResponse,
    ): ApiResponse<MeResponse> {
        val result = authService.login(body.username, body.password)
        val cookie = CookieSupport.issue(
            name = props.cookieName,
            value = result.sessionId,
            ttl = props.ttl,
            secure = props.secure,
        )
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
        return ApiResponse.ok(result.session.toMeResponse())
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse): ApiResponse<Unit> {
        authService.logout(AuthContext.sessionId(request))
        val cleared = CookieSupport.clear(props.cookieName, props.secure)
        response.addHeader(HttpHeaders.SET_COOKIE, cleared.toString())
        return ApiResponse.ok()
    }

    @GetMapping("/me")
    fun me(request: HttpServletRequest): ApiResponse<MeResponse> =
        ApiResponse.ok(AuthContext.session(request).toMeResponse())
}

private fun SessionData.toMeResponse() =
    MeResponse(userId = userId, username = username, csrfToken = csrfToken)
