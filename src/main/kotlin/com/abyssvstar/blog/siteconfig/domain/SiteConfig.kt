package com.abyssvstar.blog.siteconfig.domain

import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.FieldStrategy
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/**
 * 站点配置。单行表，主键恒为 1。
 *
 * 只装「作者手写的站点级文字」：站名、SEO 简介、关于页正文。导航、许可、背景图这些
 * 还在公开站的代码里 —— 它们改了要连着改模板，搬进数据库只会多出「改了没效果」的困惑。
 */
@TableName("site_config")
data class SiteConfig(
    // 主键列名写在 @TableId 上：MyBatis-Plus 会忽略主键字段上的 @TableField，启动时还会打一条 WARN
    @TableId(value = "id", type = IdType.INPUT)
    var id: Short = ROW_ID,

    @TableField("title")
    var title: String = "",

    @TableField("description")
    var description: String = "",

    /** 关于页正文的 Markdown 原文。渲染发生在导出时，见 SiteConfigService */
    @TableField("about_md")
    var aboutMd: String = "",

    // 两张图和 summary / cover_asset_id 一个道理：null 是有意义的（没设就是没有），
    // 默认策略会把 null 从 UPDATE 里剔掉，「移除这张图」就会静默失效
    @TableField(value = "about_cover_url", updateStrategy = FieldStrategy.IGNORED)
    var aboutCoverUrl: String? = null,

    @TableField(value = "about_avatar_url", updateStrategy = FieldStrategy.IGNORED)
    var aboutAvatarUrl: String? = null,

    // fill 不能删：MyBatis-Plus 只在实体声明了 fill 时才会调用 AuditMetaObjectHandler
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    var updatedAt: Instant? = null,
) {
    companion object {
        /** 单行表的主键。SQL 那边有 CHECK 兜着，两边保持一致 */
        const val ROW_ID: Short = 1
    }
}