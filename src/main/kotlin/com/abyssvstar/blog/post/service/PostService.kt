package com.abyssvstar.blog.post.service

import com.abyssvstar.blog.post.domain.Post
import com.abyssvstar.blog.post.domain.PostPublication
import com.abyssvstar.blog.post.domain.PostStatus
import com.abyssvstar.blog.post.repository.PostPublicationRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.post.web.dto.CreatePostRequest
import com.abyssvstar.blog.post.web.dto.PostResponse
import com.abyssvstar.blog.post.web.dto.PostSummaryResponse
import com.abyssvstar.blog.post.web.dto.PublicPostResponse
import com.abyssvstar.blog.post.web.dto.AdjacentPost
import com.abyssvstar.blog.post.web.dto.PublicPostSummaryResponse
import com.abyssvstar.blog.post.web.dto.UpdatePostRequest
import com.abyssvstar.blog.shared.domain.Visibility
import com.abyssvstar.blog.shared.util.Slugify
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.shared.web.PageData
import com.abyssvstar.blog.sitebuild.service.SiteBuildService
import com.abyssvstar.blog.taxonomy.service.TagService
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneId

/**
 * 文章工作副本的读写。
 *
 * 这里只碰工作副本，不碰发布快照 —— 发布是另一条路，见 `PublishService`。
 * 自动保存走 [update]，它不触发构建、不推 ES，只写这一张表。
 */
