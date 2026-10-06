package com.abyssvstar.blog.post.web

import com.abyssvstar.blog.post.service.PostService
import com.abyssvstar.blog.post.web.dto.PublicPostResponse
import com.abyssvstar.blog.post.web.dto.PublicPostSummaryResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 公开的文章接口。不带鉴权，也不在拦截器管辖范围内。
 *
 * 内容一律来自发布快照，并且只返回 PublishedContentSpec 判定为公开的文章 ——
 * 私密文章在这里查不到，接口层面上不存在。
 */
@RestController
@RequestMapping("/api/v1/posts")
class PublicPostController(private val postService: PostService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ApiResponse<PageData<PublicPostSummaryResponse>> =
        ApiResponse.ok(postService.listPublic(page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @GetMapping("/{slug}")
    fun detail(@PathVariable slug: String): ApiResponse<PublicPostResponse> =
        ApiResponse.ok(postService.getPublic(slug))

    private companion object {
        /** 公开接口的分页上限，见 docs/05 §4 */
        const val MAX_PAGE_SIZE = 50
    }
}
