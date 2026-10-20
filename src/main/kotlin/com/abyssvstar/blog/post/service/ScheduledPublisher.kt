package com.abyssvstar.blog.post.service

import com.abyssvstar.blog.post.repository.PostRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 到点自动发布排期文章。每分钟扫一次。
 *
 * 用 `publish_at <= now()` 而不是「刚好等于」，所以服务器停机跨过了发布时间也不会漏发，
 * 重启后下一次扫描就会补上。
 *
 * 扫描不持锁；真正的保护在 [PublishService.publishScheduled]：它在短事务里锁住该行、
 * 重新确认状态和排期时间后再发布。
 *
 * 某一条失败只记日志，不影响同一批里的其它文章。
 */
@Component
class ScheduledPublisher(
    private val posts: PostRepository,
    private val publishService: PublishService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelay = SCAN_INTERVAL_MS, initialDelay = INITIAL_DELAY_MS)
    fun publishDuePosts() {
        val due = posts.findDueForPublish()
        if (due.isEmpty()) return

        log.info("有 {} 篇排期文章到点了", due.size)
        due.forEach { post ->
            val id = post.id ?: return@forEach
            try {
                publishService.publishScheduled(id)
            } catch (ex: Exception) {
                log.error("排期发布失败 postId={}", id, ex)
            }
        }
    }

    private companion object {
        const val SCAN_INTERVAL_MS = 60_000L

        /** 启动后缓 30 秒再扫，避免和启动期自检挤在一起 */
        const val INITIAL_DELAY_MS = 30_000L
    }
}