@Service
class PostService(
    private val posts: PostRepository,
    private val publications: PostPublicationRepository,
    private val tags: TagService,
    private val objectMapper: ObjectMapper,
    private val siteBuilds: SiteBuildService,
) {

    // ---------- 后台 ----------

    fun listForAdmin(page: Int, size: Int): PageData<PostSummaryResponse> {
        val result = posts.pageAll(page, size)
        val ids = result.records.mapNotNull { it.id }

        // 批量取，避免逐篇查标签和发布快照
        val tagMap = tags.tagNamesOf(ids)
        val pubMap = publications.findByPostIds(ids)

        val items = result.records.map { post ->
            val names = tagMap[post.id] ?: emptyList()
            post.toSummary(names, isStale(post, names, pubMap[post.id]))
        }
        return PageData.of(items, page, size, result.total)
    }

    fun getForAdmin(id: Long): PostResponse {
        val post = posts.findById(id) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        val names = tags.tagNamesOf(id)
        return post.toResponse(names, isStale(post, names, publications.findByPostId(id)))
    }

    @Transactional
    fun create(req: CreatePostRequest): PostResponse {
        val post = Post(
            slug = resolveSlug(req.slug, req.title, null),
            title = req.title,
            summary = req.summary,
            contentMd = req.contentMd,
            coverAssetId = req.coverAssetId,
            visibility = req.visibility,
            status = PostStatus.DRAFT,
        )
        posts.insert(post)
        val id = requireNotNull(post.id) { "插入后应当拿到自增主键" }

        tags.replaceTags(id, req.tags)
        return getForAdmin(id)
    }

    @Transactional
    fun update(id: Long, req: UpdatePostRequest): PostResponse {
        val post = posts.findById(id) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)

        // 把实体上的版本换成客户端带来的那个：MyBatis-Plus 会用它拼 WHERE version = ?
        // 对不上就是 0 行，说明这份内容在别处已经被改过了
        post.version = req.version

        req.title?.let { post.title = it }
        // 摘要传空串表示清空，否则没法把已有摘要去掉
        req.summary?.let { post.summary = it.ifBlank { null } }
        req.contentMd?.let { post.contentMd = it }
        req.coverAssetId?.let { post.coverAssetId = it }
        req.visibility?.let { post.visibility = it }
        req.slug?.let { post.slug = resolveSlug(it, post.title, id) }

        // 从私密改回公开：快照在转私密时就已经删掉了，状态不能还停在 PUBLISHED ——
        // 那会变成「后台说已发布、公开接口查不到内容」。退回草稿，明确告诉人要重新发布。
        if (post.visibility == Visibility.PUBLIC && post.status == PostStatus.PUBLISHED && publications.findByPostId(id) == null) {
            post.status = PostStatus.DRAFT
        }

        if (!posts.update(post)) throw BusinessException(ErrorCode.CONFLICT)
        req.tags?.let { tags.replaceTags(id, it) }

        // 改成私密等于撤回。旧的发布快照留着会被导出接口带走，私人内容就上线了
        if (post.visibility == Visibility.PRIVATE && publications.deleteByPostId(id)) {
            siteBuilds.requestBuild("post.became-private:$id")
        }

        return getForAdmin(id)
    }

    /**
     * 删除。
     *
     * 工作副本是软删（误删还能恢复），发布快照直接删掉 —— 目的是让它立刻从线上消失。
     */
    @Transactional
    fun delete(id: Long) {
        posts.findById(id) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        posts.softDelete(id)
        // 快照没了，线上那篇静态页必须跟着消失，所以要请求重建
        if (publications.deleteByPostId(id)) {
            siteBuilds.requestBuild("post.deleted:$id")
        }
    }

    /** 按标题给一个当前没被占用的 slug。前端可以在用户手改之前先填上。 */
    fun suggestSlug(title: String): String {
        val base = Slugify.from(title).ifBlank { return "" }
        if (!posts.isSlugTaken(base)) return base
        for (n in 2..MAX_SLUG_ATTEMPTS) {
            val candidate = "$base-$n"
            if (!posts.isSlugTaken(candidate)) return candidate
        }
        return base
    }

    // ---------- 公开 ----------

    /**
     * 公开列表。可见性判定全部交给 PostRepository 里的 PublishedContentSpec。
     *
     * `tag` / `year` / `month` 都是可选过滤，不传就是全部。
     */
    fun listPublic(
        page: Int,
        size: Int,
        tag: String? = null,
        year: Int? = null,
        month: Int? = null,
    ): PageData<PublicPostSummaryResponse> {
        val byTag = tag?.trim()?.takeIf { it.isNotEmpty() }?.let { publications.findPostIdsByTag(it) }
        // 标签一篇都没匹配上，直接返回空，不必再去查一次库
        if (byTag != null && byTag.isEmpty()) return PageData.of(emptyList(), page, size, 0L)

        val (from, to) = yearRange(year, month)
        val result = posts.pagePublic(page, size, byTag, from, to)
        val pubMap = publications.findByPostIds(result.records.mapNotNull { it.id })
        val items = result.records.mapNotNull { post -> pubMap[post.id]?.toPublicSummary() }
        return PageData.of(items, page, size, result.total)
    }

    fun getPublic(slug: String): PublicPostResponse {
        val post = posts.findPublicBySlug(slug) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        val id = requireNotNull(post.id)
        val publication = publications.findByPostId(id)
            ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)

        val publishedAt = post.publishedAt
        return publication.toPublic(
            prev = publishedAt?.let { posts.findPrevPublic(it, id) }?.toAdjacent(),
            next = publishedAt?.let { posts.findNextPublic(it, id) }?.toAdjacent(),
        )
    }

    /**
     * 年 / 月的闭开区间。
     *
     * 用区间而不是 `EXTRACT(YEAR FROM ...)`：区间才吃得上 published_at 的索引。
     * 时区取 JVM 默认（容器里是 Asia/Shanghai），和作者看到的日期一致。
     */
    private fun yearRange(year: Int?, month: Int?): Pair<Instant?, Instant?> {
        if (year == null) return null to null
        if (month != null && month !in 1..12) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED, "month 必须在 1 到 12 之间")
        }

        val ym = YearMonth.of(year, month ?: 1)
        val zone = ZoneId.systemDefault()
        val from = ym.atDay(1).atStartOfDay(zone).toInstant()
        val to = ym.plusMonths(if (month != null) 1L else 12L).atDay(1).atStartOfDay(zone).toInstant()
        return from to to
    }

    // ---------- 内部 ----------

    /**
     * 手填的 slug 撞车直接报错；自动生成的撞车就加序号。
     *
     * 理由：手填是明确意图，悄悄改名会让人以为保存成功了；自动生成只是省事，加个序号更顺手。
     */
    private fun resolveSlug(requested: String?, title: String, excludeId: Long?): String {
        val manual = requested?.trim()?.takeIf { it.isNotEmpty() }
        val base = manual ?: Slugify.from(title).ifBlank {
            throw BusinessException(ErrorCode.VALIDATION_FAILED, "无法从标题生成 slug，请手动指定")
        }
        if (!posts.isSlugTaken(base, excludeId)) return base
        if (manual != null) throw BusinessException(ErrorCode.SLUG_TAKEN)

        for (n in 2..MAX_SLUG_ATTEMPTS) {
            val candidate = "$base-$n"
            if (!posts.isSlugTaken(candidate, excludeId)) return candidate
        }
        throw BusinessException(ErrorCode.SLUG_TAKEN)
    }

    /** 工作副本与发布快照是否不一致。从没发布过也算「还没上线」。 */
    private fun isStale(post: Post, tagNames: List<String>, publication: PostPublication?): Boolean =
        publication == null || publication.sourceHash != PostSourceHash.of(post, tagNames)

    private fun parseTags(json: String): List<String> =
        runCatching { objectMapper.readValue(json, Array<String>::class.java).toList() }
            .getOrDefault(emptyList())

    private fun Post.toResponse(tagNames: List<String>, stale: Boolean) = PostResponse(
        id = requireNotNull(id),
        slug = slug,
        title = title,
        summary = summary,
        contentMd = contentMd,
        coverAssetId = coverAssetId,
        status = status,
        visibility = visibility,
        publishAt = publishAt,
        publishedAt = publishedAt,
        lastPublishedAt = lastPublishedAt,
        viewCount = viewCount,
        version = version,
        createdAt = createdAt,
        updatedAt = updatedAt,
        tags = tagNames,
        hasUnpublishedChanges = stale,
    )

    private fun Post.toSummary(tagNames: List<String>, stale: Boolean) = PostSummaryResponse(
        id = requireNotNull(id),
        slug = slug,
        title = title,
        summary = summary,
        status = status,
        visibility = visibility,
        publishedAt = publishedAt,
        updatedAt = updatedAt,
        version = version,
        tags = tagNames,
        hasUnpublishedChanges = stale,
    )

    private fun Post.toAdjacent() = AdjacentPost(slug = slug, title = title)

    private fun PostPublication.toPublic(prev: AdjacentPost?, next: AdjacentPost?) = PublicPostResponse(
        slug = slug,
        title = title,
        summary = summary,
        html = html,
        coverUrl = coverUrl,
        tags = parseTags(tags),
        wordCount = wordCount,
        readingMinutes = readingMinutes,
        publishedAt = publishedAt,
        prev = prev,
        next = next,
    )

    private fun PostPublication.toPublicSummary() = PublicPostSummaryResponse(
        slug = slug,
        title = title,
        summary = summary,
        coverUrl = coverUrl,
        tags = parseTags(tags),
        readingMinutes = readingMinutes,
        publishedAt = publishedAt,
    )

    private companion object {
        const val MAX_SLUG_ATTEMPTS = 50
    }
}
