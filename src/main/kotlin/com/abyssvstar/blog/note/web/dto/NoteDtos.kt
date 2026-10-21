package com.abyssvstar.blog.note.web.dto

import com.abyssvstar.blog.media.web.dto.AssetResponse
import com.abyssvstar.blog.note.domain.NoteStatus
import com.abyssvstar.blog.shared.domain.Visibility
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

data class CreateNoteRequest(
    @field:NotBlank(message = "动态内容不能为空")
    @field:Size(max = 500, message = "动态内容不能超过 500 字")
    val content: String,
    val visibility: Visibility = Visibility.PUBLIC,
    @field:Size(max = 4, message = "动态最多配 4 张图")
    val assetIds: List<Long> = emptyList(),
)

data class UpdateNoteRequest(
    @field:NotBlank(message = "动态内容不能为空")
    @field:Size(max = 500, message = "动态内容不能超过 500 字")
    val content: String,
    val visibility: Visibility,
    @field:Size(max = 4, message = "动态最多配 4 张图")
    val assetIds: List<Long> = emptyList(),
)

data class NoteResponse(
    val id: Long,
    val content: String,
    val status: NoteStatus,
    val visibility: Visibility,
    val publishedAt: Instant,
    val viewCount: Long,
    val images: List<AssetResponse>,
    val createdAt: Instant?,
    val updatedAt: Instant?,
)

data class PublicNoteResponse(
    val id: Long,
    val content: String,
    val publishedAt: Instant,
    val viewCount: Long,
    val images: List<AssetResponse>,
)