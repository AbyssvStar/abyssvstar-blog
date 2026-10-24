package com.abyssvstar.blog.metrics.service

import com.abyssvstar.blog.metrics.domain.ContentViewType
import com.abyssvstar.blog.metrics.repository.ViewMapper
import com.abyssvstar.blog.metrics.web.dto.ViewCountResponse
import com.abyssvstar.blog.shared.ratelimit.RateLimitProperties
import com.abyssvstar.blog.shared.util.ClientIp
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration

@Service
class ViewService(
    private val redis: StringRedisTemplate,
    private val mapper: ViewMapper,
    private val rateProps: RateLimitProperties,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /** 调用方和控制器都吞掉所有异常；阅读量绝不影响读者打开文章。 */
    fun record(type: ContentViewType, id: Long, request: HttpServletRequest) {
        try {
            if (!isPublic(type, id)) return
            val ipHash = ClientIp.hash(request, rateProps.ipSalt)
            if (overGlobalRate(ipHash)) return
            val seen = redis.opsForValue().setIfAbsent("view:seen:${type.name}:$id:$ipHash", "1", Duration.ofHours(1))
            if (seen == true) redis.opsForValue().increment("view:count:${type.name}:$id")
        } catch (ex: Exception) {
            log.debug("阅读量打点失败 type={} id={}", type, id, ex)
        }
    }

    fun count(type: ContentViewType, id: Long): ViewCountResponse {
        val count = when (type) {
            ContentViewType.POST -> mapper.postViews(id)
            ContentViewType.NOTE -> mapper.noteViews(id)
        }
        return ViewCountResponse(type, id, count)
    }

    private fun overGlobalRate(ipHash: String): Boolean {
        val key = "view:rate:$ipHash"
        val count = redis.opsForValue().increment(key) ?: return false
        if (count == 1L) redis.expire(key, Duration.ofHours(1))
        return count > GLOBAL_HOURLY_LIMIT
    }

    private fun isPublic(type: ContentViewType, id: Long): Boolean = when (type) {
        ContentViewType.POST -> mapper.postIsPublic(id)
        ContentViewType.NOTE -> mapper.noteIsPublic(id)
    }

    private companion object {
        const val GLOBAL_HOURLY_LIMIT = 100L
    }
}