package com.abyssvstar.blog.media.service

import com.abyssvstar.blog.media.domain.Asset
import com.abyssvstar.blog.media.repository.AssetRepository
import com.abyssvstar.blog.media.web.dto.AssetResponse
import com.abyssvstar.blog.shared.storage.ObjectKeys
import com.abyssvstar.blog.shared.web.PageData
import com.abyssvstar.blog.shared.storage.ObjectStorage
import com.abyssvstar.blog.shared.util.Hashing
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 图片上传：文件本体进 MinIO，元数据进 `assets` 表。
 *
 * 缩略图（`assets.variants`）暂时不做 —— 单作者场景用不上多尺寸，等真需要时再补；
 * 那一步才需要整张解码，像素上限是替它守的门。
 */
@Service
class AssetService(
    private val assets: AssetRepository,
    private val storage: ObjectStorage,
    private val variants: AssetVariantGenerator,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 校验 + 去重 + 落对象存储 + 落库。
     *
     * 校验只看文件内容：客户端报的 Content-Type 和原始文件名都不可信，扩展名由认出来的格式决定，
     * 所以「把 .txt 改成 .png」这类上传进不来。
     */
    @Transactional
    fun upload(originalName: String?, bytes: ByteArray): AssetResponse {
        if (bytes.isEmpty()) throw BusinessException(ErrorCode.NOT_AN_IMAGE, "文件是空的")
        if (bytes.size > MAX_BYTES) throw BusinessException(ErrorCode.FILE_TOO_LARGE)

        val image = when (val sniffed = ImageSniffer.sniff(bytes)) {
            SniffResult.Unsupported ->
                throw BusinessException(ErrorCode.UNSUPPORTED_MEDIA, "只收 png / jpg / gif / webp")
            SniffResult.Broken ->
                throw BusinessException(ErrorCode.NOT_AN_IMAGE)
            is SniffResult.TooManyPixels ->
                throw BusinessException(ErrorCode.NOT_AN_IMAGE, "图片 ${sniffed.width}×${sniffed.height} 像素，超过上限")
            is SniffResult.Ok -> sniffed.image
        }

        // 同一份内容重复上传：复用已有那条，不存第二份，也不多占对象存储
        val sha = Hashing.sha256Hex(bytes)
        assets.findActiveBySha(sha)?.let { return it.toResponse() }

        val key = ObjectKeys.newKey(image.extension)
        storage.put(key, bytes, image.mime)
        // 缩略图是增强，不是上传成功的前提；对象存储单张写失败时保留原图即可。
        val variantPaths = buildMap {
            variants.generate(key, bytes, image.mime, image.width, image.height).forEach { (label, variant) ->
                runCatching {
                    storage.put(
                        variant.objectName,
                        variant.bytes,
                        if (variant.objectName.endsWith(".png")) "image/png" else "image/jpeg",
                    )
                    put(label, variant.objectName)
                }.onFailure { ex -> log.warn("缩略图上传失败 object={} label={}", key, label, ex) }
            }
        }

        val asset = Asset(
            path = key,
            originalName = originalName?.trim()?.take(MAX_NAME_LENGTH)?.ifBlank { null },
            mime = image.mime,
            sizeBytes = bytes.size.toLong(),
            width = image.width,
            height = image.height,
            sha256 = sha,
            variants = objectMapper.writeValueAsString(variantPaths),
        )
        assets.insert(asset)
        return asset.toResponse()
    }

    fun list(page: Int, size: Int): PageData<AssetResponse> {
        val result = assets.pageActive(page, size)
        return PageData.of(result.records.map { it.toResponse() }, page, size, result.total)
    }

    /** 删除只做软删；对象文件留给七天清理任务，避免静态缓存和误删立刻裂图。 */
    @Transactional
    fun delete(id: Long) {
        assets.findActiveById(id) ?: throw BusinessException(ErrorCode.ASSET_NOT_FOUND)
        if (assets.referenceCount(id) > 0) throw BusinessException(ErrorCode.ASSET_IN_USE)
        assets.softDelete(id)
    }

    /** assetId → 能直接写进 HTML 的公开 URL。查不到（或已软删）就是 null。 */
    fun findPublicUrl(assetId: Long?): String? =
        assetId?.let { assets.findActiveById(it) }?.let { storage.publicUrl(it.path) }

    private fun Asset.toResponse() = AssetResponse(
        id = requireNotNull(id),
        url = storage.publicUrl(path),
        mime = mime,
        sizeBytes = sizeBytes,
        width = width,
        height = height,
        originalName = originalName,
        variants = parseVariants(variants).mapValues { (_, objectName) -> storage.publicUrl(objectName) },
        createdAt = createdAt,
    )

    private fun parseVariants(json: String): Map<String, String> =
        runCatching { objectMapper.readValue(json, object : TypeReference<Map<String, String>>() {}) }
            .getOrDefault(emptyMap())

    private companion object {
        /** 和 `assets.size_bytes` 的约束一致；servlet 层还有一道同样口径的限制 */
        const val MAX_BYTES = 5 * 1024 * 1024
        const val MAX_NAME_LENGTH = 200
    }
}