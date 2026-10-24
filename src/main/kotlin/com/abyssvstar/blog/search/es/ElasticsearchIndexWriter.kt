package com.abyssvstar.blog.search.es

import com.abyssvstar.blog.note.domain.Note
import com.abyssvstar.blog.post.domain.PostPublication
import com.abyssvstar.blog.search.MarkdownChunkSplitter
import com.abyssvstar.blog.shared.util.Hashing
import com.abyssvstar.blog.search.SearchProperties
import com.abyssvstar.blog.search.SearchTextExtractor
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component

/** 只写发布快照。文章级文档和段落级文档由同一次同步一起更新。 */
@Component
class ElasticsearchIndexWriter(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    private val indices: SearchIndexManager,
    private val splitter: MarkdownChunkSplitter,
    private val text: SearchTextExtractor,
    private val objectMapper: ObjectMapper,
) {

    fun index(publication: PostPublication) {
        val postId = requireNotNull(publication.postId)
        indices.ensureIndices()

        val article = mapOf(
            "docType" to "POST",
            "contentId" to postId,
            "slug" to publication.slug,
            "title" to publication.title,
            "summary" to publication.summary,
            "body" to text.bodyText(publication),
            "tags" to tags(publication.tags),
            "publishedAt" to publication.publishedAt?.toString(),
            "viewCount" to 0,
            "contentHash" to publication.sourceHash,
        )
        client.request(
            "PUT",
            "/${props.articleIndex}/_doc/$postId?refresh=wait_for",
            client.json(article),
            timeout = props.indexTimeout,
        )

        // 先删旧段再插新段；失败时状态会留在 FAILED，由补偿任务整篇重做。
        deleteChunks(postId)
        val chunks = splitter.split(publication.title, publication.contentMd, publication.html)
        if (chunks.isNotEmpty()) {
            val bulk = buildString {
                chunks.forEach { chunk ->
                    append(client.json(mapOf("index" to mapOf("_index" to props.chunkIndex, "_id" to "$postId:${chunk.chunkIndex}"))))
                    append('\n')
                    append(
                        client.json(
                            mapOf(
                                "postId" to postId,
                                "slug" to publication.slug,
                                "chunkIndex" to chunk.chunkIndex,
                                "headingPath" to chunk.headingPath,
                                "text" to chunk.text,
                                "anchor" to chunk.anchor,
                                "contentHash" to publication.sourceHash,
                            ),
                        ),
                    )
                    append('\n')
                }
            }
            val response = client.request("POST", "/_bulk?refresh=wait_for", bulk, BULK, timeout = props.indexTimeout)
                ?: throw IllegalStateException("ES bulk 没有返回响应")
            if (objectMapper.readTree(response).path("errors").asBoolean(false)) {
                throw IllegalStateException("ES bulk 写入存在失败项：${response.take(500)}")
            }
        }
    }

    fun indexNote(note: Note) {
        indices.ensureIndices()
        val id = requireNotNull(note.id)
        val content = note.content.trim()
        val document = mapOf(
            "docType" to "NOTE",
            "contentId" to id,
            "slug" to "note-$id",
            "title" to content.lineSequence().firstOrNull()?.take(80).orEmpty().ifBlank { "短动态 #$id" },
            "summary" to "",
            "body" to content,
            "tags" to emptyList<String>(),
            "publishedAt" to note.publishedAt.toString(),
            "viewCount" to note.viewCount,
            "contentHash" to Hashing.sha256Hex(content),
        )
        client.request(
            "PUT",
            "/${props.articleIndex}/_doc/note:$id?refresh=wait_for",
            client.json(document),
            timeout = props.indexTimeout,
        )
    }

    fun deleteNote(noteId: Long) {
        indices.ensureIndices()
        client.request(
            "DELETE",
            "/${props.articleIndex}/_doc/note:$noteId?refresh=wait_for",
            allowNotFound = true,
            timeout = props.indexTimeout,
        )
    }

    fun delete(postId: Long) {
        indices.ensureIndices()
        deleteChunks(postId)
        client.request(
            "DELETE",
            "/${props.articleIndex}/_doc/$postId?refresh=wait_for",
            allowNotFound = true,
            timeout = props.indexTimeout,
        )
    }

    private fun deleteChunks(postId: Long) {
        val body = client.json(mapOf("query" to mapOf("term" to mapOf("postId" to postId))))
        client.request(
            "POST",
            "/${props.chunkIndex}/_delete_by_query?conflicts=proceed&refresh=true",
            body,
            timeout = props.indexTimeout,
        )
    }

    private fun tags(json: String): List<String> =
        runCatching { objectMapper.readValue(json, Array<String>::class.java).toList() }
            .getOrDefault(emptyList())

    private companion object {
        const val BULK = "application/x-ndjson"
    }
}