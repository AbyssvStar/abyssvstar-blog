package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.Post
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

    /** 公开可见的文章，按发布时间倒序分页。 */
    fun pagePublic(page: Int, size: Int): Page<Post> =
        mapper.selectPage(
            Page(page.toLong(), size.toLong()),
            PublishedContentSpec.wrapper().orderByDesc("published_at", "id"),
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
