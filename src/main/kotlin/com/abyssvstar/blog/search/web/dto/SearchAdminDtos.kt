package com.abyssvstar.blog.search.web.dto

data class SearchStatusResponse(
    val enabled: Boolean,
    val reachable: Boolean,
    val articleDocuments: Long?,
    val chunkDocuments: Long?,
    val pendingPosts: Long,
    val failedPosts: Long,
    val embeddingModel: String,
    val embeddingDims: Int,
)

data class SearchReindexResponse(
    val queuedPosts: Int,
)