package com.abyssvstar.blog.sitebuild.service

import com.abyssvstar.blog.sitebuild.domain.SiteBuild
import com.abyssvstar.blog.sitebuild.repository.SiteBuildMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * 记录构建请求。
 *
 * 只负责写一条 PENDING 记录 —— 真正触发 GitHub Actions 的是防抖定时任务，
 * 它把 30 秒内的多次请求合并成一次。所以发布流程只管喊一声，不用等构建。
 *
 * **绝不能抛异常**：发布已经成功了，构建触发失败不该回滚内容。
 */
@Service
class SiteBuildService(private val builds: SiteBuildMapper) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun requestBuild(reason: String) {
        try {
            builds.insert(SiteBuild(reason = reason, requestedAt = java.time.Instant.now()))
            log.info("已记下构建请求：{}", reason)
        } catch (ex: Exception) {
            log.error("构建请求写入失败，内容已发布但站点不会自动重建：{}", reason, ex)
        }
    }
}
