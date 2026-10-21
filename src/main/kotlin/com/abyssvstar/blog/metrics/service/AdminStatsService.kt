package com.abyssvstar.blog.metrics.service

import com.abyssvstar.blog.metrics.repository.AdminStatsMapper
import com.abyssvstar.blog.metrics.web.dto.AdminStatsResponse
import org.springframework.stereotype.Service

@Service
class AdminStatsService(private val mapper: AdminStatsMapper) {

    fun snapshot(): AdminStatsResponse {
        val runtime = Runtime.getRuntime()
        return AdminStatsResponse(
            monthAiCost = mapper.monthAiCost(),
            monthAiCalls = mapper.monthAiCalls(),
            monthAiCached = mapper.monthAiCached(),
            viewsLast7Days = mapper.viewsLast7Days(),
            publishedPosts = mapper.publishedPosts(),
            publishedNotes = mapper.publishedNotes(),
            pendingComments = mapper.pendingComments(),
            heapUsedBytes = runtime.totalMemory() - runtime.freeMemory(),
            heapMaxBytes = runtime.maxMemory(),
        )
    }
}