package com.abyssvstar.blog.comment.web.dto

import com.abyssvstar.blog.comment.domain.CommentStatus
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant

data class CommentSubmitRequest(
    val postId: Long? = null,
    @field:NotBlank(message = "昵称不能为空")
    @field:Size(max = 30, message = "昵称不能超过 30 字")
    val authorName: String,
    @field:Email(message = "邮箱格式不正确")
    @field:Size(max = 200, message = "邮箱不能超过 200 字")
    val authorEmail: String? = null,
    @field:NotBlank(message = "留言内容不能为空")
    @field:Size(max = 1000, message = "留言不能超过 1000 字")
    val content: String,
    /** 正常用户永远看不到；机器人填了就判定 SPAM。 */
    val website: String? = null,
    @field:NotNull(message = "缺少表单时间")
    val formStartedAt: Long,
)

data class PublicCommentResponse(
    val id: Long,
    val postId: Long?,
    val authorName: String,
    val content: String,
    val createdAt: Instant?,
)

data class AdminCommentResponse(
    val id: Long,
    val postId: Long?,
    val authorName: String,
    val authorEmail: String?,
    val content: String,
    val status: CommentStatus,
    val createdAt: Instant?,
    val reviewedAt: Instant?,
)

data class CommentStatsResponse(
    val total: Long,
    val pending: Long,
    val approved: Long,
    val rejected: Long,
    val spam: Long,
)