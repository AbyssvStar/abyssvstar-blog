package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.Post
import com.abyssvstar.blog.post.domain.PostStatus
import com.abyssvstar.blog.shared.domain.Visibility
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import java.time.Instant

/**
 * 「这条内容能不能被访客看到」的**唯一**判定处。
 *
 * 真源只有一条：
 * `status = PUBLISHED AND visibility = PUBLIC AND deleted_at IS NULL AND published_at <= now()`
 *
 * 这个条件一旦散落到多处，迟早有一处漏掉 `visibility` —— 那就等于把私密内容挂到了公网。
 * 所以任何要判断公开可见性的查询都必须经过这里，不要自己拼条件。
 */
object PublishedContentSpec {

    fun wrapper(): QueryWrapper<Post> = QueryWrapper<Post>()
        .eq("status", PostStatus.PUBLISHED.name)
        .eq("visibility", Visibility.PUBLIC.name)
        .isNull("deleted_at")
        .isNotNull("published_at")
        .le("published_at", Instant.now())
}
