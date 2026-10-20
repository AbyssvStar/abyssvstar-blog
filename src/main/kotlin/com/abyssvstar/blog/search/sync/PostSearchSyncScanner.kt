package com.abyssvstar.blog.search.sync

import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.search.SearchProperties
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Profile
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/** 进程重启、ES 短暂中断和异步任务的丢包都由它补齐；失败按退避时间重试。 */
@Component
@Profile("!test")
class PostSearchSyncScanner(
    private val props: SearchProperties,
    private val posts: PostRepository,
    private val sync: PostSearchSyncService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(
        fixedDelayString = "\${blog.search.sync-scan-interval-ms:10000}",
        initialDelayString = "\${blog.search.sync-initial-delay-ms:15000}",
    )
    fun scan() {
        if (!props.enabled) return
        val due = posts.findDueSearchSync(props.syncBatchSize)
        if (due.isEmpty()) return
        log.debug("发现 {} 篇待同步搜索索引", due.size)
        due.forEach { post -> post.id?.let(sync::enqueue) }
    }
}