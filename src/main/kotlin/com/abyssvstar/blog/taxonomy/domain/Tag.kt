package com.abyssvstar.blog.taxonomy.domain

import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/** 标签。新建走「保存文章时按名称自动创建」，不单独开接口。 */
@TableName("tags")
data class Tag(
    // 主键列名写在 @TableId 上：MyBatis-Plus 会忽略主键字段上的 @TableField，启动时还会打一条 WARN
    @TableId(value = "id", type = IdType.AUTO)
    var id: Long? = null,

    @TableField("name")
    var name: String = "",

    @TableField("slug")
    var slug: String = "",

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,
)
