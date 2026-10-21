package com.abyssvstar.blog.note.repository

import com.abyssvstar.blog.note.domain.Note
import com.abyssvstar.blog.shared.domain.EsSyncStatus
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper
import com.baomidou.mybatisplus.extension.plugins.pagination.Page
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class NoteRepository(private val mapper: NoteMapper) {

    fun findById(id: Long): Note? = mapper.selectOne(active().eq("id", id))

    fun findPublicById(id: Long): Note? = mapper.selectOne(PublishedNoteSpec.wrapper().eq("id", id))

    fun findByIdIncludingDeleted(id: Long): Note? = mapper.selectById(id)

    fun findPublicByIds(ids: Collection<Long>): List<Note> {
        if (ids.isEmpty()) return emptyList()
        return mapper.selectList(PublishedNoteSpec.wrapper().`in`("id", ids))
    }

    fun findAllPublic(): List<Note> =
        mapper.selectList(PublishedNoteSpec.wrapper().orderByDesc("published_at", "id"))

    fun pagePublic(page: Int, size: Int): Page<Note> =
        mapper.selectPage(
            Page(page.toLong(), size.toLong()),
            PublishedNoteSpec.wrapper().orderByDesc("published_at", "id"),
        )

    fun pageAll(page: Int, size: Int): Page<Note> =
        mapper.selectPage(Page(page.toLong(), size.toLong()), active().orderByDesc("updated_at", "id"))

    fun insert(note: Note) {
        mapper.insert(note)
    }

    fun update(note: Note): Boolean = mapper.updateById(note) > 0

    fun findDueSearchSync(limit: Int): List<Note> {
        val now = Instant.now()
        return mapper.selectList(
            QueryWrapper<Note>()
                .`in`("es_sync_status", EsSyncStatus.PENDING.name, EsSyncStatus.FAILED.name)
                .and { it.isNull("es_next_retry_at").or().le("es_next_retry_at", now) }
                .orderByAsc("es_next_retry_at", "id")
                .last("LIMIT $limit"),
        )
    }

    fun markSearchPending(id: Long) {
        mapper.update(
            null,
            UpdateWrapper<Note>()
                .eq("id", id)
                .set("es_sync_status", EsSyncStatus.PENDING.name)
                .set("es_sync_attempts", 0)
                .set("es_next_retry_at", Instant.now())
                .set("es_synced_at", null)
                .set("es_last_error", null),
        )
    }

    fun markSearchSynced(id: Long, status: EsSyncStatus) {
        mapper.update(
            null,
            UpdateWrapper<Note>()
                .eq("id", id)
                .set("es_sync_status", status.name)
                .set("es_sync_attempts", 0)
                .set("es_next_retry_at", null)
                .set("es_synced_at", Instant.now())
                .set("es_last_error", null),
        )
    }

    fun markSearchFailed(id: Long, attempts: Int, retryAt: Instant, error: String) {
        mapper.update(
            null,
            UpdateWrapper<Note>()
                .eq("id", id)
                .set("es_sync_status", EsSyncStatus.FAILED.name)
                .set("es_sync_attempts", attempts)
                .set("es_next_retry_at", retryAt)
                .set("es_last_error", error.take(1000)),
        )
    }

    fun softDelete(id: Long): Boolean {
        val now = Instant.now()
        return mapper.update(
            null,
            UpdateWrapper<Note>()
                .eq("id", id)
                .isNull("deleted_at")
                .set("deleted_at", now)
                .set("updated_at", now),
        ) > 0
    }

    private fun active(): QueryWrapper<Note> = QueryWrapper<Note>().isNull("deleted_at")
}