package com.abyssvstar.blog.shared.web

/**
 * 业务异常。业务代码只抛这个，状态码与响应体由 [GlobalExceptionHandler] 统一转换，
 * 业务层不关心 HTTP。
 */
class BusinessException(
    val errorCode: ErrorCode,
    message: String = errorCode.defaultMessage,
    val violations: List<FieldViolation>? = null,
) : RuntimeException(message) {

    companion object {
        fun notFound(errorCode: ErrorCode = ErrorCode.NOT_FOUND): BusinessException = BusinessException(errorCode)

        fun conflict(message: String): BusinessException = BusinessException(ErrorCode.CONFLICT, message)
    }
}
