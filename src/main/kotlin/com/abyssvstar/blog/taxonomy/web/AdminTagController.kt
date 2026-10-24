package com.abyssvstar.blog.taxonomy.web

import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.taxonomy.service.TagService
import com.abyssvstar.blog.taxonomy.web.dto.TagAdminResponse
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/api/tags")
class AdminTagController(private val tags: TagService) {

    @GetMapping
    fun list(): ApiResponse<List<TagAdminResponse>> = ApiResponse.ok(tags.list())

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Unit> {
        tags.delete(id)
        return ApiResponse.ok()
    }
}