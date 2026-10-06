package com.abyssvstar.blog.shared.util

import org.commonmark.parser.Parser
import org.commonmark.renderer.html.HtmlRenderer
import org.springframework.stereotype.Component

/**
 * Markdown → HTML。
 *
 * 后台预览和正式发布必须用同一个实例：两边渲染结果不一致的话，预览就是在骗人。
 *
 * 允许 Markdown 里的原始 HTML 原样通过。这是刻意的 —— 只有作者能写入正文，
 * 信任级别和站点模板本身一样。等公开投稿之类的入口出现时，这里必须先加消毒。
 */
@Component
class MarkdownRenderer {

    private val parser: Parser = Parser.builder().build()
    private val renderer: HtmlRenderer = HtmlRenderer.builder().build()

    fun render(markdown: String): String = renderer.render(parser.parse(markdown))
}
