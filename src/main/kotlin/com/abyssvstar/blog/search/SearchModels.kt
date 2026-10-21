package com.abyssvstar.blog.search

import java.time.Instant

/** 搜索命中统一成站端可展示的形状；高亮片段已经过白名单清洗。 */
data class SearchPage(
    val items: List<SearchItem>,
    val total: Long,
    val degraded: Boolean,
)

data class SearchItem(
    val type: String,
    val id: Long,
    val slug: String,
    val title: String,
    val summaryHtml: String,
    val bodySnippet: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
)

/** ES 命中只提供 id、排序和摘要片段，正文事实仍从 PostgreSQL 的发布快照补回。 */
data class SearchHit(
    val type: String,
    val id: Long,
    val highlights: Map<String, String>,
)

data class SearchHitPage(
    val hits: List<SearchHit>,
    val total: Long,
)

data class SearchChunk(
    val chunkIndex: Int,
    val headingPath: String,
    val text: String,
    val anchor: String?,
)