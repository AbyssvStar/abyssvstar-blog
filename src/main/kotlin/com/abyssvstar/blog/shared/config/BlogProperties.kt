package com.abyssvstar.blog.shared.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/**
 * 全部可配置项集中在这里，避免 @Value 散落各处。
 * 环境变量映射见 src/main/resources/application.yml。
 */
@ConfigurationProperties(prefix = "blog")
data class BlogProperties(
    /** 站点对外地址，RSS / sitemap / OG 图需要绝对 URL */
    val baseUrl: String = "http://localhost:3000",
    /** 图片上传落盘目录 */
    val uploadDir: String = "/data/uploads",
    val site: Site = Site(),
    val media: Media = Media(),
    val siteBuild: SiteBuild = SiteBuild(),
    val comment: Comment = Comment(),
    val view: View = View(),
    val admin: Admin = Admin(),
    val session: Session = Session(),
    val export: Export = Export(),
    val security: Security = Security(),
) {
    /**
     * 站点元信息。目前只由配置提供 —— 等后台有了"站点设置"页面再落库，
     * 届时这里变成默认值即可，导出结构不用动。
     */
    data class Site(
        val title: String = "AbyssvStar",
        val description: String = "",
        val author: String = "AbyssvStar",
        val language: String = "zh-CN",
    )

    /**
     * 媒体（图片）配置。
     *
     * 只接受 JDK `ImageIO` 真正能解码的格式。WebP 不在默认列表里 ——
     * ImageIO 原生不支持 WebP，需要额外插件；**宁可明确拒绝，也不要收下一个我们处理不了的文件**。
     */
    data class Media(
        val maxBytes: Long = 5L * 1024 * 1024,
        /** 像素数上限，防"图片炸弹"：一张 50000×50000 的 PNG 解压后能吃掉几个 GB */
        val maxPixels: Long = 40_000_000,
        /** 缩略图宽度。只在小于原图宽度时生成 */
        val variantWidths: List<Int> = listOf(400, 800),
        /** ImageIO 的 formatName，大写。默认只覆盖 JPEG / PNG / GIF */
        val allowedFormats: List<String> = listOf("JPEG", "PNG", "GIF"),
        /** 同时进行的缩放任务数。2 核机器上超过 2 会互相拖慢并把 API 拖垮 */
        val resizeParallelism: Int = 2,
        /** 公开访问前缀，由 Nginx 直接服务，不经过应用 */
        val publicPrefix: String = "/uploads",
    )

    /**
     * 静态站构建触发。
     *
     * **默认关闭**：本地开发不该因为按了一下"发布"就去骚扰 GitHub。
     * 关闭时 `SiteBuildService.request()` 直接忽略请求，连 `site_builds` 都不写 ——
     * 否则队列会一直堆 PENDING，重启后一次性爆出来。
     */
    data class SiteBuild(
        val enabled: Boolean = false,
        /** `owner/repo` 形式 */
        val repository: String = "",
        /** 细粒度 PAT，只需要 Actions: read and write 权限 */
        val token: String = "",
        /** 必须与 workflow 里 `on: repository_dispatch: types:` 一致 */
        val eventType: String = "site-rebuild",
        /**
         * 防抖窗口：距上次触发不足这个时长就继续攒着。
         * 一次改 5 篇文章只应该触发一次构建。
         */
        val debounce: Duration = Duration.ofSeconds(30),
        /** 单次合并的上限，防止异常情况下一次拼出巨大的 payload */
        val maxBatch: Int = 200,
    )

    /** 留言板的反垃圾参数。四道闸门的顺序与阈值见 docs/04-domain-rules.md §9。 */
    data class Comment(
        /** 与 V5 迁移里的 `char_length(content) <= 1000` 必须一致 */
        val maxLength: Int = 1000,
        val maxNameLength: Int = 30,
        /** 同一 IP 哈希每小时最多几条 */
        val maxPerHour: Int = 5,
        /**
         * 从表单渲染到提交的最短耗时。低于它判定为机器人 ——
         * 真人不可能在 3 秒内读完并填完一个表单。
         */
        val minSubmitMillis: Long = 3_000,
    )

    /** 阅读量打点。 */
    data class View(
        /** 同一 IP 对同一篇内容的去重窗口 */
        val dedupeWindow: Duration = Duration.ofHours(1),
        /** 同一 IP 全站每小时最多打点次数，超出静默丢弃 */
        val maxPerHourPerIp: Int = 100,
    )

    data class Admin(
        val username: String = "admin",
        /** 为空时不会创建管理员，启动会记录 WARN —— 生产环境必须显式配置 */
        val password: String = "",
        /** 置 false 可关闭启动时自动建号（例如管理员由别的方式预置） */
        val autoInitialize: Boolean = true,
    )

    data class Session(
        val cookieName: String = "BLOG_SESSION",
        val ttl: Duration = Duration.ofDays(7),
        /** 生产必须 true；本地 http 调试时由 application-local.yml 关掉 */
        val secure: Boolean = true,
    )

    data class Export(
        /** 为空时导出接口直接返回 503，避免出现"没配 token 就完全公开"的意外 */
        val token: String = "",
    )

    data class Security(
        /** 限流用的 IP 哈希盐。不是高安全用途，但也不该用固定字面量。 */
        val ipSalt: String = "abyssvstar-blog",
    )
}
