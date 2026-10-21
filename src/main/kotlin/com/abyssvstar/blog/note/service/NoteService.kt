package com.abyssvstar.blog.note.service

import com.abyssvstar.blog.media.service.AssetService
import com.abyssvstar.blog.note.domain.Note
import com.abyssvstar.blog.note.domain.NoteStatus
import com.abyssvstar.blog.note.repository.NoteAssetMapper
import com.abyssvstar.blog.note.repository.NoteRepository
import com.abyssvstar.blog.note.web.dto.CreateNoteRequest
import com.abyssvstar.blog.note.web.dto.NoteResponse
import com.abyssvstar.blog.note.web.dto.PublicNoteResponse
import com.abyssvstar.blog.note.web.dto.UpdateNoteRequest
import com.abyssvstar.blog.shared.domain.Visibility
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.shared.web.PageData
import com.abyssvstar.blog.sitebuild.service.SiteBuildService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class NoteService(
    private val notes: NoteRepository,
    private val noteAssets: NoteAssetMapper,
    private val assets: AssetService,
    private val siteBuilds: SiteBuildService,
    private val searchSync: NoteSearchSyncService,
) {

    fun listForAdmin(page: Int, size: Int): PageData<NoteResponse> {
        val result = notes.pageAll(page, size)
        val images = imagesByNote(result.records.mapNotNull { it.id })
        return PageData.of(result.records.map { it.toResponse(images[it.id].orEmpty()) }, page, size, result.total)
    }

    fun listPublic(page: Int, size: Int): PageData<PublicNoteResponse> {
        val result = notes.pagePublic(page, size)
        val images = imagesByNote(result.records.mapNotNull { it.id })
        return PageData.of(
            result.records.map { it.toPublic(images[it.id].orEmpty()) },
            page,
            size,
            result.total,
        )
    }

    fun getPublic(id: Long): PublicNoteResponse {
        val note = notes.findPublicById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        return note.toPublic(imagesByNote(listOf(id))[id].orEmpty())
    }

    @Transactional
    fun create(req: CreateNoteRequest): NoteResponse {
        validate(req.content, req.assetIds)
        val note = Note(
            content = req.content.trim(),
            visibility = req.visibility,
            publishedAt = Instant.now(),
        )
        notes.insert(note)
        val id = requireNotNull(note.id)
        replaceAssets(id, req.assetIds)
        searchSync.request(id)
        if (req.visibility == Visibility.PUBLIC) siteBuilds.requestBuild("note.published:$id")
        return getForAdmin(id)
    }

    @Transactional
    fun update(id: Long, req: UpdateNoteRequest): NoteResponse {
        val note = notes.findById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        validate(req.content, req.assetIds)
        val wasPublic = note.status == NoteStatus.PUBLISHED && note.visibility == Visibility.PUBLIC
        note.content = req.content.trim()
        note.visibility = req.visibility
        if (!notes.update(note)) throw BusinessException(ErrorCode.CONFLICT)
        replaceAssets(id, req.assetIds)
        searchSync.request(id)
        if (wasPublic || (note.status == NoteStatus.PUBLISHED && req.visibility == Visibility.PUBLIC)) {
            siteBuilds.requestBuild("note.updated:$id")
        }
        return getForAdmin(id)
    }

    @Transactional
    fun archive(id: Long): NoteResponse {
        val note = notes.findById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        if (note.status != NoteStatus.PUBLISHED) throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION)
        note.status = NoteStatus.ARCHIVED
        if (!notes.update(note)) throw BusinessException(ErrorCode.CONFLICT)
        searchSync.request(id)
        if (note.visibility == Visibility.PUBLIC) siteBuilds.requestBuild("note.archived:$id")
        return getForAdmin(id)
    }

    @Transactional
    fun restore(id: Long): NoteResponse {
        val note = notes.findById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        if (note.status != NoteStatus.ARCHIVED) throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION)
        note.status = NoteStatus.PUBLISHED
        note.publishedAt = Instant.now()
        if (!notes.update(note)) throw BusinessException(ErrorCode.CONFLICT)
        searchSync.request(id)
        if (note.visibility == Visibility.PUBLIC) siteBuilds.requestBuild("note.restored:$id")
        return getForAdmin(id)
    }

    @Transactional
    fun delete(id: Long) {
        val note = notes.findById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        noteAssets.deleteAll(id)
        notes.softDelete(id)
        searchSync.request(id)
        if (note.status == NoteStatus.PUBLISHED && note.visibility == Visibility.PUBLIC) {
            siteBuilds.requestBuild("note.deleted:$id")
        }
    }

    fun getForAdmin(id: Long): NoteResponse {
        val note = notes.findById(id) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        return note.toResponse(imagesByNote(listOf(id))[id].orEmpty())
    }

    fun exportPublic(): List<PublicNoteResponse> {
        val notes = notes.findAllPublic()
        val images = imagesByNote(notes.mapNotNull { it.id })
        return notes.map { it.toPublic(images[it.id].orEmpty()) }
    }

    private fun replaceAssets(noteId: Long, assetIds: List<Long>) {
        val ids = assetIds.distinct()
        if (ids.size != assetIds.size) throw BusinessException(ErrorCode.NOTE_ASSET_LIMIT, "动态配图不能重复")
        val found = assets.findActiveByIds(ids)
        if (found.size != ids.size) throw BusinessException(ErrorCode.ASSET_NOT_FOUND)
        noteAssets.deleteAll(noteId)
        ids.forEachIndexed { index, assetId -> noteAssets.link(noteId, assetId, index) }
    }

    private fun imagesByNote(noteIds: Collection<Long>): Map<Long, List<com.abyssvstar.blog.media.web.dto.AssetResponse>> {
        if (noteIds.isEmpty()) return emptyMap()
        val links = noteAssets.findLinks(noteIds)
        if (links.isEmpty()) return emptyMap()
        val assetMap = assets.findActiveByIds(links.map { it.assetId }.distinct())
        return links.groupBy { it.noteId }.mapValues { (_, group) ->
            group.mapNotNull { assetMap[it.assetId] }
        }
    }

    private fun validate(content: String, assetIds: List<Long>) {
        if (content.isBlank()) throw BusinessException(ErrorCode.NOTE_TOO_LONG, "动态内容不能为空")
        if (content.codePointCount(0, content.length) > 500) throw BusinessException(ErrorCode.NOTE_TOO_LONG)
        if (assetIds.size > 4) throw BusinessException(ErrorCode.NOTE_ASSET_LIMIT)
    }

    private fun Note.toResponse(images: List<com.abyssvstar.blog.media.web.dto.AssetResponse>) = NoteResponse(
        id = requireNotNull(id),
        content = content,
        status = status,
        visibility = visibility,
        publishedAt = publishedAt,
        viewCount = viewCount,
        images = images,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun Note.toPublic(images: List<com.abyssvstar.blog.media.web.dto.AssetResponse>) = PublicNoteResponse(
        id = requireNotNull(id),
        content = content,
        publishedAt = publishedAt,
        viewCount = viewCount,
        images = images,
    )
}