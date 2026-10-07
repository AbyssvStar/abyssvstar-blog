package com.abyssvstar.blog.sitebuild.domain

/** 一次静态站构建请求的生命周期。 */
enum class SiteBuildStatus {
    PENDING,
    FIRED,
    FAILED,
    CANCELLED,
}
