package com.abyssvstar.blog.taxonomy.service

import com.abyssvstar.blog.shared.util.Slugify
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.taxonomy.domain.Tag
import com.abyssvstar.blog.taxonomy.repository.PostTagMapper
import com.abyssvstar.blog.taxonomy.repository.TagMapper
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 标签。
 *
 * 不单独开「新建标签」接口：保存文章时按名称自动创建。这样写作时不用先跳出去建标签，
 * 直接打就行 —— 直接服务于「降低写作门槛」这条最高优先级。
 */
@Service
class TagService(
    private val tags: TagMapper,
    private val postTags: PostTagMapper,
) {

    /** 一次重写某篇文章的标签。标签名不存在就现建。 */
    @Transactional
    fun replaceTags(postId: Long, names: List<String>) {
        val normalized = names.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        validate(normalized)

        postTags.unlinkAll(postId)
        normalized.forEach { name ->
            val tag = findOrCreate(name)
            postTags.link(postId, requireNotNull(tag.id))
        }
    }

    /** 单篇文章的标签名，按名称排序保证输出稳定。 */
    fun tagNamesOf(postId: Long): List<String> {
        val ids = postTags.findTagIds(postId)
        if (ids.isEmpty()) return emptyList()
        return tags.selectBatchIds(ids).map { it.name }.sorted()
    }

    /** 批量取标签名，供后台列表用，避免逐篇查一次。 */
    fun tagNamesOf(postIds: Collection<Long>): Map<Long, List<String>> {
        if (postIds.isEmpty()) return emptyMap()
        val links = postTags.findLinks(postIds)
        if (links.isEmpty()) return emptyMap()

        val nameById = tags.selectBatchIds(links.map { it.tagId }.distinct())
            .mapNotNull { tag -> tag.id?.let { it to tag.name } }
            .toMap()

        return links.groupBy({ it.postId }, { nameById[it.tagId] })
            .mapValues { (_, names) -> names.filterNotNull().sorted() }
    }

    /** 按名称取标签，不存在则创建。 */
    private fun findOrCreate(name: String): Tag {
        tags.selectOne(QueryWrapper<Tag>().eq("name", name))?.let { return it }

        // 同名或同 slug 被占时 ON CONFLICT 返回 0，不会制造事务错误；撞 slug 就换序号重试
        val base = Slugify.from(name).ifBlank { "tag" }
        repeat(MAX_SLUG_ATTEMPTS) { attempt ->
            val slug = if (attempt == 0) base else "$base-${attempt + 1}"
            if (tags.insertIgnore(name, slug) == 1) {
                return tags.selectOne(QueryWrapper<Tag>().eq("name", name))
                    ?: throw BusinessException(ErrorCode.INTERNAL_ERROR, "标签创建失败：$name")
            }
            // 别人刚建了同名 → 直接用；否则是 slug 撞了 → 下一轮换个序号
            tags.selectOne(QueryWrapper<Tag>().eq("name", name))?.let { return it }
        }
        throw BusinessException(ErrorCode.CONFLICT, "标签创建失败：$name")
    }

    private fun validate(names: List<String>) {
        if (names.size > MAX_TAGS_PER_POST) throw BusinessException(ErrorCode.TOO_MANY_TAGS)
        names.firstOrNull { it.length > MAX_TAG_NAME_LENGTH }
            ?.let { throw BusinessException(ErrorCode.INVALID_TAG_NAME, "标签名不能超过 $MAX_TAG_NAME_LENGTH 字：$it") }
    }

    private companion object {
        const val MAX_TAGS_PER_POST = 5
        const val MAX_TAG_NAME_LENGTH = 20
        const val MAX_SLUG_ATTEMPTS = 50
    }
}
