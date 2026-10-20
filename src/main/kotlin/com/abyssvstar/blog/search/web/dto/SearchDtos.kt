package com.abyssvstar.blog.search.web.dto

import com.abyssvstar.blog.search.SearchPage
import java.time.Instant

data class SearchItemResponse(
    val type: String = "POST",
    val id: Long,
    val slug: String,
    val title: String,
    val summaryHtml: String,
    val bodySnippet: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
)

data class SearchPageResponse(
    val degraded: Boolean,
    val items: List<SearchItemResponse>,
    val page: Int,
    val size: Int,
    val total: Long,
    val totalPages: Int,
)

fun SearchPage.toResponse(page: Int, size: Int) = SearchPageResponse(
    degraded = degraded,
    items = items.map {
        SearchItemResponse(
            id = it.id,
            slug = it.slug,
            title = it.title,
            summaryHtml = it.summaryHtml,
            bodySnippet = it.bodySnippet,
            tags = it.tags,
            publishedAt = it.publishedAt,
        )
    },
    page = page,
    size = size,
    total = total,
    totalPages = if (size <= 0) 0 else ((total + size - 1) / size).toInt(),
)