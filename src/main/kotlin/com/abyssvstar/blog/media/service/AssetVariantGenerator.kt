package com.abyssvstar.blog.media.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.concurrent.Semaphore
import javax.imageio.ImageIO

data class GeneratedVariant(
    val objectName: String,
    val bytes: ByteArray,
)

/** 上传时同步生成两档缩略图；最多两张并发解码，避免大图同时把 2H4G 的堆打满。 */
@Component
class AssetVariantGenerator {

    private val log = LoggerFactory.getLogger(javaClass)
    private val permits = Semaphore(2)

    fun generate(objectName: String, bytes: ByteArray, mime: String, width: Int?, height: Int?): Map<String, GeneratedVariant> {
        if (width == null || height == null || mime == "image/webp") return emptyMap()
        val targets = WIDTHS.filter { it < width }
        if (targets.isEmpty()) return emptyMap()

        permits.acquire()
        return try {
            val source = ImageIO.read(ByteArrayInputStream(bytes)) ?: return emptyMap()
            if (source.width <= 0 || source.height <= 0) return emptyMap()
            val png = mime == "image/png" || mime == "image/gif"
            val extension = if (png) "png" else "jpg"
            targets.associate { targetWidth ->
                val targetHeight = maxOf(1, (source.height.toDouble() * targetWidth / source.width).toInt())
                val scaled = render(source, targetWidth, targetHeight, png)
                val out = ByteArrayOutputStream()
                val format = if (png) "png" else "jpg"
                if (!ImageIO.write(scaled, format, out)) {
                    throw IllegalStateException("JDK 没有 $format 编码器")
                }
                val key = objectName.replace(Regex("\\.[^.]+$"), "-w$targetWidth.$extension")
                "w$targetWidth" to GeneratedVariant(key, out.toByteArray())
            }
        } catch (ex: Exception) {
            log.warn("缩略图生成失败，保留原图 object={}", objectName, ex)
            emptyMap()
        } finally {
            permits.release()
        }
    }

    private fun render(source: BufferedImage, width: Int, height: Int, keepAlpha: Boolean): BufferedImage {
        val type = if (keepAlpha) BufferedImage.TYPE_INT_ARGB else BufferedImage.TYPE_INT_RGB
        val target = BufferedImage(width, height, type)
        val graphics = target.createGraphics()
        try {
            if (!keepAlpha) {
                graphics.color = Color.WHITE
                graphics.fillRect(0, 0, width, height)
            }
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            graphics.drawImage(source, 0, 0, width, height, null)
        } finally {
            graphics.dispose()
        }
        return target
    }

    private companion object {
        val WIDTHS = listOf(400, 800)
    }
}