package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.PostPublication
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import org.springframework.stereotype.Component

/** 发布快照的查询入口。与 `posts` 是 1:1，主键就是 post_id。 */
@Component
class PostPublicationRepository(private val mapper: PostPublicationMapper) {

    fun findByPostId(postId: Long): PostPublication? = mapper.selectById(postId)

    /** 批量取，供后台列表算「有没有未发布的修改」。 */
    fun findByPostIds(postIds: Collection<Long>): Map<Long, PostPublication> {
        if (postIds.isEmpty()) return emptyMap()
        return mapper.selectList(QueryWrapper<PostPublication>().`in`("post_id", postIds))
            .mapNotNull { pub -> pub.postId?.let { it to pub } }
            .toMap()
    }

    /** 发布时写入或覆盖。一张表只保留最新一次发布。 */
    fun upsert(publication: PostPublication): Boolean {
        val existed = mapper.selectById(publication.postId) != null
        return if (existed) {
            // updated_at 由 AuditMetaObjectHandler 填
            mapper.updateById(publication) > 0
        } else {
            mapper.insert(publication) > 0
        }
    }

    /** 文章被删除时要立刻从线上消失，所以发布快照是直接删掉而不是软删。 */
    fun deleteByPostId(postId: Long): Boolean = mapper.deleteById(postId) > 0
}
