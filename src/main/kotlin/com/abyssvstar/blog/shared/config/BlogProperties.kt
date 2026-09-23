package com.abyssvstar.blog.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/**
 * 可配置项集中在这里，避免 `@Value` 散落各处。环境变量映射见 `application.yml`。
 *
 * ## 什么该进配置，什么不该
 *
 * 只留两类：
 *  1. **随环境变**的 —— 地址、路径、凭据、端口
 *  2. **不重新构建就要能调**的 —— 开关、总限额
 *
 * 其余一律不进配置：
 *  - **设计决策**（限流几次几秒）写在用法旁边的注解上（`@RateLimit`），一眼能看见它保护的是哪个接口
 *  - **与数据库约束绑定的**（字段长度上限）写成常量 —— 放进配置就有"配置说 2000、DB CHECK 说 1000"的
 *    漂移风险，而且那种漂移的报错是 500 而不是干净的 400
 *
 * 还有一条硬要求：**配置项必须有代码在读**。给不存在的模块预留配置 = 死配置。
 */
@ConfigurationProperties(prefix = "blog")
data class BlogProperties(
    /** 站点对外地址。环境相关：本地 `localhost:3000`，线上是域名。 */
    val baseUrl: String = "http://localhost:3000",
    val admin: Admin = Admin(),
    val session: Session = Session(),
    val security: Security = Security(),
    val rateLimit: RateLimit = RateLimit(),
    val storage: Storage = Storage(),
) {
    data class Admin(
        val username: String = "admin",
        /** 为空时不会创建管理员，启动会记 WARN */
        val password: String = "",
        /** 置 false 可关闭启动时自动建号（例如管理员由别的方式预置） */
        val autoInitialize: Boolean = true,
    )

    data class Session(
        val cookieName: String = "BLOG_SESSION",
        val ttl: Duration = Duration.ofDays(7),
        /** 生产必须 true；本地 http 调试时由 `application-local.yml` 关掉 */
        val secure: Boolean = true,
    )

    data class Security(
        /** 限流用的 IP 哈希盐。不是高安全用途，但也不该用固定字面量。 */
        val ipSalt: String = "abyssvstar-blog",
    )

    /**
     * 限流的唯一配置项
     */
    data class RateLimit(
        val enabled: Boolean = true,
        /** Redis key 前缀。多个环境共用同一个 Redis 时靠它隔离计数。 */
        val keyPrefix: String = "blog:rl",
    )

    /**
     * 对象存储（MinIO 自建图床）。设计与理由见 `docs/01` §4.3、§7。
     *
     * 为什么这些能进配置而限流不能：**它们是环境相关的**。
     * 本地是 `localhost:9000`，线上是内网服务名；凭据更是每个环境都不同。
     */
    data class Storage(
        /** MinIO 服务地址。容器内用 `http://minio:9000`。 */
        val endpoint: String = "http://localhost:9000",
        val accessKey: String = "",
        val secretKey: String = "",
        val bucket: String = "blog-media",
        /**
         * 对外访问前缀。图片 URL = `{publicBaseUrl}/{objectName}`。
         *
         * 指向 Nginx（`https://域名/media`）而不是 MinIO 的 9000 端口 ——
         * HTTPS、缓存、限流都在 Nginx 那层处理，MinIO 只管存。
         */
        val publicBaseUrl: String = "http://localhost:9000/blog-media",
        /**
         * 对象名前缀。多个环境共用一个 bucket 时用它隔离（例如 `dev/`）。
         * 为空表示直接用 bucket 根目录。
         */
        val keyPrefix: String = "",
    )
}
