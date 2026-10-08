package com.abyssvstar.blog.post.web

import com.abyssvstar.blog.post.service.PostService
import com.abyssvstar.blog.post.service.PublishService
import com.abyssvstar.blog.post.web.dto.CreatePostRequest
import com.abyssvstar.blog.post.web.dto.PostResponse
import com.abyssvstar.blog.post.web.dto.PostSummaryResponse
import com.abyssvstar.blog.post.web.dto.PreviewRequest
import com.abyssvstar.blog.post.web.dto.PreviewResponse
import com.abyssvstar.blog.post.web.dto.SchedulePostRequest
import com.abyssvstar.blog.post.web.dto.SlugSuggestRequest
import com.abyssvstar.blog.post.web.dto.SlugSuggestResponse
import com.abyssvstar.blog.post.web.dto.UpdatePostRequest
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 后台的文章接口。整个类都在 AuthInterceptor 与 CsrfInterceptor 的管辖范围内。
 *
 * `PATCH /{id}` 同时是自动保存的入口：它只写工作副本，不触发构建、不碰发布快照。
 */
@RestController
@RequestMapping("/admin/api/posts")
class AdminPostController(
    private val postService: PostService,
    private val publishService: PublishService,
) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ApiResponse<PageData<PostSummaryResponse>> =
        ApiResponse.ok(postService.listForAdmin(page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): ApiResponse<PostResponse> =
        ApiResponse.ok(postService.getForAdmin(id))

    @PostMapping
    fun create(@Valid @RequestBody body: CreatePostRequest): ApiResponse<PostResponse> =
        ApiResponse.ok(postService.create(body))

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @Valid @RequestBody body: UpdatePostRequest,
    ): ApiResponse<PostResponse> = ApiResponse.ok(postService.update(id, body))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Unit> {
        postService.delete(id)
        return ApiResponse.ok()
    }

    @PostMapping("/slug-suggest")
    fun suggestSlug(@Valid @RequestBody body: SlugSuggestRequest): ApiResponse<SlugSuggestResponse> =
        ApiResponse.ok(SlugSuggestResponse(postService.suggestSlug(body.title)))

    /** 发布：把工作副本定格成快照。整条流程一个事务。 */
    @PostMapping("/{id}/publish")
    fun publish(@PathVariable id: Long): ApiResponse<PostResponse> =
        ApiResponse.ok(publishService.publish(id))

    @PostMapping("/{id}/archive")
    fun archive(@PathVariable id: Long): ApiResponse<PostResponse> =
        ApiResponse.ok(publishService.archive(id))

    @PostMapping("/{id}/restore")
    fun restore(@PathVariable id: Long): ApiResponse<PostResponse> =
        ApiResponse.ok(publishService.restore(id))

    /** 排期。到点由每分钟的定时任务走与手动发布完全相同的流程。 */
    @PostMapping("/{id}/schedule")
    fun schedule(
        @PathVariable id: Long,
        @Valid @RequestBody body: SchedulePostRequest,
    ): ApiResponse<PostResponse> = ApiResponse.ok(publishService.schedule(id, body.publishAt))

    @PostMapping("/{id}/cancel-schedule")
    fun cancelSchedule(@PathVariable id: Long): ApiResponse<PostResponse> =
        ApiResponse.ok(publishService.cancelSchedule(id))

    /** 实时预览。没有副作用：不写库、不碰快照、不触发构建。 */
    @PostMapping("/{id}/preview")
    fun preview(
        @PathVariable id: Long,
        @Valid @RequestBody body: PreviewRequest,
    ): ApiResponse<PreviewResponse> = ApiResponse.ok(publishService.preview(body.contentMd))

    private companion object {
        /** 后台接口的分页上限；公开接口那侧更低，见 `PublicPostController` */
        const val MAX_PAGE_SIZE = 100
    }
}
