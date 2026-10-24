package com.abyssvstar.blog.metrics.web.dto

import com.abyssvstar.blog.metrics.domain.ContentViewType
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive

data class ViewRecordRequest(
    @field:NotNull
    val type: ContentViewType,
    @field:Positive
    val id: Long,
)

data class ViewCountResponse(
    val type: ContentViewType,
    val id: Long,
    val count: Long,
)