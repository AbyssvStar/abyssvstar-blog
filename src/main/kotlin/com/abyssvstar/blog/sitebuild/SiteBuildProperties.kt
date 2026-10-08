package com.abyssvstar.blog.sitebuild

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/**
 * 静态站构建的触发参数。
 *
 * `enabled` 默认关闭：本地和测试环境没有 GitHub 凭据，发布时只记 PENDING，不发 dispatch。
 * 生产要显式打开，否则内容发布了、站却不会自动重建。
 */
@ConfigurationProperties(prefix = "blog.site-build")
data class SiteBuildProperties(
    val enabled: Boolean = false,

    /** `owner/repo` */
    val repository: String = "",

    /** 能发 repository_dispatch 的 token（fine-grained：Contents 读写） */
    val token: String = "",

    val eventType: String = "site-rebuild",

    /** 防抖窗口：距上一次成功触发超过它，才把积压的 PENDING 合并成一次 */
    val debounce: Duration = Duration.ofSeconds(30),

    /** 扫描间隔（毫秒）。做成可配是为了本地验证时能调快 */
    val scanIntervalMs: Long = 10_000,

    val initialDelayMs: Long = 15_000,

    /** GitHub API 地址。本地验证时指向桩服务 */
    val apiBase: String = "https://api.github.com",
)