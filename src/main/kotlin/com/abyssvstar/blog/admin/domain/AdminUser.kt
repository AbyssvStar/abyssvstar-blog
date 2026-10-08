package com.abyssvstar.blog.admin.domain

import com.baomidou.mybatisplus.annotation.FieldFill
import com.baomidou.mybatisplus.annotation.IdType
import com.baomidou.mybatisplus.annotation.TableField
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableName
import java.time.Instant

/**
 * 管理员账号。
 *
 * MyBatis-Plus 要求实体有可写字段和无参构造。这里用 `var` + 默认值，
 * 编译器会额外生成无参构造函数。列名一律用 `@TableField` 显式写出，
 * 不依赖下划线自动转换，免得哪天配置一改就静默映射错列。
 */
@TableName("admin_user")
data class AdminUser(
    @TableId(type = IdType.AUTO)
    var id: Long? = null,

    @TableField("username")
    var username: String = "",

    /** BCrypt 哈希，绝不进任何响应体。 */
    @TableField("password_hash")
    var passwordHash: String = "",

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    var createdAt: Instant? = null,

    @TableField("last_login_at")
    var lastLoginAt: Instant? = null,
)
