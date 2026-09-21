package com.abyssvstar.blog.shared.util

/**
 * slug 生成。设计依据 docs/02-data-model.md §2（slug 列）。
 *
 * 目标是「中文标题自动转拼音 + 可手动覆盖」，但**拼音转换需要额外依赖**
 * （pinyin4j / TinyPinyin），留到 G2 接入 —— [from] 是唯一需要改的地方。
 *
 * 在那之前用内容哈希兜底，保证「同一标题 → 同一 slug」，且不会退化成一堆重复的 post-1。
 */
object Slugify {

    private val NON_ALNUM = Regex("[^a-z0-9]+")
    private val EDGE_DASH = Regex("^-+|-+$")

    /** 只处理 ASCII。含中文时返回空串，由 [from] 走兜底分支。 */
    fun ascii(input: String): String =
        input.lowercase()
            .replace(NON_ALNUM, "-")
            .replace(EDGE_DASH, "")
            .take(MAX_LENGTH)
            .replace(EDGE_DASH, "")

    fun from(title: String): String {
        val ascii = ascii(title)
        return ascii.ifBlank { FALLBACK_PREFIX + Hashing.sha256Hex(title.trim()).take(FALLBACK_HASH_LEN) }
    }

    private const val MAX_LENGTH = 80
    private const val FALLBACK_PREFIX = "p-"
    private const val FALLBACK_HASH_LEN = 8
}
