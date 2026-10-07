package com.abyssvstar.blog.export.web.dto

import java.time.Instant

/**
 * 给静态站构建用的全量内容快照。
 *
 * 全部来自发布快照，且只含公开内容 —— 归档、私密、软删的文章一个都不会出现。
 */
data class ExportPayload(
    val posts: List<ExportPost>,
    /** 短动态模块还没做，恒为空数组 */
    val notes: List<ExportNote>,
    /** 由已发布文章的标签快照去重统计得来 */
    val tags: List<ExportTag>,
    /** 站点配置还没做，目前为 null，由前端用自己的配置兜底 */
    val siteConfig: ExportSiteConfig? = null,
)

data class ExportPost(
    val slug: String,
    val title: String,
    val summary: String,
    val html: String,
    val coverUrl: String?,
    val tags: List<String>,
    val wordCount: Int,
    val readingMinutes: Int,
    val publishedAt: Instant?,
)

data class ExportNote(
    val id: Long,
    val content: String,
    val publishedAt: Instant?,
)

data class ExportTag(
    val name: String,
    val slug: String,
    val count: Int,
)

data class ExportSiteConfig(
    val title: String,
    val description: String,
)
