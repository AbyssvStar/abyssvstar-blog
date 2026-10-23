package com.abyssvstar.blog.comment.service

import com.abyssvstar.blog.comment.domain.Comment
import com.abyssvstar.blog.comment.domain.CommentStatus
import com.abyssvstar.blog.comment.repository.CommentRepository
import com.abyssvstar.blog.comment.web.dto.AdminCommentResponse
import com.abyssvstar.blog.comment.web.dto.CommentStatsResponse
import com.abyssvstar.blog.comment.web.dto.CommentSubmitRequest
import com.abyssvstar.blog.comment.web.dto.PublicCommentResponse
import com.abyssvstar.blog.note.repository.NoteRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.shared.ratelimit.RateLimitProperties
import com.abyssvstar.blog.shared.util.ClientIp
import com.abyssvstar.blog.shared.util.Hashing
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.shared.web.PageData
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CommentService(
    private val comments: CommentRepository,
    private val posts: PostRepository,
    private val notes: NoteRepository,
    private val rateProps: RateLimitProperties,
) {

    fun listApproved(postId: Long?, noteId: Long?, page: Int, size: Int): PageData<PublicCommentResponse> {
        requireSingleTarget(postId, noteId)
        if (postId != null) posts.findPublicById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (noteId != null) notes.findPublicById(noteId) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        val result = comments.pageApproved(postId, noteId, page, size)
        return PageData.of(result.records.map { it.toPublic() }, page, size, result.total)
    }

    @Transactional
    fun submit(req: CommentSubmitRequest, request: HttpServletRequest): Unit {
        requireSingleTarget(req.postId, req.noteId)
        if (req.postId != null) posts.findPublicById(req.postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (req.noteId != null) notes.findPublicById(req.noteId) ?: throw BusinessException(ErrorCode.NOTE_NOT_FOUND)
        val elapsed = System.currentTimeMillis() - req.formStartedAt
        val spam = !req.website.isNullOrBlank() || elapsed < MIN_FORM_MILLIS
        val userAgent = request.getHeader("User-Agent")
        comments.insert(
            Comment(
                postId = req.postId,
                noteId = req.noteId,
                authorName = req.authorName.trim(),
                authorEmail = req.authorEmail?.trim()?.ifBlank { null },
                content = req.content.trim(),
                status = if (spam) CommentStatus.SPAM else CommentStatus.PENDING,
                ipHash = ClientIp.hash(request, rateProps.ipSalt),
                userAgentHash = userAgent?.let { Hashing.sha256Hex(it) },
            ),
        )
        // 对外不区分蜜罐/耗时命中，机器人拿不到验证信号。
    }

    fun listAdmin(status: CommentStatus?, page: Int, size: Int): PageData<AdminCommentResponse> {
        val result = comments.pageAdmin(status, page, size)
        return PageData.of(result.records.map { it.toAdmin() }, page, size, result.total)
    }

    fun stats(): CommentStatsResponse = CommentStatsResponse(
        total = comments.total(),
        pending = comments.count(CommentStatus.PENDING),
        approved = comments.count(CommentStatus.APPROVED),
        rejected = comments.count(CommentStatus.REJECTED),
        spam = comments.count(CommentStatus.SPAM),
    )

    @Transactional
    fun review(id: Long, status: CommentStatus) {
        comments.findById(id) ?: throw BusinessException(ErrorCode.NOT_FOUND, "留言不存在")
        if (!comments.updateStatus(id, status)) throw BusinessException(ErrorCode.CONFLICT)
    }

    /** SPAM 保留下来供 IP 封禁统计；其余状态才真的删。 */
    @Transactional
    fun delete(id: Long) {
        val comment = comments.findById(id) ?: throw BusinessException(ErrorCode.NOT_FOUND, "留言不存在")
        if (comment.status == CommentStatus.SPAM) return
        comments.delete(id)
    }

    private fun Comment.toPublic() = PublicCommentResponse(
        id = requireNotNull(id),
        postId = postId,
        noteId = noteId,
        authorName = authorName,
        content = content,
        createdAt = createdAt,
    )

    private fun Comment.toAdmin() = AdminCommentResponse(
        id = requireNotNull(id),
        postId = postId,
        noteId = noteId,
        authorName = authorName,
        authorEmail = authorEmail,
        content = content,
        status = status,
        createdAt = createdAt,
        reviewedAt = reviewedAt,
    )

    private fun requireSingleTarget(postId: Long?, noteId: Long?) {
        if (postId != null && noteId != null) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED, "留言不能同时挂在文章和动态上")
        }
    }

    private companion object {
        const val MIN_FORM_MILLIS = 3_000L
    }
}