package com.abyssvstar.blog.sitebuild.web

import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import com.abyssvstar.blog.sitebuild.service.SiteBuildService
import com.abyssvstar.blog.sitebuild.web.dto.SiteBuildResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 后台看构建、手动触发。整个类都在 AuthInterceptor 与 CsrfInterceptor 的管辖范围内。
 *
 * 发布、归档、删除都会写 PENDING，真正发出去由防抖任务合并（见 `SiteBuildTrigger`）。
 */
@RestController
@RequestMapping("/admin/api/builds")
class AdminSiteBuildController(private val builds: SiteBuildService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ApiResponse<PageData<SiteBuildResponse>> =
        ApiResponse.ok(builds.page(page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    /** 手动触发：只记一条 PENDING，合并与防抖交给定时任务，和发布走同一条路。 */
    @PostMapping("/trigger")
    fun trigger(): ApiResponse<SiteBuildResponse> = ApiResponse.ok(builds.requestManualBuild())

    private companion object {
        const val MAX_PAGE_SIZE = 100
    }
}