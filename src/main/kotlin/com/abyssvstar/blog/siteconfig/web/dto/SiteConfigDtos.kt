package com.abyssvstar.blog.siteconfig.web.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

/** 后台的站点配置。关于页正文给的是 Markdown 原文 —— 编辑器要改的就是它。 */
data class SiteConfigResponse(
    val title: String,
    val description: String,
    val aboutMarkdown: String,
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
)

data class SiteConfigPreviewRequest(
    val aboutMarkdown: String = "",
)

/** 预览只回 HTML：关于页的字数与阅读时长没人看 */
data class SiteConfigPreviewResponse(
    val html: String,
)