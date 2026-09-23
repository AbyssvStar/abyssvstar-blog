package com.abyssvstar.blog.shared.storage

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.LocalDate

/**
 * 对象名生成是**安全边界**的一部分：它是"用户输入永远不参与路径拼装"这条规则的落点。
 * 所以扩展名的校验必须有测试钉住 —— 一个漏掉的 `../` 就是一个路径穿越。
 */
class ObjectKeysTest {

    private val date = LocalDate.of(2026, 9, 22)

    @Test
    fun `按年月分成目录`() {
        assertTrue(ObjectKeys.newKey("png", date).startsWith("2026/09/"))
    }

    @Test
    fun `扩展名统一小写并去掉前导点`() {
        assertTrue(ObjectKeys.newKey(".PNG", date).endsWith(".png"))
    }

    @Test
    fun `每次生成的对象名都不同`() {
        val a = ObjectKeys.newKey("png", date)
        val b = ObjectKeys.newKey("png", date)
        assertTrue(a != b, "两次生成的对象名不应该相同")
    }

    @Test
    fun `路径穿越的扩展名被拒绝`() {
        assertThrows(IllegalArgumentException::class.java) { ObjectKeys.newKey("../../etc/passwd", date) }
    }

    @Test
    fun `带斜杠的扩展名被拒绝`() {
        assertThrows(IllegalArgumentException::class.java) { ObjectKeys.newKey("png/evil", date) }
    }

    @Test
    fun `空扩展名被拒绝`() {
        assertThrows(IllegalArgumentException::class.java) { ObjectKeys.newKey("", date) }
        assertThrows(IllegalArgumentException::class.java) { ObjectKeys.newKey(".", date) }
    }

    @Test
    fun `超长扩展名被拒绝`() {
        assertThrows(IllegalArgumentException::class.java) { ObjectKeys.newKey("a".repeat(11), date) }
    }

    @Test
    fun `月份补零`() {
        val key = ObjectKeys.newKey("jpg", LocalDate.of(2026, 1, 5))
        assertTrue(key.startsWith("2026/01/"), "实际：$key")
    }
}
