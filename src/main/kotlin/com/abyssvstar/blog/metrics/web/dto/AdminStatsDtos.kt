package com.abyssvstar.blog.metrics.web.dto

data class AdminStatsResponse(
    val monthAiCost: Double,
    val monthAiCalls: Long,
    val monthAiCached: Long,
    val viewsLast7Days: Long,
    val publishedPosts: Long,
    val publishedNotes: Long,
    val pendingComments: Long,
    val heapUsedBytes: Long,
    val heapMaxBytes: Long,
)