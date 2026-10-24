package com.abyssvstar.blog.note.service

import com.abyssvstar.blog.note.repository.NoteRepository
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
class NoteSearchSyncService(
    private val props: SearchProperties,
    private val notes: NoteRepository,
    private val writer: ElasticsearchIndexWriter,
    private val events: ApplicationEventPublisher,
    @Qualifier("searchSyncExecutor") private val executor: TaskExecutor,
) {

    private val log = LoggerFactory.getLogger(javaClass)
    private val queued = ConcurrentHashMap.newKeySet<Long>()

    fun request(noteId: Long) {
        notes.markSearchPending(noteId)
        events.publishEvent(NoteSearchSyncRequested(noteId))
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun afterCommit(event: NoteSearchSyncRequested) {
        enqueue(event.noteId)
    }

    fun enqueue(noteId: Long) {
        if (!props.enabled || !queued.add(noteId)) return
        try {
            executor.execute { syncNow(noteId) }
        } catch (ex: Exception) {
            queued.remove(noteId)
            log.error("短动态搜索同步排队失败 noteId={}", noteId, ex)
        }
    }

    fun syncNow(noteId: Long) {
        try {
            val note = notes.findByIdIncludingDeleted(noteId)
            if (note == null) {
                writer.deleteNote(noteId)
                return
            }
            if (notes.findPublicById(noteId) == null) {
                writer.deleteNote(noteId)
                notes.markSearchSynced(noteId, EsSyncStatus.SKIPPED)
            } else {
                writer.indexNote(note)
                notes.markSearchSynced(noteId, EsSyncStatus.SYNCED)
            }
        } catch (ex: Exception) {
            val current = runCatching { notes.findByIdIncludingDeleted(noteId) }.getOrNull()
            val attempts = (current?.esSyncAttempts ?: 0) + 1
            val retryAt = Instant.now().plusSeconds(retryDelay(attempts))
            runCatching {
                notes.markSearchFailed(noteId, attempts, retryAt, ex.message ?: ex.javaClass.simpleName)
            }.onFailure { stateError ->
                log.error("记录短动态同步失败状态也失败了 noteId={}", noteId, stateError)
            }
            log.warn("短动态搜索同步失败 noteId={} attempt={}", noteId, attempts, ex)
        } finally {
            queued.remove(noteId)
        }
    }

    private fun retryDelay(attempts: Int): Long =
        min(60L * 2.0.pow((attempts - 1).coerceAtLeast(0)).toLong(), props.syncMaxRetryDelay.seconds)
}