package com.abyssvstar.blog.siteconfig.service

import com.abyssvstar.blog.shared.util.MarkdownRenderer
import com.abyssvstar.blog.sitebuild.service.SiteBuildService
import com.abyssvstar.blog.siteconfig.domain.SiteConfig
import com.abyssvstar.blog.siteconfig.repository.SiteConfigRepository
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigResponse
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigUpdateRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 站点配置。
 *
 * 关于页正文也在这里：它和站名一样属于「作者在后台改、重建后上站」的文字，走同一条路 ——
 * 改完存库 → 记一条 PENDING → 防抖合并成一次构建。
 *
 * 渲染用的是 [MarkdownRenderer]，和文章发布、后台预览同一个实例。所以关于页的排版天然
 * 和文章一致；公开站那边只需补标题锚点和代码配色，和文章正文走的是同一段构建期处理。
 */
@Service
class SiteConfigService(
    private val configs: SiteConfigRepository,
    private val markdown: MarkdownRenderer,
    private val siteBuilds: SiteBuildService,
) {

    /** 后台读：给的是 Markdown 原文 */
    fun get(): SiteConfigResponse = current().toResponse()

    /** 导出读：站名、简介，以及渲染好的关于页正文。一次读全，别让导出为同一行查两遍 */
    fun exportView(): SiteConfigExport = current().let {
        SiteConfigExport(
            title = it.title,
            description = it.description,
            aboutHtml = markdown.render(it.aboutMd),
            aboutCoverUrl = it.aboutCoverUrl,
            aboutAvatarUrl = it.aboutAvatarUrl,
        )
    }

    /** 编辑器的实时预览。和文章预览一样，没有任何副作用 */
    fun preview(aboutMarkdown: String): String = markdown.render(aboutMarkdown)

    /**
     * 保存。只有真的改了才记构建请求 —— 点开看一眼再顺手保存一下，不该让 CI 白跑一轮。
     */
    @Transactional
    fun update(request: SiteConfigUpdateRequest): SiteConfigResponse {
        val before = current()
        val after = SiteConfig(
            title = request.title.trim(),
            description = request.description.trim(),
            aboutMd = request.aboutMarkdown,
            // 空串按「没设」处理：后台清空输入框和点「移除」应该是一回事
            aboutCoverUrl = request.aboutCoverUrl?.trim()?.ifEmpty { null },
            aboutAvatarUrl = request.aboutAvatarUrl?.trim()?.ifEmpty { null },
        )
        if (!configs.save(after)) throw IllegalStateException("站点配置写入失败")

        val changed = before.title != after.title ||
            before.description != after.description ||
            before.aboutMd != after.aboutMd ||
            before.aboutCoverUrl != after.aboutCoverUrl ||
            before.aboutAvatarUrl != after.aboutAvatarUrl
        // 只有真的改了才记构建：上传图之后顺手保存、结果什么都没变，不该让 CI 白跑
        if (changed) siteBuilds.requestBuild("site-config.updated")
        return current().toResponse()
    }

    /** 行不该丢（迁移里就插好了）。真丢了也得让站点起得来，所以这里给一份兜底 */
    private fun current(): SiteConfig =
        configs.find() ?: SiteConfig(title = FALLBACK_TITLE, description = "")

    private fun SiteConfig.toResponse() = SiteConfigResponse(
        title = title,
        description = description,
        aboutMarkdown = aboutMd,
        aboutCoverUrl = aboutCoverUrl,
        aboutAvatarUrl = aboutAvatarUrl,
        updatedAt = updatedAt,
    )

    private companion object {
        const val FALLBACK_TITLE = "AbyssvStar"
    }
}

/** 导出接口要的那几样：站名、简介、关于页的 HTML（不是 Markdown 原文），以及那两张图 */
data class SiteConfigExport(
    val title: String,
    val description: String,
    val aboutHtml: String,
    val aboutCoverUrl: String?,
    val aboutAvatarUrl: String?,
)