package com.abyssvstar.blog.post.service

import com.abyssvstar.blog.post.domain.Post
import com.abyssvstar.blog.post.domain.PostPublication
import com.abyssvstar.blog.post.domain.PostStatus
import com.abyssvstar.blog.post.repository.PostPublicationRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.post.web.dto.PostResponse
import com.abyssvstar.blog.post.web.dto.PreviewResponse
import com.abyssvstar.blog.shared.domain.Visibility
import com.abyssvstar.blog.shared.util.MarkdownRenderer
import com.abyssvstar.blog.shared.util.TextMetrics
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.abyssvstar.blog.sitebuild.service.SiteBuildService
import com.abyssvstar.blog.taxonomy.service.TagService
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 发布：把工作副本定格成发布快照。
 *
 * 整个流程是一个事务 —— 快照写进去了但状态没改，或者反过来，都会让线上内容和后台对不上。
 * 触发构建放在事务之后，而且 [SiteBuildService] 保证不抛异常：构建没喊起来是运维问题，
 * 不该把已经发布成功的内容回滚掉。
 */
@Service
class PublishService(
    private val posts: PostRepository,
    private val publications: PostPublicationRepository,
    private val tags: TagService,
    private val markdown: MarkdownRenderer,
    private val siteBuilds: SiteBuildService,
    private val objectMapper: ObjectMapper,
    private val postService: PostService,
) {

    @Transactional
    fun publish(postId: Long): PostResponse {
        val post = posts.findById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        val tagNames = tags.tagNamesOf(postId)

        validate(post, tagNames)
        if (publications.isSlugTakenByOther(post.slug, postId)) {
            throw BusinessException(ErrorCode.SLUG_TAKEN)
        }

        val now = Instant.now()

        if (post.visibility == Visibility.PRIVATE) {
            // 私密内容永不写入发布快照、永不触发构建。
            // 但状态照样推进到 PUBLISHED —— 那是「写完了，只我自己看」。
            // 顺带把可能残留的旧快照删掉：留着它会被导出接口带走，私人内容就上线了。
            if (publications.deleteByPostId(postId)) {
                siteBuilds.requestBuild("post.became-private:$postId")
            }
        } else {
            writeSnapshot(post, tagNames, now)
            siteBuilds.requestBuild("post.published:$postId")
        }

        post.status = PostStatus.PUBLISHED
        post.publishedAt = now
        post.lastPublishedAt = now
        post.publishAt = null
        if (!posts.update(post)) throw BusinessException(ErrorCode.CONFLICT)

        return postService.getForAdmin(postId)
    }

    /**
     * 归档：从所有列表和 sitemap 消失。
     *
     * 快照**保留**，靠 PublishedContentSpec 里的 `status = PUBLISHED` 把它挡在公开之外。
     * 所以导出和 ES 索引将来必须 join 回 posts 再套那个判定，不能只读 post_publications。
     */
    @Transactional
    fun archive(postId: Long): PostResponse {
        val post = posts.findById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (post.status != PostStatus.PUBLISHED) {
            throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION, "只有已发布的文章可以归档")
        }

        post.status = PostStatus.ARCHIVED
        if (!posts.update(post)) throw BusinessException(ErrorCode.CONFLICT)

        siteBuilds.requestBuild("post.archived:$postId")
        return postService.getForAdmin(postId)
    }

    /** 恢复 = 重新发布一次，快照会按当前工作副本重建。 */
    @Transactional
    fun restore(postId: Long): PostResponse {
        val post = posts.findById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (post.status != PostStatus.ARCHIVED) {
            throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION, "只有已归档的文章可以恢复")
        }
        return publish(postId)
    }

    /**
     * 排期：DRAFT → SCHEDULED。
     *
     * 必须给一个**未来**的时间，否则定时任务无从下手。到点由 [ScheduledPublisher] 发布，
     * 走的是与手动发布完全相同的那段代码。
     */
    @Transactional
    fun schedule(postId: Long, publishAt: Instant): PostResponse {
        val post = posts.findById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (post.status != PostStatus.DRAFT && post.status != PostStatus.SCHEDULED) {
            throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION, "只有草稿或已排期的文章可以改排期")
        }
        if (!publishAt.isAfter(Instant.now())) {
            throw BusinessException(ErrorCode.PUBLISH_TIME_IN_PAST)
        }

        post.status = PostStatus.SCHEDULED
        post.publishAt = publishAt
        if (!posts.update(post)) throw BusinessException(ErrorCode.CONFLICT)

        return postService.getForAdmin(postId)
    }

    /** 取消排期：SCHEDULED → DRAFT，并清空 publish_at。 */
    @Transactional
    fun cancelSchedule(postId: Long): PostResponse {
        val post = posts.findById(postId) ?: throw BusinessException(ErrorCode.POST_NOT_FOUND)
        if (post.status != PostStatus.SCHEDULED) {
            throw BusinessException(ErrorCode.INVALID_STATE_TRANSITION, "只有已排期的文章可以取消排期")
        }

        post.status = PostStatus.DRAFT
        post.publishAt = null
        if (!posts.update(post)) throw BusinessException(ErrorCode.CONFLICT)

        return postService.getForAdmin(postId)
    }

    /**
     * 实时预览。**没有任何副作用**：不写库、不碰快照、不触发构建。
     *
     * 补偿的是静态方案的发布延迟 —— 改一个错别字不用等两分钟构建就能看到效果。
     */
    fun preview(contentMd: String): PreviewResponse {
        val html = markdown.render(contentMd)
        val wordCount = TextMetrics.wordCount(contentMd)
        return PreviewResponse(html, wordCount, TextMetrics.readingMinutes(wordCount))
    }

    private fun writeSnapshot(post: Post, tagNames: List<String>, now: Instant) {
        val html = markdown.render(post.contentMd)
        val wordCount = TextMetrics.wordCount(post.contentMd)

        publications.upsert(
            PostPublication(
                postId = requireNotNull(post.id),
                slug = post.slug,
                title = post.title,
                summary = requireNotNull(post.summary),
                html = html,
                // 媒体模块还没做，封面 URL 暂时只能是空。等上传接口落地后从 assets.path 生成
                coverUrl = null,
                tags = objectMapper.writeValueAsString(tagNames),
                wordCount = wordCount,
                readingMinutes = TextMetrics.readingMinutes(wordCount),
                sourceHash = PostSourceHash.of(post, tagNames),
                publishedAt = now,
            ),
        )
    }

    private fun validate(post: Post, tagNames: List<String>) {
        if (post.title.isBlank()) throw BusinessException(ErrorCode.VALIDATION_FAILED, "标题不能为空")
        if (post.contentMd.isBlank()) throw BusinessException(ErrorCode.VALIDATION_FAILED, "正文不能为空")
        if (post.visibility == Visibility.PUBLIC && post.summary.isNullOrBlank()) {
            throw BusinessException(ErrorCode.SUMMARY_REQUIRED)
        }
        if (tagNames.size > MAX_TAGS) throw BusinessException(ErrorCode.TOO_MANY_TAGS)
    }

    private companion object {
        const val MAX_TAGS = 5
    }
}
