package com.abyssvstar.blog.admin

import org.springframework.boot.context.properties.ConfigurationProperties

/** 管理员账号的初始化。 */
@ConfigurationProperties(prefix = "blog.admin")
data class AdminProperties(
    val username: String = "admin",
    /** 为空则不自动建号，启动时记 WARN */
    val password: String = "",
    /** 置 false 可关闭启动时自动建号 */
    val autoInitialize: Boolean = true,
)
