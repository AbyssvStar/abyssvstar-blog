package com.abyssvstar.blog.shared.util

/**
 * slug 生成。
 *
 * 理想效果是中文标题自动转拼音，但那需要额外依赖（pinyin4j / TinyPinyin），
 * 暂时用内容哈希兜底：同一标题稳定得到同一 slug，也不会退化成一堆重复的 `post-1`。
 */
object Slugify {

    private val NON_ALNUM = Regex("[^a-z0-9]+")
    private val EDGE_DASH = Regex("^-+|-+$")

    /** 只处理 ASCII，含中文时返回空串，由 [from] 走兜底分支。 */
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
