package com.abyssvstar.blog.search.pg

import com.abyssvstar.blog.post.domain.PostPublication
import com.abyssvstar.blog.search.SearchItem
import com.abyssvstar.blog.search.SearchReader
import com.abyssvstar.blog.search.SearchReaderPage
import com.abyssvstar.blog.search.SearchSource
import com.abyssvstar.blog.search.SearchTextExtractor
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component

@Component
class PostgresSearchReader(
    private val mapper: PostgresSearchMapper,
    private val text: SearchTextExtractor,
    private val objectMapper: ObjectMapper,
) : SearchReader {

    override val source: SearchSource = SearchSource.POSTGRES

    override fun search(query: String, page: Int, size: Int): SearchReaderPage {
        val pattern = "%${escapeLike(query)}%"
        val rows = mapper.search(query, pattern, size, (page - 1) * size)
        val total = mapper.count(pattern)
        val items = rows.map { row ->
            val publication = PostPublication(contentMd = row.contentMd, html = row.html)
            SearchItem(
                id = row.postId,
                slug = row.slug,
                title = row.title,
                summaryHtml = text.excerptHtml(row.summary, query),
                bodySnippet = text.excerptHtml(text.sourceText(publication), query),
                tags = parseTags(row.tags),
                publishedAt = row.publishedAt,
            )
        }
        return SearchReaderPage(items, total)
    }

    private fun escapeLike(value: String): String =
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    private fun parseTags(json: String): List<String> =
        runCatching { objectMapper.readValue(json, Array<String>::class.java).toList() }
            .getOrDefault(emptyList())
}