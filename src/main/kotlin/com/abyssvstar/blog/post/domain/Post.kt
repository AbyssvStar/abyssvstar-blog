package com.abyssvstar.blog.post.domain

import com.abyssvstar.blog.shared.domain.EsSyncStatus
import com.abyssvstar.blog.shared.domain.Visibility
import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.FieldStrategy
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import com.baomidou.mybatisplus.annotation.Version
import java.time.Instant

/**
 * 文章【工作副本】。
 *
 * 这张表里的内容永不直接上线，发布时才写进 [PostPublication]。
 * 自动保存频繁改的就是它。
 */
@TableName("posts")
data class Post(
    @TableId(type = IdType.AUTO)
    @TableField("id")
    var id: Long? = null,

    @TableField("slug")
    var slug: String = "",

    @TableField("title")
    var title: String = "",

    // MyBatis-Plus 默认不把 null 字段写进 UPDATE，「清空摘要」就会静默失效。
    // 这两个字段的 null 是有意义的，所以用 IGNORED 强制写入。
    @TableField(value = "summary", updateStrategy = FieldStrategy.IGNORED)
    var summary: String? = null,

    @TableField("content_md")
    var contentMd: String = "",

    @TableField("cover_asset_id")
    var coverAssetId: Long? = null,

    @TableField("status")
    var status: PostStatus = PostStatus.DRAFT,

    @TableField("visibility")
    var visibility: Visibility = Visibility.PUBLIC,

    @TableField(value = "publish_at", updateStrategy = FieldStrategy.IGNORED)
    var publishAt: Instant? = null,

    @TableField("published_at")
    var publishedAt: Instant? = null,

    @TableField("last_published_at")
    var lastPublishedAt: Instant? = null,

    @TableField("view_count")
    var viewCount: Long = 0,

    @TableField("es_sync_status")
    var esSyncStatus: EsSyncStatus = EsSyncStatus.PENDING,

    @TableField("es_synced_at")
    var esSyncedAt: Instant? = null,

    /**
     * 乐观锁版本号。
     *
     * 标了 `@Version`，MyBatis-Plus 的拦截器会在 UPDATE 时自动加上
     * `version = version + 1` 和 `WHERE version = ?`；影响行数为 0 就是被人抢先改了。
     */
    @Version
    @TableField("version")
    var version: Long = 0,

    @TableField("deleted_at")
    var deletedAt: Instant? = null,

    // fill 不能删：MyBatis-Plus 只在实体声明了 fill 时才会调用 AuditMetaObjectHandler
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    var updatedAt: Instant? = null,
)
