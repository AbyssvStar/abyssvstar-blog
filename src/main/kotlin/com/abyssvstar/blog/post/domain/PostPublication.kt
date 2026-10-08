package com.abyssvstar.blog.post.domain

import com.abyssvstar.blog.shared.persistence.JsonbTypeHandler
import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.FieldStrategy
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/**
 * 文章【发布快照】。与 `posts` 是 1:1，只保留最新一次发布。
 *
 * 静态导出和 ES 索引都只读这张表，所以两者天然一致。
 * 标签在这里是 jsonb 快照，不关联 `post_tags` —— 否则改标签会立刻改变线上展示。
 */
@TableName(value = "post_publications", autoResultMap = true)
data class PostPublication(
    @TableId(type = com.baomidou.mybatisplus.annotation.IdType.INPUT)
    @TableField("post_id")
    var postId: Long? = null,

    @TableField("slug")
    var slug: String = "",

    @TableField("title")
    var title: String = "",

    @TableField("summary")
    var summary: String = "",

    /** 发布时渲染好的 HTML */
    @TableField("html")
    var html: String = "",

    /**
     * 发布时的封面 URL 快照。
     *
     * 同样标 IGNORED：封面被移除后重新发布时要把 null 写进去，否则线上一直挂着旧封面。
     */
    @TableField(value = "cover_url", updateStrategy = FieldStrategy.IGNORED)
    var coverUrl: String? = null,

    /** 标签名快照。jsonb 列，写入必须声明类型，见 [JsonbTypeHandler] */
    @TableField(value = "tags", typeHandler = JsonbTypeHandler::class)
    var tags: String = "[]",

    @TableField("word_count")
    var wordCount: Int = 0,

    @TableField("reading_minutes")
    var readingMinutes: Int = 0,

    /** 发布时工作副本的 sha256，用于判定「有未发布的修改」 */
    @TableField("source_hash")
    var sourceHash: String = "",

    @TableField("published_at")
    var publishedAt: Instant? = null,

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    var updatedAt: Instant? = null,
)
