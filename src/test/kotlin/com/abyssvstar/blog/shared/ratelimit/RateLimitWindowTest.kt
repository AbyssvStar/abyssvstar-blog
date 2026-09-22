package com.abyssvstar.blog.shared.ratelimit

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.time.Duration

/**
 * 窗口字符串写错（比如 `"15"` 漏了单位）会让限流窗口变成一个完全不同的值，
 * 而运行期的表现是"莫名其妙被锁"—— 极难排查。所以解析必须有测试。
 */
class RateLimitWindowTest {

    @Test
    fun `秒`() {
        assertEquals(Duration.ofSeconds(30), RateLimitWindow.parse("30s"))
    }

    @Test
    fun `分`() {
        assertEquals(Duration.ofMinutes(15), RateLimitWindow.parse("15m"))
    }

    @Test
    fun `时`() {
        assertEquals(Duration.ofHours(1), RateLimitWindow.parse("1h"))
    }

    @Test
    fun `天`() {
        assertEquals(Duration.ofDays(7), RateLimitWindow.parse("7d"))
    }

    @Test
    fun `两端的空白被忽略`() {
        assertEquals(Duration.ofMinutes(5), RateLimitWindow.parse("  5m  "))
    }

    @Test
    fun `缺少单位会报错`() {
        assertThrows(IllegalArgumentException::class.java) { RateLimitWindow.parse("15") }
    }

    @Test
    fun `未知单位会报错`() {
        assertThrows(IllegalArgumentException::class.java) { RateLimitWindow.parse("15x") }
    }

    @Test
    fun `负数和小数都不接受`() {
        assertThrows(IllegalArgumentException::class.java) { RateLimitWindow.parse("-5m") }
        assertThrows(IllegalArgumentException::class.java) { RateLimitWindow.parse("1.5h") }
    }

    @Test
    fun `空字符串会报错`() {
        assertThrows(IllegalArgumentException::class.java) { RateLimitWindow.parse("") }
    }
}
