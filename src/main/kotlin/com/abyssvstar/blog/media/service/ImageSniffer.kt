package com.abyssvstar.blog.media.service

import java.io.ByteArrayInputStream
import javax.imageio.ImageIO

/** 认出来的图片。`width` / `height` 可能为空 —— WebP 的 reader 不在 JDK 里。 */
data class SniffedImage(
    val extension: String,
    val mime: String,
    val width: Int?,
    val height: Int?,
)

/** 内容嗅探的结果。分成四种而不是一个 null，是为了让调用方能给出正确的错误码。 */
sealed interface SniffResult {
    data class Ok(val image: SniffedImage) : SniffResult

    /** 签名对不上任何允许的格式（含把 .txt 改成 .png 这种） */
    data object Unsupported : SniffResult

    /** 签名对上了，但文件头读不出尺寸 —— 文件是坏的 */
    data object Broken : SniffResult

    data class TooManyPixels(val width: Int, val height: Int) : SniffResult
}

/**
 * 按**文件内容**判断格式和尺寸，不看文件名、也不看客户端报的 Content-Type。
 *
 * 只读文件头，不整张解码：一张 1 万 × 1 万像素的 PNG 压缩后可能只有几百 KB，
 * 解码却要几百 MB 内存。真要解码是生成缩略图那一步的事，像素上限就是替那一步守的门。
 */
object ImageSniffer {

    /** 像素总数上限 */
    const val MAX_PIXELS: Long = 50_000_000

    fun sniff(bytes: ByteArray, maxPixels: Long = MAX_PIXELS): SniffResult {
        val format = detect(bytes) ?: return SniffResult.Unsupported
        val size = readHeaderSize(bytes)
        if (size == null) {
            // png / jpg / gif 的 reader 是 JDK 自带的，读不出来就是文件坏了；
            // webp 本来就没有 reader，所以尺寸留空是正常的
            if (format != Format.WEBP) return SniffResult.Broken
            return SniffResult.Ok(SniffedImage(format.extension, format.mime, null, null))
        }
        if (size.first.toLong() * size.second > maxPixels) {
            return SniffResult.TooManyPixels(size.first, size.second)
        }
        return SniffResult.Ok(SniffedImage(format.extension, format.mime, size.first, size.second))
    }

    private enum class Format(val extension: String, val mime: String) {
        PNG("png", "image/png"),
        JPEG("jpg", "image/jpeg"),
        GIF("gif", "image/gif"),
        WEBP("webp", "image/webp"),
    }

    private fun detect(bytes: ByteArray): Format? {
        if (bytes.startsWith(PNG_SIGNATURE)) return Format.PNG
        if (bytes.startsWith(JPEG_SIGNATURE)) return Format.JPEG
        if (bytes.startsWith(GIF_SIGNATURE)) return Format.GIF
        // WebP 的容器头是 RIFF....WEBP
        if (bytes.size >= 12 && bytes.ascii(0, 4) == "RIFF" && bytes.ascii(8, 4) == "WEBP") return Format.WEBP
        return null
    }

    /** 只读头部拿尺寸，不碰像素 */
    private fun readHeaderSize(bytes: ByteArray): Pair<Int, Int>? =
        runCatching {
            val input = ImageIO.createImageInputStream(ByteArrayInputStream(bytes)) ?: return@runCatching null
            input.use {
                val readers = ImageIO.getImageReaders(input)
                if (!readers.hasNext()) return@runCatching null
                val reader = readers.next()
                try {
                    reader.input = input
                    reader.getWidth(0) to reader.getHeight(0)
                } finally {
                    reader.dispose()
                }
            }
        }.getOrNull()

    private fun ByteArray.startsWith(prefix: ByteArray): Boolean {
        if (size < prefix.size) return false
        for (i in prefix.indices) if (this[i] != prefix[i]) return false
        return true
    }

    private fun ByteArray.ascii(offset: Int, length: Int): String =
        String(this, offset, length, Charsets.US_ASCII)

    private val PNG_SIGNATURE = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    private val JPEG_SIGNATURE = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())
    private val GIF_SIGNATURE = "GIF8".toByteArray(Charsets.US_ASCII)
}