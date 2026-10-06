package com.abyssvstar.blog.post.domain

/** 文章的生命周期。与 `visibility` 正交：私密笔记可以是 DRAFT+PRIVATE，也可以是 PUBLISHED+PRIVATE。 */
enum class PostStatus {
    DRAFT,
    SCHEDULED,
    PUBLISHED,
    ARCHIVED,
}
