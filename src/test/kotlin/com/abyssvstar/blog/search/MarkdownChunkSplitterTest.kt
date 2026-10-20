package com.abyssvstar.blog.search

import com.abyssvstar.blog.shared.util.MarkdownRenderer
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class MarkdownChunkSplitterTest {

    private val markdown = MarkdownRenderer()
    private val extractor = SearchTextExtractor()
    private val splitter = MarkdownChunkSplitter(markdown, extractor)

    @Test
    fun `按标题切块并保留标题路径和锚点`() {
        val chunks = splitter.split(
            "文章标题",
            """
            开头段落。

            ## Redis 缓存

            缓存穿透的解决办法。

            ### 布隆过滤器

            先拦截不存在的 key。
            """.trimIndent(),
            "",
        )

        assertEquals(3, chunks.size)
        assertEquals("文章标题 > Redis 缓存", chunks[1].headingPath)
        assertEquals("redis-缓存", chunks[1].anchor)
        assertEquals("文章标题 > Redis 缓存 > 布隆过滤器", chunks[2].headingPath)
        assertTrue(chunks[1].text.contains("缓存穿透"))
    }

    @Test
    fun `代码块不按字符上限从中间切碎`() {
        val code = "val x = 1\n".repeat(250)
        val chunks = splitter.split("标题", "## 代码\n\n```kotlin\n$code```", "")
        assertTrue(chunks.any { it.text.contains("val x = 1") && it.text.length > 1_800 })
    }

    @Test
    fun `V11 前没有 Markdown 的快照从 HTML 兜底`() {
        val chunks = splitter.split("旧文章", null, "<h2>缓存</h2><p>Redis 缓存穿透。</p>")
        assertEquals(1, chunks.size)
        assertTrue(chunks.single().text.contains("Redis 缓存穿透"))
    }
}