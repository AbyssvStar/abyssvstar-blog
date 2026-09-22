package com.abyssvstar.blog.shared.ratelimit

import java.time.Duration

/**
 * 把注解里的窗口字符串（`30s` / `15m` / `1h` / `7d`）解析成 [Duration]。
 */
object RateLimitWindow {

    private val PATTERN = Regex("^(\\d+)([smhd])$")

    fun parse(raw: String): Duration {
        val match = PATTERN.find(raw.trim())
            ?: throw IllegalArgumentException("非法的限流窗口写法：'$raw'（只支持 30s / 15m / 1h / 7d）")
        val amount = match.groupValues[1].toLong()
        return when (match.groupValues[2]) {
            "s" -> Duration.ofSeconds(amount)
            "m" -> Duration.ofMinutes(amount)
            "h" -> Duration.ofHours(amount)
            else -> Duration.ofDays(amount)
        }
    }
}
