package com.abyssvstar.blog.shared.util

import org.commonmark.Extension
import org.commonmark.ext.autolink.AutolinkExtension
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension
import org.commonmark.ext.gfm.tables.TablesExtension
import org.commonmark.ext.task.list.items.TaskListItemsExtension
import org.commonmark.node.Node
import org.commonmark.parser.Parser
import org.commonmark.renderer.html.HtmlRenderer
import org.commonmark.renderer.text.TextContentRenderer
import org.springframework.stereotype.Component

/**
 * Markdown → HTML。
 *
 * 后台预览和正式发布必须用同一个实例：两边渲染结果不一致的话，预览就是在骗人。
 *
 * 代码高亮**不在这里做**。围栏代码块输出的就是 `class="language-xxx"`，
 * 由前端用 highlight.js 之类上色 —— 静态站没必要把高亮结果在服务端算进 HTML。
 *
 * 允许正文里的原始 HTML 原样通过。这是刻意的 —— 只有作者能写入正文，
 * 信任级别和站点模板本身一样。等公开投稿之类的入口出现时，这里必须先加消毒。
 */
@Component
class MarkdownRenderer {

    private val extensions: List<Extension> = listOf(
        TablesExtension.create(),
        StrikethroughExtension.create(),
        AutolinkExtension.create(),
        TaskListItemsExtension.create(),
    )

    private val parser: Parser = Parser.builder().extensions(extensions).build()
    private val renderer: HtmlRenderer = HtmlRenderer.builder().extensions(extensions).build()
    private val textRenderer: TextContentRenderer = TextContentRenderer.builder().extensions(extensions).build()

    fun render(markdown: String): String = renderer.render(parser.parse(markdown))

    /** 搜索切块与发布渲染共用同一套扩展，避免表格、任务列表在两边结构不同。 */
    fun parse(markdown: String): Node = parser.parse(markdown)

    fun plainText(node: Node): String = textRenderer.render(node).trim()
}
