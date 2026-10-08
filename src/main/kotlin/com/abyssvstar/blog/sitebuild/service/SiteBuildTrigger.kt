package com.abyssvstar.blog.sitebuild.service

import com.abyssvstar.blog.sitebuild.SiteBuildProperties
import com.abyssvstar.blog.sitebuild.repository.SiteBuildRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * 防抖 + 合并触发。
 *
 * 每 scan-interval-ms 看一眼：只要有 PENDING，且距上一次**成功**触发已经过了防抖窗口，
 * 就把所有 PENDING 合并成一次 `repository_dispatch` —— 一次改 5 篇只会构建一次。
 *
 * 触发失败把它们标成 FAILED 而不是无限重试：内容本身没丢，靠 CI 定时兜底（见 05-api-contract.md
 * 的导出接口一节），日志里留原因，后台能看到。
 */
@Component
class SiteBuildTrigger(
    private val builds: SiteBuildRepository,
    private val dispatcher: SiteBuildDispatcher,
    private val props: SiteBuildProperties,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(
        fixedDelayString = "\${blog.site-build.scan-interval-ms:10000}",
        initialDelayString = "\${blog.site-build.initial-delay-ms:15000}",
    )
    fun fireIfDue() {
        if (!props.enabled) return
        if (!builds.hasPending()) return

        val last = builds.lastFiredAt()
        if (last != null && last.isAfter(Instant.now().minus(props.debounce))) {
            log.debug("距上次触发还不到 {}，继续攒", props.debounce)
            return
        }

        try {
            val runUrl = dispatcher.dispatch()
            log.info("触发成功，合并了 {} 条 PENDING", builds.markFired(runUrl, Instant.now()))
        } catch (ex: Exception) {
            val n = builds.markFailed(ex.message?.take(300) ?: ex.javaClass.simpleName)
            log.error("触发构建失败，{} 条 PENDING 标记为 FAILED", n, ex)
        }
    }
}