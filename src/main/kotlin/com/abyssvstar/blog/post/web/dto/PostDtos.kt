package com.abyssvstar.blog.post.web.dto

import com.abyssvstar.blog.post.domain.PostStatus
import com.abyssvstar.blog.shared.domain.Visibility
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant

data class CreatePostRequest(
    @field:NotBlank(message = "标题不能为空")
    @field:Size(max = 200, message = "标题不能超过 200 字")
    val title: String,

    /** 不传就按标题自动生成拼音 slug。手填的 slug 撞车会直接报错，不会被悄悄改名 */
    val slug: String? = null,

    @field:Size(max = 500, message = "摘要不能超过 500 字")
    val summary: String? = null,

    val contentMd: String = "",

    val coverAssetId: Long? = null,

    val visibility: Visibility = Visibility.PUBLIC,

    /** 最多 5 个。标签不存在时自动创建 */
    val tags: List<String> = emptyList(),
)

/**
 * 更新，也是自动保存用的接口。只传要改的字段。
 *
 * `version` 必填：客户端把它加载时看到的版本号带回来，服务端对不上就返回 409，
 * 而不是静默覆盖别人的修改。这就是自动保存能安全存在的前提。
 */
data class UpdatePostRequest(
    @field:Size(max = 200, message = "标题不能超过 200 字")
    val title: String? = null,

    val slug: String? = null,

    @field:Size(max = 500, message = "摘要不能超过 500 字")
    val summary: String? = null,

    val contentMd: String? = null,

    val coverAssetId: Long? = null,

    val visibility: Visibility? = null,

    val tags: List<String>? = null,

    @field:NotNull(message = "缺少 version，无法做并发校验")
    val version: Long,
)

data class SlugSuggestRequest(
    @field:NotBlank(message = "标题不能为空")
    val title: String,
)

data class SlugSuggestResponse(
    val slug: String,
)

/** 后台的文章详情。 */
data class PostResponse(
    val id: Long,
    val slug: String,
    val title: String,
    val summary: String?,
    val contentMd: String,
    val coverAssetId: Long?,
    val status: PostStatus,
    val visibility: Visibility,
    val publishAt: Instant?,
    val publishedAt: Instant?,
    val lastPublishedAt: Instant?,
    val viewCount: Long,
    val version: Long,
    val createdAt: Instant?,
    val updatedAt: Instant?,
    val tags: List<String>,
    /** 工作副本与最新发布快照不一致。后台列表上那个提醒「还没上线」的圆点 */
    val hasUnpublishedChanges: Boolean,
)

/** 后台列表项，不含正文。 */
data class PostSummaryResponse(
    val id: Long,
    val slug: String,
    val title: String,
    val summary: String?,
    val status: PostStatus,
    val visibility: Visibility,
    val publishedAt: Instant?,
    val updatedAt: Instant?,
    val version: Long,
    val tags: List<String>,
    val hasUnpublishedChanges: Boolean,
)

/**
 * 公开的文章视图。
 *
 * 全部字段来自发布快照，不是工作副本 —— 读的人看到的必须是「发布出去的那一版」。
 */
data class PublicPostResponse(
    val slug: String,
    val title: String,
    val summary: String,
    val html: String,
    val coverUrl: String?,
    val tags: List<String>,
    val wordCount: Int,
    val readingMinutes: Int,
    val publishedAt: Instant?,
)

data class PublicPostSummaryResponse(
    val slug: String,
    val title: String,
    val summary: String,
    val coverUrl: String?,
    val tags: List<String>,
    val readingMinutes: Int,
    val publishedAt: Instant?,
)

/** 实时预览的请求。编辑器里有未保存的内容，所以正文要一起传上来。 */
data class PreviewRequest(
    val contentMd: String = "",
)

/** 预览结果。渲染器和发布时用的是同一个实例，所以这里看到的就是上线后的样子。 */
data class PreviewResponse(
    val html: String,
    val wordCount: Int,
    val readingMinutes: Int,
)
