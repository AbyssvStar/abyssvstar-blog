package com.abyssvstar.blog.post.service

import com.abyssvstar.blog.post.domain.Post
import com.abyssvstar.blog.shared.util.Hashing

/**
 * 工作副本的内容指纹，发布时写进 `post_publications.source_hash`。
 *
 * 用它判定「有未发布的修改」：现算一次哈希，和快照里存的那个比。
 * 只要参与快照的字段有一个变了，指纹就变 —— 所以字段列表必须和发布时写入的保持一致。
 */
object PostSourceHash {

    fun of(post: Post, tagNames: List<String>): String = Hashing.sha256Hex(
        listOf(
            post.title,
            post.summary.orEmpty(),
            post.contentMd,
            post.slug,
            tagNames.sorted().joinToString(","),
            post.coverAssetId?.toString().orEmpty(),
        ).joinToString(SEPARATOR),
    )

    /** 用不可见字符拼接，免得字段内容把它凑出来造成假的相同哈希 */
    private const val SEPARATOR = "\u0000"
}
