package com.abyssvstar.blog.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/**
 * 应用配置，对应 `application.yml` 里的 `blog.*`。
 *
 * 只放随环境变的项：地址、路径、凭据、开关。设计决策写在使用它的代码旁边，
 * 与数据库约束绑定的值写成常量，都不进配置。
 */
@ConfigurationProperties(prefix = "blog")
data class BlogProperties(
    /** 站点对外地址，用于 RSS / sitemap 等绝对 URL */
    val baseUrl: String = "http://localhost:3000",
    val admin: Admin = Admin(),
    val session: Session = Session(),
    val security: Security = Security(),
    val rateLimit: RateLimit = RateLimit(),
    val storage: Storage = Storage(),
) {
    data class Admin(
        val username: String = "admin",
        /** 为空则不自动建号，启动时记 WARN */
        val password: String = "",
        /** 置 false 可关闭启动时自动建号 */
        val autoInitialize: Boolean = true,
    )

    data class Session(
        val cookieName: String = "BLOG_SESSION",
        val ttl: Duration = Duration.ofDays(7),
        /** 生产必须 true；本地 http 调试时关掉 */
        val secure: Boolean = true,
    )

    data class Security(
        /** IP 哈希盐，用于限流计数 */
        val ipSalt: String = "abyssvstar-blog",
    )

    data class RateLimit(
        /** 总开关。具体次数与窗口写在 `@RateLimit` 注解上，不进配置。 */
        val enabled: Boolean = true,
        /** Redis key 前缀，多环境共用 Redis 时用于隔离 */
        val keyPrefix: String = "blog:rl",
    )

    data class Storage(
        /** MinIO 地址，容器内为 `http://minio:9000` */
        val endpoint: String = "http://localhost:9000",
        val accessKey: String = "",
        val secretKey: String = "",
        val bucket: String = "blog-media",
        /** 图片对外前缀，由 Nginx 反代到 MinIO */
        val publicBaseUrl: String = "http://localhost:9000/blog-media",
        /** 对象名前缀，多环境共用一个 bucket 时用于隔离 */
        val keyPrefix: String = "",
    )
}
