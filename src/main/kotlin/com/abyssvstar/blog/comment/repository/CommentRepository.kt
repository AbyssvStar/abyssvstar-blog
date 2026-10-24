package com.abyssvstar.blog.comment.repository

import com.abyssvstar.blog.comment.domain.Comment
import com.abyssvstar.blog.comment.domain.CommentStatus
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper
import com.baomidou.mybatisplus.extension.plugins.pagination.Page
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class CommentRepository(private val mapper: CommentMapper) {

    fun insert(comment: Comment) {
        mapper.insert(comment)
    }

    fun pageApproved(postId: Long?, noteId: Long?, page: Int, size: Int): Page<Comment> {
        val wrapper = QueryWrapper<Comment>()
            .eq("status", CommentStatus.APPROVED.name)
            .orderByDesc("created_at", "id")
        when {
            postId != null -> wrapper.eq("post_id", postId)
            noteId != null -> wrapper.eq("note_id", noteId)
            else -> {
                wrapper.isNull("post_id")
                wrapper.isNull("note_id")
            }
        }
        return mapper.selectPage(Page(page.toLong(), size.toLong()), wrapper)
    }

    fun pageAdmin(status: CommentStatus?, page: Int, size: Int): Page<Comment> {
        val wrapper = QueryWrapper<Comment>().orderByDesc("created_at", "id")
        if (status != null) wrapper.eq("status", status.name)
        return mapper.selectPage(Page(page.toLong(), size.toLong()), wrapper)
    }

    fun findById(id: Long): Comment? = mapper.selectById(id)

    fun updateStatus(id: Long, status: CommentStatus): Boolean =
        mapper.update(
            null,
            UpdateWrapper<Comment>()
                .eq("id", id)
                .set("status", status.name)
                .set("reviewed_at", Instant.now()),
        ) > 0

    fun delete(id: Long): Boolean = mapper.deleteById(id) > 0

    fun count(status: CommentStatus): Long =
        mapper.selectCount(QueryWrapper<Comment>().eq("status", status.name))

    fun total(): Long = mapper.selectCount(null)
}