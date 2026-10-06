package com.abyssvstar.blog.shared.util

import net.sourceforge.pinyin4j.PinyinHelper
import net.sourceforge.pinyin4j.format.HanyuPinyinCaseType
import net.sourceforge.pinyin4j.format.HanyuPinyinOutputFormat
import net.sourceforge.pinyin4j.format.HanyuPinyinToneType
import net.sourceforge.pinyin4j.format.HanyuPinyinVCharType

/**
 * slug 生成。
 *
 * 中文标题先转成不带声调的拼音再规范化：「你好世界」→ `ni-hao-shi-jie`，
 * 「Kotlin 协程」→ `kotlin-xie-cheng`。
 *
 * 一个字符都转不出来时（纯符号、emoji）退回内容哈希，保证同一标题稳定得到同一 slug，
 * 不会退化成一堆重复的 `post-1`。
 */
object Slugify {

    private val NON_ALNUM = Regex("[^a-z0-9]+")
    private val EDGE_DASH = Regex("^-+|-+$")

    /** 只做 ASCII 规范化。中文会被整段剥掉，所以别拿它直接处理中文标题。 */
    fun ascii(input: String): String =
        input.lowercase()
            .replace(NON_ALNUM, "-")
            .replace(EDGE_DASH, "")
            .take(MAX_LENGTH)
            .replace(EDGE_DASH, "")

    fun from(title: String): String =
        ascii(romanize(title)).ifBlank {
            FALLBACK_PREFIX + Hashing.sha256Hex(title.trim()).take(FALLBACK_HASH_LEN)
        }

    /** 汉字转拼音，其它字符原样保留。多音字取 pinyin4j 给出的第一个读音。 */
    private fun romanize(input: String): String {
        val format = HanyuPinyinOutputFormat().apply {
            caseType = HanyuPinyinCaseType.LOWERCASE
            toneType = HanyuPinyinToneType.WITHOUT_TONE
            // ü 写成 v，否则它不是 ASCII，会被后面的规范化吃掉
            vCharType = HanyuPinyinVCharType.WITH_V
        }
        return buildString(input.length) {
            input.forEach { c ->
                val pinyin = runCatching { PinyinHelper.toHanyuPinyinStringArray(c, format) }.getOrNull()
                val first = pinyin?.firstOrNull()
                if (first.isNullOrEmpty()) {
                    append(c)
                } else {
                    append(first)
                    append(' ')
                }
            }
        }
    }

    private const val MAX_LENGTH = 80
    private const val FALLBACK_PREFIX = "p-"
    private const val FALLBACK_HASH_LEN = 8
}
