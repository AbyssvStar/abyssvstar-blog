package com.abyssvstar.blog.media.web.dto

/** 上传成功后返回的东西：`url` 可以直接写进 Markdown，也可以存成封面。 */
data class AssetResponse(
    val id: Long,
    val url: String,
    val mime: String,
    val sizeBytes: Long,
    val width: Int?,
    val height: Int?,
    val originalName: String?,
    /** key 是宽度档位，如 w400 / w800；value 是可直接使用的公开 URL。 */
    val variants: Map<String, String> = emptyMap(),
    val createdAt: java.time.Instant? = null,
)