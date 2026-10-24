package com.abyssvstar.blog.note.domain

import com.abyssvstar.blog.shared.domain.EsSyncStatus
import com.abyssvstar.blog.shared.domain.Visibility
import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.FieldStrategy
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

@TableName("notes")
data class Note(
    @TableId(value = "id", type = IdType.AUTO)
    var id: Long? = null,

    @TableField("content")
    var content: String = "",

    @TableField("status")
    var status: NoteStatus = NoteStatus.PUBLISHED,

    @TableField("visibility")
    var visibility: Visibility = Visibility.PUBLIC,

    @TableField("published_at")
    var publishedAt: Instant = Instant.now(),

    @TableField("view_count")
    var viewCount: Long = 0,

    @TableField("es_sync_status")
    var esSyncStatus: EsSyncStatus = EsSyncStatus.SKIPPED,

    @TableField("es_synced_at")
    var esSyncedAt: Instant? = null,

    @TableField("es_sync_attempts")
    var esSyncAttempts: Int = 0,

    @TableField(value = "es_next_retry_at", updateStrategy = FieldStrategy.IGNORED)
    var esNextRetryAt: Instant? = null,

    @TableField(value = "es_last_error", updateStrategy = FieldStrategy.IGNORED)
    var esLastError: String? = null,

    @TableField(value = "deleted_at", updateStrategy = FieldStrategy.IGNORED)
    var deletedAt: Instant? = null,

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    var updatedAt: Instant? = null,
)