package com.abyssvstar.blog.comment.web

import com.abyssvstar.blog.comment.service.CommentService
import com.abyssvstar.blog.comment.web.dto.CommentSubmitRequest
import com.abyssvstar.blog.comment.web.dto.PublicCommentResponse
import com.abyssvstar.blog.shared.ratelimit.RateLimit
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.shared.web.PageData
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/comments")
class PublicCommentController(private val comments: CommentService) {

    @GetMapping
    fun list(
        @RequestParam(required = false) postId: Long?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<PageData<PublicCommentResponse>> =
        ApiResponse.ok(comments.listApproved(postId, page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @RateLimit(limit = 5, window = "1h", exceededCode = ErrorCode.COMMENT_RATE_LIMITED)
    @PostMapping
    fun submit(
        @Valid @RequestBody body: CommentSubmitRequest,
        request: HttpServletRequest,
    ): ApiResponse<Unit> {
        comments.submit(body, request)
        return ApiResponse(0, "已提交，等待审核")
    }

    private companion object {
        const val MAX_PAGE_SIZE = 50
    }
}