package com.abyssvstar.blog.media.service

import com.abyssvstar.blog.media.domain.Asset
import com.abyssvstar.blog.media.repository.AssetRepository
import com.abyssvstar.blog.media.web.dto.AssetResponse
import com.abyssvstar.blog.shared.storage.ObjectKeys
import com.abyssvstar.blog.shared.storage.ObjectStorage
import com.abyssvstar.blog.shared.util.Hashing
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
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
) {

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

        val asset = Asset(
            path = key,
            originalName = originalName?.trim()?.take(MAX_NAME_LENGTH)?.ifBlank { null },
            mime = image.mime,
            sizeBytes = bytes.size.toLong(),
            width = image.width,
            height = image.height,
            sha256 = sha,
        )
        assets.insert(asset)
        return asset.toResponse()
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
    )

    private companion object {
        /** 和 `assets.size_bytes` 的约束一致；servlet 层还有一道同样口径的限制 */
        const val MAX_BYTES = 5 * 1024 * 1024
        const val MAX_NAME_LENGTH = 200
    }
}