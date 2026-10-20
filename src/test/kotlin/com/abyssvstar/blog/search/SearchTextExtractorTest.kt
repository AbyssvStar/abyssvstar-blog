package com.abyssvstar.blog.search

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SearchTextExtractorTest {

    private val extractor = SearchTextExtractor()

    @Test
    fun `高亮白名单只保留 mark`() {
        val cleaned = extractor.cleanHighlight("<mark>Redis</mark><script>alert(1)</script><b>缓存</b>")
        assertTrue(cleaned!!.contains("<mark>Redis</mark>"))
        assertFalse(cleaned.contains("<script"))
        assertFalse(cleaned.contains("<b>"))
    }

    @Test
    fun `相邻高亮片段合并`() {
        val cleaned = extractor.cleanHighlight("<mark>图</mark><mark>床</mark>")
        assertTrue(cleaned!!.contains("<mark>图床</mark>"))
    }

    @Test
    fun `降级摘要转义正文并标记查询词`() {
        val html = extractor.excerptHtml("缓存穿透要用 <布隆过滤器> 挡住", "布隆过滤器")
        assertTrue(html.contains("<mark>布隆过滤器</mark>"))
        assertTrue(html.contains("&lt;"))
        assertFalse(html.contains("<布隆过滤器>"))
    }
}