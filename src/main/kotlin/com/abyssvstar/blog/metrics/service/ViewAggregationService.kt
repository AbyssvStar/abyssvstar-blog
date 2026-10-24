package com.abyssvstar.blog.metrics.service

import com.abyssvstar.blog.metrics.domain.ContentViewType
import com.abyssvstar.blog.metrics.repository.ViewMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId

@Service
class ViewAggregationService(
    private val redis: StringRedisTemplate,
    private val mapper: ViewMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * GET 后只减去已落库的增量，不用 DEL：GET 和 DECRBY 之间新来的阅读量会留在 Redis，下次继续落库。
     */
    @Transactional
    fun flush() {
        val keys = redis.keys("view:count:*").orEmpty()
        if (keys.isEmpty()) return
        val date = LocalDate.now(ZoneId.of("Asia/Shanghai"))
        keys.forEach { key ->
            val parts = key.split(":")
            if (parts.size != 4) return@forEach
            val type = runCatching { ContentViewType.valueOf(parts[2]) }.getOrNull() ?: return@forEach
            val id = parts[3].toLongOrNull() ?: return@forEach
            val amount = redis.opsForValue().get(key)?.toLongOrNull() ?: return@forEach
            if (amount <= 0) return@forEach

            mapper.upsertDaily(date, type, id, amount)
            when (type) {
                ContentViewType.POST -> mapper.addPostViews(id, amount)
                ContentViewType.NOTE -> mapper.addNoteViews(id, amount)
            }
            redis.opsForValue().decrement(key, amount)
        }
    }
}