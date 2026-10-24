package com.abyssvstar.blog.media.service

import com.abyssvstar.blog.media.repository.AssetRepository
import com.abyssvstar.blog.shared.storage.ObjectStorage
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Profile
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant

/** 软删除满 7 天且仍无引用的图片才清对象；期间 URL 仍可访问，给误删和缓存留恢复窗口。 */
@Component
@Profile("!test")
class AssetCleanupScheduler(
    private val assets: AssetRepository,
    private val storage: ObjectStorage,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 20 3 * * *", zone = "Asia/Shanghai")
    fun cleanup() {
        val cutoff = Instant.now().minus(Duration.ofDays(7))
        val candidates = assets.findDeletedBefore(cutoff)
        candidates.forEach { asset ->
            val id = asset.id ?: return@forEach
            if (assets.isReferenced(id)) return@forEach
            try {
                storage.delete(asset.path)
                variantPaths(asset.variants).forEach { path -> storage.delete(path) }
                assets.hardDelete(id)
                log.info("已清理孤儿图片 id={} path={}", id, asset.path)
            } catch (ex: Exception) {
                log.warn("孤儿图片清理失败 id={} path={}", id, asset.path, ex)
            }
        }
    }

    private fun variantPaths(json: String): List<String> =
        runCatching { objectMapper.readValue(json, object : TypeReference<Map<String, String>>() {}).values }
            .getOrDefault(emptyList()).toList()
}