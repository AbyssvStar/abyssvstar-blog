package com.abyssvstar.blog.sitebuild.service

import com.abyssvstar.blog.shared.web.PageData
import com.abyssvstar.blog.sitebuild.domain.SiteBuild
import com.abyssvstar.blog.sitebuild.repository.SiteBuildRepository
import com.abyssvstar.blog.sitebuild.web.dto.SiteBuildResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Instant

/**
 * 构建请求的记录与查询。
 *
 * 写入和实际触发是分开的：发布只 INSERT 一条 PENDING，真正发 dispatch 的是防抖任务
 * （见 `SiteBuildTrigger`），所以一次改 5 篇只会构建一次。
 */
@Service
class SiteBuildService(private val builds: SiteBuildRepository) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 记一条 PENDING。**绝不抛异常**：内容已经发布成功了，构建喊不出来不该把发布回滚掉。
     */
    fun requestBuild(reason: String) {
        try {
            builds.insert(SiteBuild(reason = reason, requestedAt = Instant.now()))
            log.info("已记下构建请求：{}", reason)
        } catch (ex: Exception) {
            log.error("构建请求写入失败，内容已发布但站点不会自动重建：{}", reason, ex)
        }
    }

    /** 手动触发。也只记 PENDING，合并与防抖交给定时任务 —— 和发布走同一条路。 */
    fun requestManualBuild(): SiteBuildResponse {
        val build = SiteBuild(reason = "manual", requestedAt = Instant.now())
        builds.insert(build)
        log.info("手动触发了构建")
        return build.toResponse()
    }

    fun page(page: Int, size: Int): PageData<SiteBuildResponse> {
        val result = builds.page(page, size)
        return PageData.of(result.records.map { it.toResponse() }, page, size, result.total)
    }

    private fun SiteBuild.toResponse() = SiteBuildResponse(
        id = requireNotNull(id),
        reason = reason,
        status = status,
        requestedAt = requestedAt,
        firedAt = firedAt,
        runUrl = runUrl,
        error = error,
    )
}