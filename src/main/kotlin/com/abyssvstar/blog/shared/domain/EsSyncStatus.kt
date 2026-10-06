package com.abyssvstar.blog.shared.domain

/** 内容的检索索引同步状态。posts 和 notes 共用同一组取值。 */
enum class EsSyncStatus {
    PENDING,
    SYNCED,
    FAILED,
    SKIPPED,
}
