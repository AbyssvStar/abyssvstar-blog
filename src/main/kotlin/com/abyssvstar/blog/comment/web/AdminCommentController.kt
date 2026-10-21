package com.abyssvstar.blog.comment.web

import com.abyssvstar.blog.comment.domain.CommentStatus
import com.abyssvstar.blog.comment.service.CommentService
import com.abyssvstar.blog.comment.web.dto.AdminCommentResponse
import com.abyssvstar.blog.comment.web.dto.CommentStatsResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/api/comments")
class AdminCommentController(private val comments: CommentService) {

    @GetMapping
    fun list(
        @RequestParam(required = false) status: CommentStatus?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<PageData<AdminCommentResponse>> =
        ApiResponse.ok(comments.listAdmin(status, page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @GetMapping("/stats")
    fun stats(): ApiResponse<CommentStatsResponse> = ApiResponse.ok(comments.stats())

    @PostMapping("/{id}/approve")
    fun approve(@PathVariable id: Long): ApiResponse<Unit> {
        comments.review(id, CommentStatus.APPROVED)
        return ApiResponse.ok()
    }

    @PostMapping("/{id}/reject")
    fun reject(@PathVariable id: Long): ApiResponse<Unit> {
        comments.review(id, CommentStatus.REJECTED)
        return ApiResponse.ok()
    }

    @PostMapping("/{id}/spam")
    fun spam(@PathVariable id: Long): ApiResponse<Unit> {
        comments.review(id, CommentStatus.SPAM)
        return ApiResponse.ok()
    }

    @PostMapping("/{id}/pending")
    fun pending(@PathVariable id: Long): ApiResponse<Unit> {
        comments.review(id, CommentStatus.PENDING)
        return ApiResponse.ok()
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Unit> {
        comments.delete(id)
        return ApiResponse.ok()
    }

    private companion object {
        const val MAX_PAGE_SIZE = 100
    }
}