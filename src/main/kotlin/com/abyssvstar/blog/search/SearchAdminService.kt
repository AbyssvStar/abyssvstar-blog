package com.abyssvstar.blog.search

import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.search.es.ElasticsearchHttpClient
import com.abyssvstar.blog.search.es.SearchIndexManager
import com.abyssvstar.blog.search.sync.PostSearchSyncService
import com.abyssvstar.blog.search.web.dto.SearchReindexResponse
import com.abyssvstar.blog.search.web.dto.SearchStatusResponse
import com.abyssvstar.blog.shared.domain.EsSyncStatus
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.springframework.stereotype.Service

@Service
class SearchAdminService(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    private val indices: SearchIndexManager,
    private val posts: PostRepository,
    private val sync: PostSearchSyncService,
) {

    fun status(): SearchStatusResponse {
        val reachable = client.ping()
        return SearchStatusResponse(
            enabled = props.enabled,
            reachable = reachable,
            articleDocuments = if (reachable) runCatching { indices.count(props.articleIndex) }.getOrNull() else null,
            chunkDocuments = if (reachable) runCatching { indices.count(props.chunkIndex) }.getOrNull() else null,
            pendingPosts = posts.countSearchStatus(EsSyncStatus.PENDING),
            failedPosts = posts.countSearchStatus(EsSyncStatus.FAILED),
            embeddingModel = props.embeddingModel,
            embeddingDims = props.embeddingDims,
        )
    }

    /** 内容索引重建到新 mapping 时先删后建；重建期间公开搜索会走 PG 降级。 */
    fun reindex(): SearchReindexResponse {
        if (!props.enabled) throw BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "搜索功能未启用")
        if (!client.ping()) throw BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "Elasticsearch 暂不可达")
        indices.recreateContentIndices()
        val ids = posts.findAllPublicIds()
        ids.forEach(sync::request)
        return SearchReindexResponse(queuedPosts = ids.size)
    }
}