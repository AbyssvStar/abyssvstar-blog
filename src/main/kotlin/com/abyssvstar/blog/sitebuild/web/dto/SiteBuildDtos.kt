package com.abyssvstar.blog.sitebuild.web.dto

import com.abyssvstar.blog.sitebuild.domain.SiteBuildStatus
import java.time.Instant

/** 后台的构建记录视图。 */
data class SiteBuildResponse(
    val id: Long,
    val reason: String?,
    val status: SiteBuildStatus,
    val requestedAt: Instant?,
    val firedAt: Instant?,
    /** GitHub Actions 页面。dispatch 拿不到精确的 run，只能给列表页 */
    val runUrl: String?,
    val error: String?,
)