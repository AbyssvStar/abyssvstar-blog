package com.abyssvstar.blog.search

import com.abyssvstar.blog.search.es.ElasticsearchHttpClient
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SearchServiceTest {

    private val props = SearchProperties()
    private val client = ElasticsearchHttpClient(props, ObjectMapper())

    @Test
    fun `ES 失败时返回 PG 结果并标记降级`() {
        val service = SearchService(
            props,
            client,
            listOf(
                reader(SearchSource.ELASTICSEARCH, error = IllegalStateException("down")),
                reader(SearchSource.POSTGRES),
            ),
        )

        val result = service.search("Redis", 1, 10)

        assertTrue(result.degraded)
        assertEquals(1, result.items.size)
    }

    @Test
    fun `ES 成功时不走降级`() {
        val service = SearchService(
            props,
            client,
            listOf(
                reader(SearchSource.ELASTICSEARCH),
                reader(SearchSource.POSTGRES),
            ),
        )

        val result = service.search("Redis", 1, 10)

        assertFalse(result.degraded)
        assertEquals(1, result.items.size)
    }

    private fun reader(source: SearchSource, error: Exception? = null) = object : SearchReader {
        override val source: SearchSource = source

        override fun search(query: String, page: Int, size: Int): SearchReaderPage {
            if (error != null) throw error
            return SearchReaderPage(
                items = listOf(
                    SearchItem(
                        id = if (source == SearchSource.ELASTICSEARCH) 1 else 2,
                        slug = "redis",
                        title = "Redis",
                        summaryHtml = "缓存",
                        bodySnippet = null,
                        tags = emptyList(),
                        publishedAt = null,
                    ),
                ),
                total = 1,
            )
        }
    }
}