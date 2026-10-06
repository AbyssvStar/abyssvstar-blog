package com.abyssvstar.blog.shared.util

import kotlin.math.ceil

/**
 * 字数与阅读时长。
 *
 * 中文不能按空格分词，所以 CJK 字符按 1 个字计，拉丁文按单词计 —— 中文博客的通行做法。
 */
object TextMetrics {

    private val CJK = Regex("[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af]")
    private val LATIN_WORD = Regex("[A-Za-z0-9][A-Za-z0-9_'\\-]*")

    /** 粗略剥掉 Markdown 标记，免得把 `#` `*` 和链接地址也算进字数 */
    private val MARKDOWN_NOISE = Regex(
        "(?m)^\\s{0,3}(#{1,6}\\s*|>\\s*|[-*+]\\s+|\\d+\\.\\s+)|`{1,3}|\\*{1,2}|_{1,2}|\\[|\\]\\([^)]*\\)",
    )

    fun wordCount(markdown: String): Int {
        val plain = MARKDOWN_NOISE.replace(markdown, " ")
        return CJK.findAll(plain).count() + LATIN_WORD.findAll(plain).count()
    }

    /** 中文阅读速度按 ~400 字/分钟估算，至少 1 分钟 */
    fun readingMinutes(wordCount: Int): Int = maxOf(1, ceil(wordCount / WORDS_PER_MINUTE).toInt())

    private const val WORDS_PER_MINUTE = 400.0
}
