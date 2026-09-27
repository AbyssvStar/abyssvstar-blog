package com.abyssvstar.blog.shared.ratelimit

import com.abyssvstar.blog.shared.config.BlogProperties
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.time.Duration

/**
 * 限流的计数后端。
 *
 * 用固定窗口：边界处最坏会放过两倍额度。对防爆破、防刷足够；
 * 更精确要上滑动窗口或令牌桶，那是这个项目不需要的复杂度。
 */
@Component
class RateLimiter(
    private val redis: StringRedisTemplate,
    private val props: BlogProperties,
) {

    /** @return false 表示已超限。 */
    fun tryAcquire(bucket: String, limit: Int, window: Duration): Boolean {
        if (!props.rateLimit.enabled) return true
        val key = key(bucket)
        val count = redis.opsForValue().increment(key) ?: return true
        if (count == 1L) redis.expire(key, window)
        return count <= limit
    }

    /** 当前窗口已计多少，用于 [CountOn.FAILURE] 在调用前判断阈值。 */
    fun currentCount(bucket: String): Long {
        if (!props.rateLimit.enabled) return 0L
        return redis.opsForValue().get(key(bucket))?.toLongOrNull() ?: 0L
    }

    /** 记一次失败，用于 [CountOn.FAILURE]。 */
    fun recordFailure(bucket: String, window: Duration) {
        if (!props.rateLimit.enabled) return
        val key = key(bucket)
        val count = redis.opsForValue().increment(key) ?: return
        if (count == 1L) redis.expire(key, window)
    }

    /** 清空计数。登录成功后调用，让「连续失败」重新从 0 开始。 */
    fun clear(bucket: String) {
        if (!props.rateLimit.enabled) return
        redis.delete(key(bucket))
    }

    private fun key(bucket: String) = "${props.rateLimit.keyPrefix}:$bucket"
}
