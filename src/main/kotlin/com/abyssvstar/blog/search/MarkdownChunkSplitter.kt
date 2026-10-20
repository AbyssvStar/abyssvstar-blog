package com.abyssvstar.blog.search

import com.abyssvstar.blog.shared.util.MarkdownRenderer
import org.commonmark.node.FencedCodeBlock
import org.commonmark.node.Heading
import org.commonmark.node.IndentedCodeBlock
import org.commonmark.node.Node
import org.springframework.stereotype.Component

/**
 * 把发布快照切成可引用的段落。
 *
 * 以标题段落为第一层边界，再按保守字符上限切长段落；代码块始终作为一个整体保留。
 * 这里刻意不使用工作副本，旧快照没有 Markdown 时先从 HTML 提取文本再按段落兜底。
 */
@Component
class MarkdownChunkSplitter(
    private val markdown: MarkdownRenderer,
    private val text: SearchTextExtractor,
) {

    fun split(title: String, publicationContentMd: String?, html: String): List<SearchChunk> {
        val source = publicationContentMd?.takeIf { it.isNotBlank() }
        if (source == null) return fallback(title, html)

        val document = markdown.parse(source)
        val headingStack = mutableListOf<HeadingInfo>()
        val usedAnchors = mutableMapOf<String, Int>()
        val sections = mutableListOf<Section>()
        var current = Section(headingPath = title, anchor = null)
        val headingParser = HeadingCounter(usedAnchors)

        document.children().forEach { node ->
            if (node is Heading) {
                current.flushInto(sections)
                while (headingStack.isNotEmpty() && headingStack.last().level >= node.level) headingStack.removeLast()
                val headingText = markdown.plainText(node).replace(WHITESPACE, " ").trim()
                if (headingText.isNotEmpty()) {
                    val anchor = headingParser.next(headingText)
                    headingStack += HeadingInfo(node.level, headingText, anchor)
                    current = Section(
                        headingPath = (listOf(title) + headingStack.map { it.text }).joinToString(" > "),
                        anchor = anchor,
                    )
                    current.units += Unit("$headingText\n", splittable = true)
                }
            } else {
                val rendered = markdown.plainText(node)
                if (rendered.isNotBlank()) {
                    current.units += Unit(rendered, splittable = node !is FencedCodeBlock && node !is IndentedCodeBlock)
                }
            }
        }
        current.flushInto(sections)

        val chunks = mutableListOf<SearchChunk>()
        sections.forEach { section ->
            val parts = pack(section)
            parts.forEach { body ->
                val chunkText = (section.headingPath + "\n\n" + body).trim()
                if (chunkText.length < MIN_CHARS && chunks.isNotEmpty() && chunks.last().anchor == section.anchor) {
                    val previous = chunks.removeLast()
                    chunks += previous.copy(text = previous.text + "\n\n" + body)
                } else {
                    chunks += SearchChunk(
                        chunkIndex = chunks.size,
                        headingPath = section.headingPath,
                        text = chunkText,
                        anchor = section.anchor,
                    )
                }
            }
        }
        return chunks.ifEmpty { fallback(title, html) }
    }

    private fun fallback(title: String, html: String): List<SearchChunk> {
        val body = text.bodyText(com.abyssvstar.blog.post.domain.PostPublication(html = html)).trim()
        if (body.isEmpty()) return emptyList()
        return body.chunked(FALLBACK_CHARS).mapIndexed { index, part ->
            SearchChunk(
                chunkIndex = index,
                headingPath = title,
                text = title + "\n\n" + part,
                anchor = null,
            )
        }
    }

    private fun pack(section: Section): List<String> {
        if (section.units.isEmpty()) return emptyList()
        val out = mutableListOf<String>()
        val current = StringBuilder()
        fun flush() {
            if (current.isNotBlank()) {
                out += current.toString().trim()
                current.clear()
            }
        }

        section.units.forEach { unit ->
            val piece = unit.text.trim()
            if (piece.isEmpty()) return@forEach
            if (piece.length > MAX_CHARS) {
                flush()
                if (unit.splittable) {
                    piece.chunked(MAX_CHARS).forEach { out += it.trim() }
                } else {
                    out += piece
                }
                return@forEach
            }
            if (current.isNotEmpty() && current.length + piece.length + 2 > MAX_CHARS) flush()
            if (current.isNotEmpty()) current.append("\n\n")
            current.append(piece)
        }
        flush()
        return out
    }

    private data class Unit(val text: String, val splittable: Boolean)
    private data class HeadingInfo(val level: Int, val text: String, val anchor: String)

    private class Section(val headingPath: String, val anchor: String?) {
        val units = mutableListOf<Unit>()
        fun flushInto(target: MutableList<Section>) {
            if (units.any { it.text.isNotBlank() }) target += this
        }
    }

    private class HeadingCounter(private val used: MutableMap<String, Int>) {
        fun next(text: String): String {
            val base = slug(text).ifBlank { "section" }
            val seen = used.getOrDefault(base, 0)
            used[base] = seen + 1
            return if (seen == 0) base else "$base-$seen"
        }

        private fun slug(value: String): String = value
            .lowercase()
            .replace(NON_ANCHOR, "")
            .trim()
            .replace(WHITESPACE, "-")
            .take(80)
    }

    private companion object {
        const val MAX_CHARS = 1_800
        const val MIN_CHARS = 50
        const val FALLBACK_CHARS = 1_800
        val WHITESPACE = Regex("\\s+")
        val NON_ANCHOR = Regex("[^\\p{L}\\p{N}\\s-]")
    }
}

private fun Node.children(): Sequence<Node> = generateSequence(firstChild) { it.next }.map { it }