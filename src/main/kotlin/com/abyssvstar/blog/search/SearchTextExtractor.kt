package com.abyssvstar.blog.search

import com.abyssvstar.blog.post.domain.PostPublication
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.safety.Safelist
import org.springframework.stereotype.Component
import java.util.regex.Pattern

/** 搜索文本的唯一转换入口，保证 ES 正文与 PG 降级摘要使用同一套纯文本口径。 */
@Component
class SearchTextExtractor {

    fun bodyText(publication: PostPublication): String =
        Jsoup.parseBodyFragment(publication.html).body().text()

    fun sourceText(publication: PostPublication): String =
        publication.contentMd?.takeIf { it.isNotBlank() } ?: bodyText(publication)

    fun cleanHighlight(highlight: String?): String? =
        highlight?.takeIf { it.isNotBlank() }?.let {
            Jsoup.clean(it.replace(ADJACENT_MARKS, ""), "", MARK_SAFELIST, OUTPUT_SETTINGS)
        }

    fun excerptHtml(text: String, query: String, maxChars: Int = 180): String {
        val compact = text.replace(WHITESPACE, " ").trim()
        if (compact.isEmpty()) return ""
        val match = compact.indexOf(query, ignoreCase = true)
        val start = if (match < 0) 0 else maxOf(0, match - maxChars / 3)
        val end = minOf(compact.length, start + maxChars)
        val excerpt = compact.substring(start, end)
        val marked = markTerms(excerpt, query)
        return when {
            start > 0 && end < compact.length -> "…$marked…"
            start > 0 -> "…$marked"
            end < compact.length -> "$marked…"
            else -> marked
        }
    }

    fun plainTitle(text: String): String = text.replace(WHITESPACE, " ").trim()

    private fun markTerms(text: String, query: String): String {
        if (query.isBlank()) return escapeHtml(text)
        val matcher = Pattern.compile(Pattern.quote(query), Pattern.CASE_INSENSITIVE).matcher(text)
        val out = StringBuilder(text.length + 32)
        var cursor = 0
        while (matcher.find()) {
            out.append(escapeHtml(text.substring(cursor, matcher.start())))
            out.append("<mark>")
            out.append(escapeHtml(matcher.group()))
            out.append("</mark>")
            cursor = matcher.end()
        }
        out.append(escapeHtml(text.substring(cursor)))
        return out.toString()
    }

    private fun escapeHtml(value: String): String = buildString(value.length) {
        value.forEach { c ->
            when (c) {
                '&' -> append("&amp;")
                '<' -> append("&lt;")
                '>' -> append("&gt;")
                '"' -> append("&quot;")
                '\'' -> append("&#39;")
                else -> append(c)
            }
        }
    }

    private companion object {
        val WHITESPACE = Regex("\\s+")
        val ADJACENT_MARKS = Regex("</mark>\\s*<mark>")
        val OUTPUT_SETTINGS: Document.OutputSettings = Document.OutputSettings().prettyPrint(false)
        val MARK_SAFELIST: Safelist = Safelist.none().addTags("mark")
    }
}