package com.abyssvstar.blog.shared.web

import com.fasterxml.jackson.annotation.JsonInclude

/** 字段级校验失败详情，前端据此把表单项标红。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class FieldViolation(
    val field: String,
    val code: String,
    val message: String,
)

/**
 * 全站统一响应结构，所有接口无例外。
 *
 * 成功 `{"code":0,"message":"ok","data":...}`，失败时 `errors` 承载字段级错误。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val code: Int,
    val message: String,
    val data: T? = null,
    val errors: List<FieldViolation>? = null,
) {
    companion object {
        fun <T> ok(data: T): ApiResponse<T> = ApiResponse(ErrorCode.OK.code, ErrorCode.OK.defaultMessage, data)

        fun ok(): ApiResponse<Unit> = ApiResponse(ErrorCode.OK.code, ErrorCode.OK.defaultMessage, null)

        fun <T> fail(
            errorCode: ErrorCode,
            message: String? = null,
            errors: List<FieldViolation>? = null,
        ): ApiResponse<T> = ApiResponse(errorCode.code, message ?: errorCode.defaultMessage, null, errors)
    }
}

/** 分页载荷，`page` 从 1 开始。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class PageData<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val total: Long,
) {
    val totalPages: Int get() = if (size <= 0) 0 else ((total + size - 1) / size).toInt()

    companion object {
        fun <T> of(items: List<T>, page: Int, size: Int, total: Long): PageData<T> =
            PageData(items, page, size, total)
    }
}
