package com.abyssvstar.blog.comment.domain

import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

@TableName("comments")
data class Comment(
    @TableId(value = "id", type = IdType.AUTO)
    var id: Long? = null,

    @TableField("post_id")
    var postId: Long? = null,

    @TableField("author_name")
    var authorName: String = "",

    @TableField("author_email")
    var authorEmail: String? = null,

    @TableField("content")
    var content: String = "",

    @TableField("status")
    var status: CommentStatus = CommentStatus.PENDING,

    @TableField("ip_hash")
    var ipHash: String = "",

    @TableField("user_agent_hash")
    var userAgentHash: String? = null,

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,

    @TableField("reviewed_at")
    var reviewedAt: Instant? = null,
)