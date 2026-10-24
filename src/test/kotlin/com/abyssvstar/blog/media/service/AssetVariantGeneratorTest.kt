package com.abyssvstar.blog.media.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

class AssetVariantGeneratorTest {

    private val generator = AssetVariantGenerator()

    @Test
    fun `宽图生成两档等比缩略图`() {
        val variants = generator.generate("2026/10/demo.png", png(1000, 500), "image/png", 1000, 500)

        assertEquals(setOf("w400", "w800"), variants.keys)
        val w400 = ImageIO.read(ByteArrayInputStream(variants.getValue("w400").bytes))
        assertEquals(400, w400.width)
        assertEquals(200, w400.height)
        assertTrue(variants.getValue("w400").objectName.endsWith("-w400.png"))
    }

    @Test
    fun `小图不放大也不产生缩略图`() {
        assertTrue(generator.generate("small.png", png(320, 200), "image/png", 320, 200).isEmpty())
    }

    @Test
    fun `WebP 没有 JDK 编码器时不生成缩略图`() {
        assertTrue(generator.generate("demo.webp", byteArrayOf(1), "image/webp", null, null).isEmpty())
    }

    private fun png(width: Int, height: Int): ByteArray {
        val out = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", out)
        return out.toByteArray()
    }
}