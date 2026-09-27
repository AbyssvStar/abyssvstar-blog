package com.abyssvstar.blog.shared.ratelimit

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * 限流。
 *
 * 具体次数与窗口写在 `@RateLimit` 注解上，这里只放开关和计数所需的东西。
 */
@ConfigurationProperties(prefix = "blog.rate-limit")
data class RateLimitProperties(
    /** 总开关 */
    val enabled: Boolean = true,
    /** Redis key 前缀，多环境共用 Redis 时用于隔离 */
    val keyPrefix: String = "blog:rl",
    /** IP 哈希盐。换掉后已有的计数会失效 */
    val ipSalt: String = "abyssvstar-blog",
)
