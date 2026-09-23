package com.abyssvstar.blog.shared.domain

/**
 * 可见性。
 *
 * `PRIVATE` 的内容有一组硬性约束
 *  1. 永不写入发布快照
 *  2. 永不进公开 API（包括导出、搜索、RSS、sitemap）
 *  3. 永不进公开索引
 *  4. 后台展示时必须明确标记，避免作者自己看错
 *
 */
enum class Visibility {
    PUBLIC,
    PRIVATE,
}
