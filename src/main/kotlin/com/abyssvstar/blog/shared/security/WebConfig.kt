package com.abyssvstar.blog.shared.security

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/**
 * 后台接口的拦截器装配。
 *
 * 顺序很重要：先认证（写入会话 attribute），再校验 CSRF（复用该 attribute）。
 */
@Configuration
class WebConfig(
    private val authInterceptor: AuthInterceptor,
    private val csrfInterceptor: CsrfInterceptor,
) : WebMvcConfigurer {

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(authInterceptor)
            .addPathPatterns(ADMIN_API)
            .excludePathPatterns(LOGIN)

        registry.addInterceptor(csrfInterceptor)
            .addPathPatterns(ADMIN_API)
            .excludePathPatterns(LOGIN)
    }

    private companion object {
        const val ADMIN_API = "/admin/api/**"
        const val LOGIN = "/admin/api/auth/login"
    }
}
