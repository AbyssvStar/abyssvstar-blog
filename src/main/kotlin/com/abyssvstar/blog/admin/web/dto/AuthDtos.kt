package com.abyssvstar.blog.admin.web.dto

import jakarta.validation.constraints.NotBlank

data class LoginRequest(
    @field:NotBlank(message = "用户名不能为空")
    val username: String,

    @field:NotBlank(message = "密码不能为空")
    val password: String,
)

/**
 * 当前登录态。
 *
 * `csrfToken` 交给前端保存，后续非 GET 的后台请求需带 `X-CSRF-Token` 头。
 */
data class MeResponse(
    val userId: Long,
    val username: String,
    val csrfToken: String,
)
