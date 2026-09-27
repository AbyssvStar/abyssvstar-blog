package com.abyssvstar.blog.shared.web

/**
 * 全局错误码。
 *
 * `code = 0` 才算成功，前端只看 code；HTTP 状态码仍须正确，不一律返回 200。
 * 每个错误码自带 httpStatus，业务代码里不直接写状态码。
 */
enum class ErrorCode(val code: Int, val httpStatus: Int, val defaultMessage: String) {

    OK(0, 200, "ok"),

    // 10000–19999 通用与参数
    VALIDATION_FAILED(10001, 400, "参数校验失败"),
    MALFORMED_BODY(10002, 400, "请求体格式错误"),
    NOT_FOUND(10003, 404, "资源不存在"),
    CONFLICT(10004, 409, "并发冲突，请刷新后重试"),
    TOO_MANY_REQUESTS(10005, 429, "请求过于频繁"),
    METHOD_NOT_ALLOWED(10006, 405, "请求方法不被支持"),

    // 20000–29999 认证与权限
    UNAUTHENTICATED(20001, 401, "未登录或会话已过期"),
    CSRF_FAILED(20002, 403, "CSRF 校验失败"),
    LOGIN_LOCKED(20003, 429, "登录失败次数过多，请稍后再试"),
    BAD_CREDENTIALS(20004, 401, "用户名或密码错误"),

    // 30000–39999 内容
    POST_NOT_FOUND(30001, 404, "文章不存在"),
    SLUG_TAKEN(30002, 409, "slug 已被占用"),
    PUBLISH_TIME_IN_PAST(30003, 400, "排期时间必须是未来时间"),
    TOO_MANY_TAGS(30004, 400, "标签数量超过上限（5 个）"),
    INVALID_TAG_NAME(30005, 400, "标签名长度不合法（1–20 字）"),
    UNPUBLISHED_CHANGES(30006, 409, "文章有未发布的修改"),
    SUMMARY_REQUIRED(30007, 400, "公开文章必须有摘要"),
    NOTE_NOT_FOUND(30008, 404, "短动态不存在"),
    NOTE_TOO_LONG(30009, 400, "短动态内容超过 500 字"),
    TAG_EXISTS(30010, 409, "标签已存在"),
    INVALID_STATE_TRANSITION(30011, 409, "当前状态下不允许该操作"),
    NOTE_ASSET_LIMIT(30012, 400, "短动态最多配 4 张图"),

    // 40000–49999 媒体
    UNSUPPORTED_MEDIA(40001, 400, "不支持的文件类型"),
    FILE_TOO_LARGE(40002, 400, "文件超过大小上限（5MB）"),
    NOT_AN_IMAGE(40003, 400, "文件内容不是有效图片"),
    ASSET_NOT_FOUND(40004, 404, "资源不存在"),
    ASSET_IN_USE(40005, 409, "资源正在被引用，无法删除"),

    // 50000–59999 互动
    COMMENT_TOO_LONG(50001, 400, "留言内容超过 1000 字"),
    COMMENT_RATE_LIMITED(50002, 429, "留言提交过于频繁"),
    COMMENT_SPAM(50003, 400, "留言被判定为垃圾内容"),

    // 60000–69999 检索。用 200：降级是正常状态，不是错误
    SEARCH_DEGRADED(60001, 200, "搜索服务降级中"),

    // 70000–79999 AI
    AI_BUDGET_EXCEEDED(70001, 429, "AI 月预算已超限"),
    AI_UPSTREAM_UNAVAILABLE(70002, 503, "AI 上游服务不可用"),
    AI_INPUT_TOO_LONG(70003, 400, "AI 输入过长"),

    // 90000–99999 系统
    INTERNAL_ERROR(90001, 500, "服务器内部错误"),
    SERVICE_UNAVAILABLE(90002, 503, "服务暂时不可用"),
}
