package com.abyssvstar.blog.shared.ratelimit

/**
 * 限流注解。
 *
 * 次数和窗口写在接口旁边而不是配置文件里：它们是设计决策，不是运维旋钮，
 * 而且看接口时一眼就能知道它被限流保护着。配置里只留总开关。
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class RateLimit(
    /** 计数维度 */
    val keyBy: KeyBy = KeyBy.IP,
    /** 窗口内允许的次数 */
    val limit: Int,
    /** 窗口长度，如 `30s` / `15m` / `1h` / `7d` */
    val window: String,
    /** 计次时机 */
    val countOn: CountOn = CountOn.ATTEMPT,
)

enum class KeyBy {
    /** 按访客 IP 哈希计数 */
    IP,

    /** 全站共用一个计数 */
    GLOBAL,
}

enum class CountOn {
    /** 每次调用都计数，适合「每 N 分钟最多调 M 次」 */
    ATTEMPT,

    /** 只在抛异常时计数，适合「连续失败 N 次就锁」；成功会清空计数 */
    FAILURE,
}
