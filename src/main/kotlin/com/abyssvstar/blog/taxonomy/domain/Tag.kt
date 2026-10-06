package com.abyssvstar.blog.taxonomy.domain

import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/** 标签。新建走「保存文章时按名称自动创建」，不单独开接口。 */
@TableName("tags")
data class Tag(
    @TableId(type = IdType.AUTO)
    @TableField("id")
    var id: Long? = null,

    @TableField("name")
    var name: String = "",

    @TableField("slug")
    var slug: String = "",

    @TableField("created_at")
    var createdAt: Instant? = null,
)
