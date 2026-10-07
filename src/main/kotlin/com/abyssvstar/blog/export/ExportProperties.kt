package com.abyssvstar.blog.export

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * 导出接口的静态 Token。
 *
 * 值只从环境变量来，配置文件里**不留默认值**。为空时接口直接拒绝服务 ——
 * 绝不能因为「没配 Token」就退化成谁都能拉走全量内容。
 */
@ConfigurationProperties(prefix = "blog.export")
data class ExportProperties(
    val token: String = "",
)
