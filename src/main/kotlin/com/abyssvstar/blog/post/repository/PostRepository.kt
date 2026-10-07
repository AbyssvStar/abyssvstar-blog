package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.Post
import com.abyssvstar.blog.post.domain.PostStatus
import com.abyssvstar.blog.shared.domain.Visibility
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper
import com.baomidou.mybatisplus.extension.plugins.pagination.Page
import org.springframework.stereotype.Component
import java.time.Instant

/** 文章工作副本的查询入口。软删除（`deleted_at`）的过滤都收在这里。 */
@Component
class PostRepository(private val mapper: PostMapper) {

    /** 取未删除的文章。 */
    fun findById(id: Long): Post? = mapper.selectOne(active().eq("id", id))

    /** 按 slug 取未删除的文章。 */
    fun findBySlug(slug: String): Post? = mapper.selectOne(active().eq("slug", slug))

    /** slug 是否已被占用。排除自己和已软删除的。 */
    fun isSlugTaken(slug: String, excludeId: Long? = null): Boolean {
        val wrapper = active().eq("slug", slug)
        if (excludeId != null) wrapper.ne("id", excludeId)
        return mapper.selectCount(wrapper) > 0
    }

    /** 公开可见的文章，按 slug 取。这是访客唯一能读到文章的路径。 */
    fun findPublicBySlug(slug: String): Post? =
        mapper.selectOne(PublishedContentSpec.wrapper().eq("slug", slug))

    /**
     * 公开可见的文章，按发布时间倒序分页。
     *
     * `restrictToIds` 用于按标签过滤：标签在快照的 jsonb 里，先在快照表上查出候选 id，
     * 再作为条件喂回来 —— 这样可见性条件仍然只有 PublishedContentSpec 一处定义。
     */
    fun pagePublic(
        page: Int,
        size: Int,
        restrictToIds: Collection<Long>? = null,
        publishedFrom: Instant? = null,
        publishedBefore: Instant? = null,
    ): Page<Post> {
        val wrapper = PublishedContentSpec.wrapper().orderByDesc("published_at", "id")
        if (restrictToIds != null) wrapper.`in`("id", restrictToIds)
        if (publishedFrom != null) wrapper.ge("published_at", publishedFrom)
        if (publishedBefore != null) wrapper.lt("published_at", publishedBefore)
        return mapper.selectPage(Page(page.toLong(), size.toLong()), wrapper)
    }

    /**
     * 时间上更早的那一篇。
     *
     * 用 `(published_at, id)` 行比较而不是只比时间：同一秒发布两篇时不会重复也不会漏。
     * 这个顺序必须和列表的 `published_at DESC, id DESC` 严格一致。
     */
    fun findPrevPublic(publishedAt: Instant, id: Long): Post? =
        mapper.selectList(
            PublishedContentSpec.wrapper()
                .apply("(published_at, id) < ({0}, {1})", publishedAt, id)
                .orderByDesc("published_at", "id")
                .last("LIMIT 1"),
        ).firstOrNull()

    /** 时间上更晚的那一篇。 */
    fun findNextPublic(publishedAt: Instant, id: Long): Post? =
        mapper.selectList(
            PublishedContentSpec.wrapper()
                .apply("(published_at, id) > ({0}, {1})", publishedAt, id)
                .orderByAsc("published_at", "id")
                .last("LIMIT 1"),
        ).firstOrNull()

    /** 全部公开可见的文章，顺序固定。导出接口用它 —— 顺序不稳，ETag 就不稳，304 会失效。 */
    fun findAllPublic(): List<Post> =
        mapper.selectList(PublishedContentSpec.wrapper().orderByDesc("published_at", "id"))

    /**
     * 到点该发的排期文章，逐条加行锁。
     *
     * 用 `publish_at <= now()` 而不是「刚好等于」：服务器停机跨过了发布时间也不会漏发。
     * `FOR UPDATE SKIP LOCKED` 让重复执行或并发执行不会互相阻塞。
     *
     * 这里的 `visibility = PUBLIC` 和 PublishedContentSpec 不是同一件事 ——
     * 那个判「能不能被访客看到」，这个判「该不该现在发出去」。
     */
    fun lockDueForPublish(): List<Post> =
        mapper.selectList(
            QueryWrapper<Post>()
                .eq("status", PostStatus.SCHEDULED.name)
                .eq("visibility", Visibility.PUBLIC.name)
                .isNull("deleted_at")
                .isNotNull("publish_at")
                .le("publish_at", Instant.now())
                .orderByAsc("publish_at")
                .last("FOR UPDATE SKIP LOCKED"),
        )

    /** 后台列表：全部未删除的文章，按最后修改时间倒序。 */
    fun pageAll(page: Int, size: Int): Page<Post> =
        mapper.selectPage(
            Page(page.toLong(), size.toLong()),
            active().orderByDesc("updated_at", "id"),
        )

    fun insert(post: Post) {
        mapper.insert(post)
    }

    /**
     * 按主键更新，带乐观锁。
     *
     * `@Version` 会让 MyBatis-Plus 自动加上 `WHERE version = ?`，
     * 返回 false 表示版本已被别人改过。
     */
    fun update(post: Post): Boolean = mapper.updateById(post) > 0

    /** 软删除：列表、搜索、导出全部靠 `deleted_at IS NULL` 过滤掉它。 */
    fun softDelete(id: Long): Boolean {
        val now = Instant.now()
        return mapper.update(
            null,
            UpdateWrapper<Post>()
                .eq("id", id)
                .isNull("deleted_at")
                .set("deleted_at", now)
                .set("updated_at", now),
        ) > 0
    }

    private fun active(): QueryWrapper<Post> = QueryWrapper<Post>().isNull("deleted_at")
}
