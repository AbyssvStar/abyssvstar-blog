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
)