package com.abyssvstar.blog.siteconfig.web

import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.siteconfig.service.SiteConfigService
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigPreviewRequest
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigPreviewResponse
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigResponse
import com.abyssvstar.blog.siteconfig.web.dto.SiteConfigUpdateRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 站点配置：站名、SEO 简介、关于页正文。
 *
 * 保存就是上线动作本身 —— 没有单独的「发布」，改完存下来，站点就会重建。
 */
@RestController
@RequestMapping("/admin/api/site-config")
class AdminSiteConfigController(private val config: SiteConfigService) {

    @GetMapping
    fun get(): ApiResponse<SiteConfigResponse> = ApiResponse.ok(config.get())

    @PutMapping
    fun update(@Valid @RequestBody body: SiteConfigUpdateRequest): ApiResponse<SiteConfigResponse> =
        ApiResponse.ok(config.update(body))

    /** 实时预览。渲染器和发布时同一个实例，看到的就是上线后的样子 */
    @PostMapping("/preview")
    fun preview(@Valid @RequestBody body: SiteConfigPreviewRequest): ApiResponse<SiteConfigPreviewResponse> =
        ApiResponse.ok(SiteConfigPreviewResponse(config.preview(body.aboutMarkdown)))
}