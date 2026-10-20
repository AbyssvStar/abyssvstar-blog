package com.abyssvstar.blog.search

import com.abyssvstar.blog.search.es.ElasticsearchHttpClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class SearchService(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    readers: List<SearchReader>,
) {

    private val log = LoggerFactory.getLogger(javaClass)
    private val readersBySource = readers.associateBy { it.source }

    fun search(query: String, page: Int, size: Int): SearchPage {
        val es = readersBySource[SearchSource.ELASTICSEARCH]
        val pg = checkNotNull(readersBySource[SearchSource.POSTGRES]) { "缺少 PostgreSQL 搜索实现" }

        if (props.enabled && es != null && !client.circuitOpen()) {
            try {
                val result = es.search(query, page, size)
                return SearchPage(result.items, result.total, degraded = false)
            } catch (ex: Exception) {
                log.warn("ES 搜索失败，降级到 PostgreSQL: {}", ex.message)
            }
        }

        val fallback = pg.search(query, page, size)
        return SearchPage(fallback.items, fallback.total, degraded = true)
    }
}