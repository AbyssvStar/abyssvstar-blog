package com.abyssvstar.blog.sitebuild.domain

import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/**
 * 静态站构建请求。
 *
 * 写入和实际触发是分开的：发布时只 INSERT 一条 PENDING，由防抖定时任务合并成一次
 * `repository_dispatch`。所以这张表记的是「谁在什么时候要求重建」，不是构建本身。
 */
@TableName("site_builds")
data class SiteBuild(
    @TableId(type = IdType.AUTO)
    @TableField("id")
    var id: Long? = null,

    /** 如 `post.published:123`，方便回溯是哪次操作引起的 */
    @TableField("reason")
    var reason: String? = null,

    @TableField("status")
    var status: SiteBuildStatus = SiteBuildStatus.PENDING,

    @TableField("requested_at")
    var requestedAt: Instant? = null,

    @TableField("fired_at")
    var firedAt: Instant? = null,

    /** GitHub Actions 运行链接，后台可以点进去 */
    @TableField("run_url")
    var runUrl: String? = null,

    @TableField("error")
    var error: String? = null,
)
