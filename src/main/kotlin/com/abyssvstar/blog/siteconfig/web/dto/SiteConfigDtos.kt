package com.abyssvstar.blog.siteconfig.web.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

/**
 * 后台的站点配置。关于页正文给的是 Markdown 原文 —— 编辑器要改的就是它。
 *
 * 封面图与头像是 media 地址的快照，没设就是 null：页面上退回渐变底与默认头像。
 */
data class SiteConfigResponse(
    val title: String,
    val description: String,
    val aboutMarkdown: String,
    val aboutCoverUrl: String?,
    val aboutAvatarUrl: String?,
    val updatedAt: Instant?,
)

data class SiteConfigUpdateRequest(
    @field:NotBlank(message = "站名不能为空")
    @field:Size(max = 60, message = "站名不能超过 60 字")
    val title: String,

    @field:NotBlank(message = "站点简介不能为空")
    @field:Size(max = 200, message = "站点简介不能超过 200 字")
    val description: String,

    /** 关于页正文。上限是按「一屏写不完就该写成文章」定的，不是技术限制 */
    @field:Size(max = 20_000, message = "关于页正文不能超过 20000 字")
    val aboutMarkdown: String = "",

    /**
     * 关于页的封面图与头像。PUT 是**整份替换**：不传（或传 null、空串）就是清掉，
     * 后台也一直是把三个字段一起发上来的。
     */
    @field:Size(max = 500, message = "封面图地址不能超过 500 字")
    val aboutCoverUrl: String? = null,

    @field:Size(max = 500, message = "头像地址不能超过 500 字")
    val aboutAvatarUrl: String? = null,
)

data class SiteConfigPreviewRequest(
    val aboutMarkdown: String = "",
)

/** 预览只回 HTML：关于页的字数与阅读时长没人看 */
data class SiteConfigPreviewResponse(
    val html: String,
)