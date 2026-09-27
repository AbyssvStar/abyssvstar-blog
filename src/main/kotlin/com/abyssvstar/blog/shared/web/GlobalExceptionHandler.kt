package com.abyssvstar.blog.shared.web

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.validation.BindException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.servlet.resource.NoResourceFoundException

/** 全局异常处理：把各类异常收敛成统一的 envelope。 */
@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(BusinessException::class)
    fun handleBusiness(ex: BusinessException, request: HttpServletRequest): ResponseEntity<ApiResponse<Nothing>> {
        if (ex.errorCode.httpStatus >= 500) {
            log.error("业务异常 code={} uri={}", ex.errorCode.code, request.requestURI, ex)
        } else {
            log.debug("业务异常 code={} uri={} message={}", ex.errorCode.code, request.requestURI, ex.message)
        }
        return respond(ex.errorCode, ex.message, ex.violations)
    }

    /** @Valid 校验失败。Spring 6 中 MethodArgumentNotValidException 继承自 BindException，一个处理器够用。 */
    @ExceptionHandler(BindException::class)
    fun handleBind(ex: BindException, request: HttpServletRequest): ResponseEntity<ApiResponse<Nothing>> {
        val violations = ex.bindingResult.fieldErrors.map {
            FieldViolation(
                field = it.field,
                code = it.code ?: "invalid",
                message = it.defaultMessage ?: "参数不合法",
            )
        }.sortedBy { it.field }

        log.debug("参数校验失败 uri={} fields={}", request.requestURI, violations.map { it.field })
        return respond(ErrorCode.VALIDATION_FAILED, null, violations)
    }

    @ExceptionHandler(
        MethodArgumentTypeMismatchException::class,
        MissingServletRequestParameterException::class,
    )
    fun handleBadParam(ex: Exception, request: HttpServletRequest): ResponseEntity<ApiResponse<Nothing>> {
        log.debug("参数类型/缺失错误 uri={} message={}", request.requestURI, ex.message)
        return respond(ErrorCode.VALIDATION_FAILED, null, null)
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(ex: HttpMessageNotReadableException, request: HttpServletRequest): ResponseEntity<ApiResponse<Nothing>> {
        // 只记 message，不打堆栈 —— 请求体格式错误是客户端问题，堆栈纯噪声
        log.debug("请求体无法解析 uri={} message={}", request.requestURI, ex.message)
        return respond(ErrorCode.MALFORMED_BODY, null, null)
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotAllowed(ex: HttpRequestMethodNotSupportedException): ResponseEntity<ApiResponse<Nothing>> =
        respond(ErrorCode.METHOD_NOT_ALLOWED, null, null)

    /** 静态资源 / 未匹配路由。 */
    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNoResource(): ResponseEntity<ApiResponse<Nothing>> = respond(ErrorCode.NOT_FOUND, null, null)

    /**
     * 请求体超过 multipart 上限。
     *
     * 不拦的话会落到兜底的 Exception 分支变成 500，而客户端应该拿到一个明确的
     * 「文件太大」，才能给出正确提示。
     */
    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleUploadTooLarge(ex: MaxUploadSizeExceededException): ResponseEntity<ApiResponse<Nothing>> {
        log.debug("上传文件超过 multipart 限制: {}", ex.message)
        return respond(ErrorCode.FILE_TOO_LARGE, null, null)
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ApiResponse<Nothing>> {
        // 堆栈进日志，响应里只给一句通用文案，具体原因靠响应头里的 traceId 去日志里查
        log.error("未捕获异常 uri={}", request.requestURI, ex)
        return respond(ErrorCode.INTERNAL_ERROR, null, null)
    }

    private fun respond(
        errorCode: ErrorCode,
        message: String?,
        violations: List<FieldViolation>?,
    ): ResponseEntity<ApiResponse<Nothing>> =
        ResponseEntity.status(errorCode.httpStatus)
            .body(ApiResponse.fail(errorCode, message, violations))
}
