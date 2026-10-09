package com.abyssvstar.blog.media.domain

import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/**
 * 图片资源。
 *
 * 文件本体在 MinIO，这里只有元数据；完整 URL = `{blog.storage.public-base-url}/{path}`。
 * `variants`（jsonb，留给将来的多尺寸缩略图）刻意没有映射：没人写它的时候映射出来只是多一处要维护。
 */
@TableName("assets")
data class Asset(
    // 主键列名写在 @TableId 上：MyBatis-Plus 会忽略主键字段上的 @TableField，启动时还会打一条 WARN
    @TableId(value = "id", type = IdType.AUTO)
    var id: Long? = null,

    /** 对象名，如 `2026/09/{uuid}.png`。用户给的文件名永不参与它的拼装 */
    @TableField("path")
    var path: String = "",

    @TableField("original_name")
    var originalName: String? = null,

    @TableField("mime")
    var mime: String = "",

    @TableField("size_bytes")
    var sizeBytes: Long = 0,

    @TableField("width")
    var width: Int? = null,

    @TableField("height")
    var height: Int? = null,

    /** 内容哈希。同一个文件重复上传只会有一行（见 `assets_sha_uq`） */
    @TableField("sha256")
    var sha256: String = "",

    @TableField("deleted_at")
    var deletedAt: Instant? = null,

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,
)