package com.abyssvstar.blog.media.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

/**
 * 图片识别是「防改后缀」那道边界的落点：格式必须按内容判断，坏文件要被认出来，
 * 像素上限要在解码之前就生效。
 */
class ImageSnifferTest {

    @Test
    fun `PNG 能认出格式和尺寸`() {
        val image = (ImageSniffer.sniff(png(12, 7)) as SniffResult.Ok).image
        assertEquals("png", image.extension)
        assertEquals("image/png", image.mime)
        assertEquals(12, image.width)
        assertEquals(7, image.height)
    }

    @Test
    fun `JPEG 能认出格式`() {
        val image = (ImageSniffer.sniff(jpeg(9, 9)) as SniffResult.Ok).image
        assertEquals("jpg", image.extension)
        assertEquals("image/jpeg", image.mime)
    }

    @Test
    fun `把文本文件改成 png 会被认出来不是图片`() {
        assertTrue(ImageSniffer.sniff("这不是图片".toByteArray()) is SniffResult.Unsupported)
    }

    @Test
    fun `只有签名、内容被截断的 PNG 算坏图`() {
        val truncated = png(20, 20).copyOfRange(0, 12)
        assertTrue(ImageSniffer.sniff(truncated) is SniffResult.Broken)
    }

    @Test
    fun `WebP 认格式但尺寸留空（JDK 没有它的 reader）`() {
        val webp = "RIFF".toByteArray(Charsets.US_ASCII) +
            ByteArray(4) +
            "WEBP".toByteArray(Charsets.US_ASCII) +
            ByteArray(8)
        val image = (ImageSniffer.sniff(webp) as SniffResult.Ok).image
        assertEquals("webp", image.extension)
        assertNull(image.width)
    }

    @Test
    fun `像素数超过上限时在解码之前就被拒`() {
        assertTrue(ImageSniffer.sniff(png(30, 30), maxPixels = 100) is SniffResult.TooManyPixels)
    }

    private fun png(width: Int, height: Int): ByteArray = render(width, height, "png")

    private fun jpeg(width: Int, height: Int): ByteArray = render(width, height, "jpg")

    /** 真造一张图，免得测试里贴一段看不出所以然的 base64 */
    private fun render(width: Int, height: Int, format: String): ByteArray {
        val out = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, out)
        return out.toByteArray()
    }
}