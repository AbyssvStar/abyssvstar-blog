package com.abyssvstar.blog.search.web

import com.abyssvstar.blog.search.SearchService
import com.abyssvstar.blog.search.web.dto.SearchPageResponse
import com.abyssvstar.blog.search.web.dto.toResponse
import com.abyssvstar.blog.shared.ratelimit.KeyBy
import com.abyssvstar.blog.shared.ratelimit.RateLimit
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.springframework.http.CacheControl
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/search")
class PublicSearchController(private val search: SearchService) {

    @RateLimit(keyBy = KeyBy.IP, limit = 60, window = "1m")
    @GetMapping
    fun search(
        @RequestParam q: String,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ResponseEntity<ApiResponse<SearchPageResponse>> {
        val query = q.trim()
        if (query.isEmpty()) throw BusinessException(ErrorCode.VALIDATION_FAILED, "搜索词不能为空")
        if (query.length > MAX_QUERY_LENGTH) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED, "搜索词不能超过 $MAX_QUERY_LENGTH 字")
        }
        val safePage = page.coerceAtLeast(1)
        val safeSize = size.coerceIn(1, MAX_PAGE_SIZE)
        val result = search.search(query, safePage, safeSize)
        val data = result.toResponse(safePage, safeSize)
        val response = if (result.degraded) {
            ApiResponse(ErrorCode.SEARCH_DEGRADED.code, ErrorCode.SEARCH_DEGRADED.defaultMessage, data)
        } else {
            ApiResponse.ok(data)
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response)
    }

    private companion object {
        const val MAX_PAGE_SIZE = 20
        const val MAX_QUERY_LENGTH = 100
    }
}