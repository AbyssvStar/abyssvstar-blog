package com.abyssvstar.blog.search.sync

import com.abyssvstar.blog.post.repository.PostPublicationRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.search.SearchProperties
import com.abyssvstar.blog.search.es.ElasticsearchIndexWriter
import com.abyssvstar.blog.shared.domain.EsSyncStatus
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.ApplicationEventPublisher
import org.springframework.core.task.TaskExecutor
import org.springframework.stereotype.Service
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.min
import kotlin.math.pow

@Service
class PostSearchSyncService(
    private val props: SearchProperties,
    private val posts: PostRepository,
    private val publications: PostPublicationRepository,
    private val writer: ElasticsearchIndexWriter,
    private val events: ApplicationEventPublisher,
    @Qualifier("searchSyncExecutor") private val executor: TaskExecutor,
) {

    private val log = LoggerFactory.getLogger(javaClass)
    private val queued = ConcurrentHashMap.newKeySet<Long>()

    /** 必须在发布事务内调用；AFTER_COMMIT 保证远程索引不会污染发布事务。 */
    fun request(postId: Long) {
        posts.markSearchPending(postId)
        events.publishEvent(PostSearchSyncRequested(postId))
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun afterCommit(event: PostSearchSyncRequested) {
        enqueue(event.postId)
    }

    fun enqueue(postId: Long) {
        if (!props.enabled) return
        if (!queued.add(postId)) return
        try {
            executor.execute { syncNow(postId) }
        } catch (ex: Exception) {
            queued.remove(postId)
            log.error("搜索同步任务排队失败 postId={}", postId, ex)
        }
    }

    fun syncNow(postId: Long) {
        try {
            val post = posts.findByIdIncludingDeleted(postId)
            if (post == null) {
                writer.delete(postId)
                return
            }
            if (posts.findPublicById(postId) == null) {
                writer.delete(postId)
                posts.markSearchSynced(postId, EsSyncStatus.SKIPPED)
                log.info("文章不再公开，已从搜索索引移除 postId={}", postId)
                return
            }
            val publication = publications.findByPostId(postId)
                ?: error("公开可见但缺少发布快照 postId=$postId")
            writer.index(publication)
            posts.markSearchSynced(postId, EsSyncStatus.SYNCED)
            log.info("搜索索引同步完成 postId={} slug={}", postId, publication.slug)
        } catch (ex: Exception) {
            val current = runCatching { posts.findByIdIncludingDeleted(postId) }.getOrNull()
            val attempts = (current?.esSyncAttempts ?: 0) + 1
            val retryAt = Instant.now().plusSeconds(retryDelaySeconds(attempts))
            runCatching {
                posts.markSearchFailed(postId, attempts, retryAt, ex.message ?: ex.javaClass.simpleName)
            }.onFailure { stateError ->
                log.error("记录搜索同步失败状态也失败了 postId={}", postId, stateError)
            }
            if (attempts >= ERROR_AFTER_ATTEMPTS) {
                log.error("搜索索引连续失败 {} 次 postId={}", attempts, postId, ex)
            } else {
                log.warn("搜索索引同步失败 postId={} attempt={}: {}", postId, attempts, ex.message)
            }
        } finally {
            queued.remove(postId)
        }
    }

    private fun retryDelaySeconds(attempts: Int): Long {
        val exponential = INITIAL_RETRY_SECONDS * 2.0.pow((attempts - 1).coerceAtLeast(0))
        return min(exponential.toLong(), props.syncMaxRetryDelay.seconds)
    }

    private companion object {
        const val INITIAL_RETRY_SECONDS = 60L
        const val ERROR_AFTER_ATTEMPTS = 5
    }
}