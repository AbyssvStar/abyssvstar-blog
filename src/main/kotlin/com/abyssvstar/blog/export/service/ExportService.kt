package com.abyssvstar.blog.export.service

import com.abyssvstar.blog.export.web.dto.ExportPayload
import com.abyssvstar.blog.export.web.dto.ExportPost
import com.abyssvstar.blog.export.web.dto.ExportTag
import com.abyssvstar.blog.post.domain.PostPublication
import com.abyssvstar.blog.post.repository.PostPublicationRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.shared.util.Hashing
import com.abyssvstar.blog.shared.util.Slugify
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

/**
 * 组装导出内容。
 *
 * 两件事必须守住：
 *  1. **只含公开内容**。文章列表一律走 PostRepository 的公开查询（内部是
 *     PublishedContentSpec），绝不直接扫 post_publications —— 归档的文章快照还在，
 *     直接扫就会把它导到线上去。
 *  2. **稳定排序**，否则内容没变但字节变了，ETag 每次都不一样，304 就失效了。
 */
@Service
class ExportService(
    private val posts: PostRepository,
    private val publications: PostPublicationRepository,
    private val objectMapper: ObjectMapper,
) {

    fun build(): ExportResult {
        val ordered = posts.findAllPublic()
        val pubMap = publications.findByPostIds(ordered.mapNotNull { it.id })

        val exportPosts = ordered.mapNotNull { post ->
            val id = post.id ?: return@mapNotNull null
            val pub = pubMap[id] ?: return@mapNotNull null
            ExportPost(
                slug = pub.slug,
                title = pub.title,
                summary = pub.summary,
                html = pub.html,
                coverUrl = pub.coverUrl,
                tags = parseTags(pub.tags),
                wordCount = pub.wordCount,
                readingMinutes = pub.readingMinutes,
                publishedAt = pub.publishedAt,
            )
        }

        val payload = ExportPayload(
            posts = exportPosts,
            notes = emptyList(),
            tags = collectTags(ordered.mapNotNull { it.id }.mapNotNull { pubMap[it] }),
        )

        // ETag 是整份内容的哈希。内容不变 → 哈希不变 → CI 带 If-None-Match 时直接 304
        return ExportResult(payload, Hashing.sha256Hex(objectMapper.writeValueAsString(payload)))
    }

    private fun collectTags(published: List<PostPublication>): List<ExportTag> =
        published.flatMap { parseTags(it.tags) }
            .groupingBy { it }
            .eachCount()
            .map { (name, count) -> ExportTag(name = name, slug = Slugify.from(name), count = count) }
            .sortedBy { it.name }

    private fun parseTags(json: String): List<String> =
        runCatching { objectMapper.readValue(json, Array<String>::class.java).toList() }
            .getOrDefault(emptyList())
}

/** 导出内容与它的内容哈希。哈希直接当 ETag 用。 */
data class ExportResult(
    val payload: ExportPayload,
    val etag: String,
)
