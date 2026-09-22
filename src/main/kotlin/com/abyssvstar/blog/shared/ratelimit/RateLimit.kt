package com.abyssvstar.blog.shared.ratelimit

/**
 * 限流。**参数写在接口旁边，不写在配置文件里。**
 *
 * ```kotlin
 * @RateLimit(limit = 5, window = "15m", countOn = CountOn.FAILURE)
 * @PostMapping("/login")
 * fun login(...)
 * ```
 * 唯一进配置的是全局开关 `blog.rate-limit.enabled`。
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class RateLimit(
    /** 按什么维度计数 */
    val keyBy: KeyBy = KeyBy.IP,
    /** 窗口内允许的次数 */
    val limit: Int,
    /** 窗口长度，支持 `30s` / `15m` / `1h` / `7d` 等*/
    val window: String,
    /** 什么时候计一次数 */
    val countOn: CountOn = CountOn.ATTEMPT,
)

enum class KeyBy {
    /** 按访客 IP 的哈希计数 */
    IP,

    /** 全站共用一个计数（与来源无关） */
    GLOBAL,
}

enum class CountOn {
    /** 每次调用都计数。适合"这个接口每 N 分钟最多被调 M 次"。 */
    ATTEMPT,

    /**
     * 只在抛异常时计数。
     */
    FAILURE,
}
