package com.abyssvstar.blog.search.web

import com.abyssvstar.blog.search.SearchAdminService
import com.abyssvstar.blog.search.web.dto.SearchReindexResponse
import com.abyssvstar.blog.search.web.dto.SearchStatusResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/api/search")
class AdminSearchController(private val search: SearchAdminService) {

    @GetMapping("/status")
    fun status(): ApiResponse<SearchStatusResponse> = ApiResponse.ok(search.status())

    @PostMapping("/reindex")
    fun reindex(): ApiResponse<SearchReindexResponse> = ApiResponse.ok(search.reindex())
}