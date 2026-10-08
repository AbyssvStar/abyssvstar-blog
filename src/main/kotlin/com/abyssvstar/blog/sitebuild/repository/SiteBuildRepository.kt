package com.abyssvstar.blog.sitebuild.repository

import com.abyssvstar.blog.sitebuild.domain.SiteBuild
import com.abyssvstar.blog.sitebuild.domain.SiteBuildStatus
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper
import com.baomidou.mybatisplus.extension.plugins.pagination.Page
import org.springframework.stereotype.Component
import java.time.Instant

/** 构建请求的查询入口。 */
@Component
class SiteBuildRepository(private val mapper: SiteBuildMapper) {

    fun insert(build: SiteBuild) {
        mapper.insert(build)
    }

    /** 有没有等着触发的请求。 */
    fun hasPending(): Boolean =
        mapper.selectCount(QueryWrapper<SiteBuild>().eq("status", SiteBuildStatus.PENDING.name)) > 0

    /** 上一次**成功**触发的时间。失败的不算，否则一次失败会把防抖窗口往后推。 */
    fun lastFiredAt(): Instant? =
        mapper.selectList(
            QueryWrapper<SiteBuild>().isNotNull("fired_at").orderByDesc("fired_at").last("LIMIT 1"),
        ).firstOrNull()?.firedAt

    /** 把所有 PENDING 合并成这一次触发。 */
    fun markFired(runUrl: String, at: Instant): Int =
        mapper.update(
            null,
            UpdateWrapper<SiteBuild>()
                .eq("status", SiteBuildStatus.PENDING.name)
                .set("status", SiteBuildStatus.FIRED.name)
                .set("fired_at", at)
                .set("run_url", runUrl),
        )

    /** 触发失败：记下原因，PENDING 不再重试（内容靠 CI 的定时兜底）。 */
    fun markFailed(error: String): Int =
        mapper.update(
            null,
            UpdateWrapper<SiteBuild>()
                .eq("status", SiteBuildStatus.PENDING.name)
                .set("status", SiteBuildStatus.FAILED.name)
                .set("error", error),
        )

    /** 后台列表，新的在前。 */
    fun page(page: Int, size: Int): Page<SiteBuild> =
        mapper.selectPage(Page(page.toLong(), size.toLong()), QueryWrapper<SiteBuild>().orderByDesc("id"))

    fun findById(id: Long): SiteBuild? = mapper.selectById(id)
}