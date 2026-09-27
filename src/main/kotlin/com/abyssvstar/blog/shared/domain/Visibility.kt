package com.abyssvstar.blog.shared.domain

/**
 * 可见性。
 *
 * `PRIVATE` 的内容永不写入发布快照，永不进公开 API 与公开索引，
 * 后台列表里必须明确标出来。
 */
enum class Visibility {
    PUBLIC,
    PRIVATE,
}
