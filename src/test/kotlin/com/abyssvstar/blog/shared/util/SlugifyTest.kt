package com.abyssvstar.blog.shared.util

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SlugifyTest {

    @Test
    fun `ASCII 标题转成小写短横线 slug`() {
        assertEquals("hello-world", Slugify.ascii("Hello World!"))
    }

    @Test
    fun `连续的非字母数字折叠成一个短横线`() {
        assertEquals("a-b", Slugify.ascii("a --- b"))
    }

    @Test
    fun `首尾短横线被去掉`() {
        assertEquals("abc", Slugify.ascii("---abc---"))
    }

    @Test
    fun `中文标题转成拼音`() {
        assertEquals("ni-hao-shi-jie", Slugify.from("你好世界"))
    }

    @Test
    fun `转不出拼音时走哈希兜底且结果稳定`() {
        val slug = Slugify.from("!!!")
        assertTrue(slug.startsWith("p-"), "纯符号标题应走 p- 前缀的哈希兜底，实际是 $slug")
        assertEquals(slug, Slugify.from("!!!"), "同一标题必须得到同一 slug")
    }

    @Test
    fun `不同中文标题得到不同 slug`() {
        assertNotEquals(Slugify.from("你好"), Slugify.from("世界"))
    }

    @Test
    fun `中英混排时 ASCII 原样保留、中文转拼音`() {
        assertEquals("kotlin", Slugify.ascii("Kotlin 协程"))
        assertEquals("kotlin-xie-cheng", Slugify.from("Kotlin 协程"))
    }

    @Test
    fun `超长标题被截断到上限以内`() {
        assertTrue(Slugify.ascii("a".repeat(300)).length <= 80)
    }
}
