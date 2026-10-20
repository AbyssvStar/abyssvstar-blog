package com.abyssvstar.blog.search

enum class SearchSource {
    ELASTICSEARCH,
    POSTGRES,
}

interface SearchReader {
    val source: SearchSource

    fun search(query: String, page: Int, size: Int): SearchReaderPage
}

data class SearchReaderPage(
    val items: List<SearchItem>,
    val total: Long,
)