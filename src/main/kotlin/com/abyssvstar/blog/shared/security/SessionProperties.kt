package com.abyssvstar.blog.shared.security

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** 后台会话。 */
@ConfigurationProperties(prefix = "blog.session")
data class SessionProperties(
    val cookieName: String = "BLOG_SESSION",
    val ttl: Duration = Duration.ofDays(7),
    /** 生产必须 true；本地 http 调试时关掉 */
    val secure: Boolean = true,
)
