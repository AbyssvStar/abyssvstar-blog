package com.abyssvstar.blog.metrics.web

import com.abyssvstar.blog.metrics.service.AdminStatsService
import com.abyssvstar.blog.metrics.web.dto.AdminStatsResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/api/stats")
class AdminStatsController(private val stats: AdminStatsService) {

    @GetMapping
    fun snapshot(): ApiResponse<AdminStatsResponse> = ApiResponse.ok(stats.snapshot())
}